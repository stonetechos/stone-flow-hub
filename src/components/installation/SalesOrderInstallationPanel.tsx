/** Panel on Sales Order detail: shows supply_scope toggle and linked installation. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Wrench, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { listInstallationsForSalesOrder, setSalesOrderSupplyScope } from "@/lib/installation/orders";
import { qk } from "@/lib/query-keys";
import { invalidateInstallation } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";

export function SalesOrderInstallationPanel({ salesOrderId }: { salesOrderId: string }) {
  const qc = useQueryClient();

  const scopeQ = useQuery({
    queryKey: ["sales_order", salesOrderId, "supply_scope"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales_orders")
        .select("supply_scope" as never)
        .eq("id", salesOrderId)
        .maybeSingle();
      return (data as { supply_scope?: string } | null)?.supply_scope ?? "material_only";
    },
  });

  const instQ = useQuery({
    queryKey: qk.installations.bySalesOrder(salesOrderId),
    queryFn: () => listInstallationsForSalesOrder(salesOrderId),
  });

  const setScope = useMutation({
    mutationFn: (v: "material_only" | "supply_and_installation") =>
      setSalesOrderSupplyScope(salesOrderId, v),
    onSuccess: () => {
      toast.success("Supply scope updated");
      qc.invalidateQueries({ queryKey: ["sales_order", salesOrderId, "supply_scope"] });
      invalidateInstallation(qc, undefined, salesOrderId);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const scope = scopeQ.data ?? "material_only";
  const inst = instQ.data?.[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wrench className="h-4 w-4 text-primary" /> Installation
        </CardTitle>
        {setScope.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Supply scope</div>
          <Select
            value={scope}
            onValueChange={(v) => setScope.mutate(v as "material_only" | "supply_and_installation")}
          >
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="material_only">Material supply only</SelectItem>
              <SelectItem value="supply_and_installation">Supply + Installation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {scope === "supply_and_installation" && inst && (
          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Installation order</div>
                <div className="font-medium">{inst.installation_no}</div>
              </div>
              <Link to="/installations/$id" params={{ id: inst.id }}>
                <Button size="sm" variant="outline">Open</Button>
              </Link>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Status {inst.status} · Progress {Number(inst.progress_pct).toFixed(0)}%
            </div>
          </div>
        )}
        {scope === "supply_and_installation" && !inst && (
          <p className="text-xs text-muted-foreground">
            Installation record will appear here once auto-generated (save the sales order to trigger).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
