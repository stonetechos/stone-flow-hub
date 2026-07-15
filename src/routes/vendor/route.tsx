/** Vendor portal gate. Redirects staff/unauthenticated users away. */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VendorShell } from "@/components/vendor-portal/VendorShell";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getVendorContext } from "@/lib/vendor-portal/session";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/vendor")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { flow: "signin" } });
  },
  component: VendorLayout,
});

function VendorLayout() {
  const q = useQuery({
    queryKey: ["vendor", "context"],
    queryFn: getVendorContext,
    staleTime: 60_000,
  });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error)
    return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h2 className="font-display text-lg font-semibold">Vendor access not enabled</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is not linked to a vendor company. Please contact Stone Tech to request
          access.
        </p>
      </div>
    );
  }
  return (
    <VendorShell companyName={q.data.vendor.company_name}>
      <Outlet />
    </VendorShell>
  );
}
