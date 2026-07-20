import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getDispatch, listDispatchItems } from "@/lib/dispatch/api";
import { loadBranding, DEFAULT_BRANDING } from "@/lib/branding";
import { formatInr } from "@/lib/format";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { toUserMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dispatch/$id/print")({
  ssr: false,
  component: PrintDispatchPage,
});

function PrintDispatchPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: qk.dispatch.byId(id), queryFn: () => getDispatch(id) });
  const items = useQuery({
    queryKey: qk.dispatch.items(id),
    queryFn: () => listDispatchItems(id),
  });
  const brand = useQuery({ queryKey: ["branding"], queryFn: loadBranding });

  useEffect(() => {
    if (q.data && items.data && brand.data) {
      // Auto-open print dialog once everything has rendered
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [q.data, items.data, brand.data]);

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} />;
  if (!q.data) return <ErrorBlock message="Not found" />;

  const r = q.data;
  const b = brand.data ?? DEFAULT_BRANDING;
  const rows = items.data ?? [];

  return (
    <div className="mx-auto max-w-[820px] bg-white p-8 text-slate-900 print:p-0">
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>

      <div className="no-print mb-4 flex justify-end">
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      <header className="mb-6 flex items-start justify-between border-b border-slate-300 pb-4">
        <div className="flex items-center gap-3">
          {b.logo_url ? (
            <img src={b.logo_url} alt={b.company_name} className="h-14 w-auto" />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded font-bold text-white"
              style={{ background: b.primary }}
            >
              {b.company_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-lg font-bold">{b.company_name}</div>
            {b.tagline && <div className="text-xs text-slate-500">{b.tagline}</div>}
            {b.address && <div className="mt-1 text-xs text-slate-600">{b.address}</div>}
            <div className="text-xs text-slate-600">
              {[b.phone, b.email, b.website].filter(Boolean).join(" · ")}
            </div>
            {b.gstin && <div className="text-xs text-slate-600">GSTIN: {b.gstin}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">Delivery Challan</div>
          <div className="text-xl font-bold">{r.dispatch_no}</div>
          <div className="text-xs text-slate-600">Date: {r.dispatch_date}</div>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">Consignee</div>
          <div className="font-medium">{r.customer?.name ?? "—"}</div>
          {r.project?.name && (
            <div className="text-xs text-slate-600">Project: {r.project.name}</div>
          )}
          {r.site_address && (
            <div className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{r.site_address}</div>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">Reference</div>
          {r.sales_order?.so_no && (
            <div className="text-sm">Sales Order: {r.sales_order.so_no}</div>
          )}
          <div className="text-sm">Status: {r.status}</div>
        </div>
      </section>

      <section className="mb-4 grid grid-cols-3 gap-4 rounded border border-slate-300 p-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">Vehicle</div>
          <div>{r.vehicle_no ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">LR / Consignment #</div>
          <div>{r.lr_no ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Carrier</div>
          <div>{r.carrier ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Driver</div>
          <div>{r.driver_name ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Driver phone</div>
          <div>{r.driver_phone ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Carting charge</div>
          <div>{formatInr(r.carting_charge ?? 0)}</div>
        </div>
      </section>

      <table className="mb-4 w-full border border-slate-300 text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-600">
          <tr>
            <th className="border border-slate-300 px-2 py-1 text-left">#</th>
            <th className="border border-slate-300 px-2 py-1 text-left">Description of goods</th>
            <th className="border border-slate-300 px-2 py-1 text-right">Quantity</th>
            <th className="border border-slate-300 px-2 py-1 text-left">Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="border border-slate-300 px-2 py-4 text-center text-slate-500"
              >
                No line items recorded.
              </td>
            </tr>
          ) : (
            rows.map((it, idx) => (
              <tr key={it.id}>
                <td className="border border-slate-300 px-2 py-1 align-top">{idx + 1}</td>
                <td className="border border-slate-300 px-2 py-1 align-top">
                  <div className="font-medium">{it.product_name ?? it.description}</div>
                  {it.product_name && it.description !== it.product_name && (
                    <div className="text-xs text-slate-500">{it.description}</div>
                  )}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right align-top">
                  {Number(it.quantity)}
                </td>
                <td className="border border-slate-300 px-2 py-1 align-top">{it.unit ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {r.remarks && (
        <section className="mb-6 text-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Remarks</div>
          <div className="whitespace-pre-wrap">{r.remarks}</div>
        </section>
      )}

      <section className="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div>
          {b.signature_url || b.stamp_url ? (
            <div className="mb-2 flex items-end gap-2">
              {b.signature_url && (
                <img
                  src={b.signature_url}
                  alt="Signature"
                  className="h-11 max-w-[120px] object-contain"
                />
              )}
              {b.stamp_url && (
                <img src={b.stamp_url} alt="Company stamp" className="h-14 w-14 object-contain" />
              )}
            </div>
          ) : (
            <div className="mb-10 border-b border-slate-400" />
          )}
          <div className="text-xs text-slate-500">Delivered by</div>
          <div>{r.delivered_by ?? "—"}</div>
          <div className="text-xs text-slate-500 mt-2">
            For {b.company_name}
            {b.authorized_signatory ? ` — ${b.authorized_signatory}` : ""}
          </div>
        </div>
        <div>
          <div className="mb-10 border-b border-slate-400" />
          <div className="text-xs text-slate-500">Received by (with seal & signature)</div>
          <div>{r.received_by ?? "—"}</div>
        </div>
      </section>

      <footer className="mt-8 text-center text-[10px] text-slate-400">
        This is a delivery challan and NOT a tax invoice.
      </footer>
    </div>
  );
}
