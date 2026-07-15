import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AppError } from "@/lib/errors";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid refetching every navigation for lists/details. Mutations
        // explicitly invalidate their query keys, so 30s is a safe default.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // Explicit (was implicit default): refetch active queries when the
        // browser regains connectivity after an interruption, per Phase
        // G.8.9 Task A3/A5 (reconnect-after-network-interruption). Safe
        // with the current data-preserving pattern — a background refetch
        // keeps the previous `data` until the new response lands, it never
        // clears it first, so this cannot itself blank out rendered state.
        refetchOnReconnect: true,
        // Phase G.8.9 Task A3/A6: distinguish transient failures (worth one
        // retry) from deterministic ones (retrying just delays the same
        // outcome). Every backend/database failure in this app is thrown as
        // an `AppError` (see lib/errors.ts's `mapDbError` call sites) —
        // validation errors, RLS/permission denials, constraint violations.
        // None of those change on retry. A raw, non-AppError throw (network
        // failure, fetch aborted, DNS hiccup, Supabase client transport
        // error) is exactly the transient case retrying helps with.
        retry: (failureCount, error) => {
          if (error instanceof AppError) return false;
          return failureCount < 1;
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
