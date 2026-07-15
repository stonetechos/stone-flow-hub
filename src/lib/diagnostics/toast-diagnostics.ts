type DbErrorShape = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type RecordedDbError = {
  error: DbErrorShape;
  stack?: string;
  context?: BackendFailureContext;
  at: number;
};

type ToastMethod = (...args: unknown[]) => unknown;
type BackendFailureContext = {
  method: string;
  url: string;
  table: string | null;
  rpcOrFunctionName: string | null;
};

const RECENT_DB_ERROR_TTL_MS = 5_000;
const PATCHED_FLAG = "__stoneTechToastDiagnosticsInstalled";
const FETCH_PATCHED_FLAG = "__stoneTechFetchDiagnosticsInstalled";
let recentDbError: RecordedDbError | null = null;

function getPage() {
  if (typeof window === "undefined") return "server";
  return `${window.location.pathname}${window.location.search}`;
}

function getStack() {
  return new Error("Toast diagnostics stack").stack ?? "";
}

function inferModule(stack: string) {
  const match = stack.match(/src\/(?:routes|components|lib|hooks)\/[^\n:)]+/);
  return match?.[0] ?? null;
}

function inferMutationOrQuery(stack: string) {
  const names = [...stack.matchAll(/\n\s*at\s+([A-Za-z0-9_$.[\]<>]+)\s/g)].map((m) => m[1]);
  return (
    names.find((name) =>
      /create|update|delete|insert|save|submit|convert|reassign|list|get|fetch|mutation|query/i.test(
        name,
      ),
    ) ?? null
  );
}

function inferRpcFunctionName(message: string, stack: string) {
  const permissionMatch = message.match(/permission denied for function\s+([a-zA-Z0-9_]+)/i);
  if (permissionMatch?.[1]) return permissionMatch[1];
  const rpcMatch = stack.match(/\.rpc\(["']([a-zA-Z0-9_]+)["']/);
  return rpcMatch?.[1] ?? null;
}

function inferTable(stack: string) {
  const fromMatch = stack.match(/\.from\(["']([a-zA-Z0-9_]+)["']/);
  return fromMatch?.[1] ?? null;
}

function inferBackendContext(input: RequestInfo | URL, init?: RequestInit): BackendFailureContext {
  const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
  const url = request?.url ?? String(input);
  const method = init?.method ?? request?.method ?? "GET";
  let table: string | null = null;
  let rpcOrFunctionName: string | null = null;

  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
    const restMatch = parsed.pathname.match(/\/rest\/v1\/([^/?]+)/);
    const rpcMatch = parsed.pathname.match(/\/rest\/v1\/rpc\/([^/?]+)/);
    table = restMatch?.[1] && restMatch[1] !== "rpc" ? decodeURIComponent(restMatch[1]) : null;
    rpcOrFunctionName = rpcMatch?.[1] ? decodeURIComponent(rpcMatch[1]) : null;
  } catch {
    // Keep best-effort diagnostics non-invasive.
  }

  return { method, url, table, rpcOrFunctionName };
}

function inferConstraint(details = "", message = "") {
  const combined = `${details}\n${message}`;
  const match = combined.match(/constraint\s+["']?([a-zA-Z0-9_]+)["']?/i);
  return match?.[1] ?? null;
}

function inferTrigger(message = "") {
  const match = message.match(/trigger\s+["']?([a-zA-Z0-9_]+)["']?/i);
  return match?.[1] ?? null;
}

function consumeRecentDbError(): RecordedDbError | null {
  if (!recentDbError) return null;
  if (Date.now() - recentDbError.at > RECENT_DB_ERROR_TTL_MS) {
    recentDbError = null;
    return null;
  }
  return recentDbError;
}

export function recordDbErrorForDiagnostics(error: DbErrorShape, context?: BackendFailureContext) {
  recentDbError = {
    error,
    stack: getStack(),
    context,
    at: Date.now(),
  };
}

function installFetchDiagnostics() {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { [FETCH_PATCHED_FLAG]?: boolean };
  if (w[FETCH_PATCHED_FLAG]) return;
  w[FETCH_PATCHED_FLAG] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const context = inferBackendContext(input, init);
    const response = await originalFetch(input, init);

    if (!response.ok && context.url.includes("/rest/v1/")) {
      const clone = response.clone();
      let body: DbErrorShape | null = null;
      try {
        body = (await clone.json()) as DbErrorShape;
      } catch {
        body = null;
      }

      if (body?.code || body?.message) {
        recordDbErrorForDiagnostics(body, context);
        console.info("[backend diagnostics]", {
          module: null,
          page: getPage(),
          mutationOrQueryName: null,
          rpcOrFunctionName: context.rpcOrFunctionName ?? inferRpcFunctionName(body.message ?? "", ""),
          table: context.table,
          sqlstate: body.code ?? null,
          postgresMessage: body.message ?? null,
          constraintName: inferConstraint(body.details ?? "", body.message ?? ""),
          triggerName: inferTrigger(body.message ?? ""),
          functionName: inferRpcFunctionName(body.message ?? "", ""),
          request: {
            method: context.method,
            url: context.url,
            status: response.status,
          },
          stackTrace: getStack(),
        });
      }
    }

    return response;
  }) as typeof window.fetch;
}

function isDiagnosticsAllowed(): boolean {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      if (import.meta.env.DEV) return true;
      if (import.meta.env.MODE && import.meta.env.MODE !== "production") return true;
    }
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    const host = window.location?.hostname ?? "";
    if (/^(localhost|127\.0\.0\.1)$/.test(host)) return true;
  }
  return false;
}

export async function installToastDiagnostics() {
  if (typeof window === "undefined") return;
  // Never patch fetch/toast to log raw Postgres error bodies on the
  // published site — this would leak table / RPC / constraint names.
  if (!isDiagnosticsAllowed()) return;
  installFetchDiagnostics();

  const w = window as typeof window & { [PATCHED_FLAG]?: boolean };
  if (w[PATCHED_FLAG]) return;
  w[PATCHED_FLAG] = true;

  const { toast } = await import("sonner");
  const methods = ["message", "success", "info", "warning", "error", "loading"] as const;

  for (const method of methods) {
    const original = toast[method] as ToastMethod | undefined;
    if (typeof original !== "function") continue;

    toast[method] = ((...args: unknown[]) => {
      const stack = getStack();
      const db = consumeRecentDbError();
      const dbMessage = db?.error.message ?? "";
      const dbDetails = db?.error.details ?? "";
      const message = typeof args[0] === "string" ? args[0] : String(args[0] ?? "");

      console.info("[toast diagnostics]", {
        toastType: method,
        toastMessage: message,
        module: inferModule(stack),
        page: getPage(),
        mutationOrQueryName: inferMutationOrQuery(stack),
        rpcOrFunctionName:
          db?.context?.rpcOrFunctionName ?? inferRpcFunctionName(dbMessage || message, db?.stack || stack),
        table: db?.context?.table ?? inferTable(db?.stack || stack),
        sqlstate: db?.error.code ?? null,
        postgresMessage: db?.error.message ?? null,
        constraintName: inferConstraint(dbDetails, dbMessage),
        triggerName: inferTrigger(dbMessage),
        functionName:
          db?.context?.rpcOrFunctionName ?? inferRpcFunctionName(dbMessage || message, db?.stack || stack),
        request: db?.context ?? null,
        stackTrace: stack,
        dbStackTrace: db?.stack ?? null,
      });

      return original.apply(toast, args);
    }) as typeof toast[typeof method];
  }
}