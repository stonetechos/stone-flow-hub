import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DemoState = {
  isDemo: boolean;
  loading: boolean;
  setMode: (demo: boolean) => Promise<void>;
  resetDemo: () => Promise<void>;
};

const DemoCtx = createContext<DemoState | undefined>(undefined);

async function fetchMode(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_demo_mode")
    .eq("id", auth.user.id)
    .maybeSingle();
  return Boolean((data as { is_demo_mode?: boolean } | null)?.is_demo_mode);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: isDemo = false, isLoading } = useQuery({
    queryKey: ["demo-mode"],
    queryFn: fetchMode,
    staleTime: 60_000,
  });

  const setModeMut = useMutation({
    mutationFn: async (demo: boolean) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ is_demo_mode: demo })
        .eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: async (_d, demo) => {
      await qc.invalidateQueries();
      toast.success(demo ? "Switched to Demo Mode" : "Switched to Live Mode");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reset_demo_data" as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success("Demo data reset");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const value = useMemo<DemoState>(
    () => ({
      isDemo,
      loading: isLoading,
      setMode: async (d) => {
        await setModeMut.mutateAsync(d);
      },
      resetDemo: async () => {
        await resetMut.mutateAsync();
      },
    }),
    [isDemo, isLoading, setModeMut, resetMut],
  );

  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemoMode(): DemoState {
  const ctx = useContext(DemoCtx);
  if (!ctx) throw new Error("useDemoMode must be inside DemoProvider");
  return ctx;
}
