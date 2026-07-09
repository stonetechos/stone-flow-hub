type DbErrorShape = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type RecordedDbError = {
  error: DbErrorShape;
  stack?: string;
  at: number;
};

type ToastMethod = (...args: unknown[]) => unknown;

const RECENT_DB_ERROR_TTL_MS = 5_000;
const PATCHED_FLAG = "__stoneTechToastDiagnosticsInstalled";
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

export function recordDbErrorForDiagnostics(error: DbErrorShape) {
  recentDbError = {
    error,
    stack: getStack(),
    at: Date.now(),
  };
}

export async function installToastDiagnostics() {
  if (typeof window === "undefined") return;
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
        rpcOrFunctionName: inferRpcFunctionName(dbMessage || message, db?.stack || stack),
        table: inferTable(db?.stack || stack),
        sqlstate: db?.error.code ?? null,
        postgresMessage: db?.error.message ?? null,
        constraintName: inferConstraint(dbDetails, dbMessage),
        triggerName: inferTrigger(dbMessage),
        functionName: inferRpcFunctionName(dbMessage || message, db?.stack || stack),
        stackTrace: stack,
        dbStackTrace: db?.stack ?? null,
      });

      return original.apply(toast, args);
    }) as typeof toast[typeof method];
  }
}