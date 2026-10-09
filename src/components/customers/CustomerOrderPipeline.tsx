import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  Phone,
  MessageSquare,
  ExternalLink,
  Filter,
  RefreshCw,
  Boxes,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { LoadingBlock, EmptyState, ErrorBlock } from "@/components/layout/States";
import {
  listOrderPipeline,
  type OrderPipelineItem,
  type DeadlineHealth,
} from "@/lib/customers/order-pipeline";
import { formatDate } from "@/lib/format";
import { buildWhatsappUrl, normalizeWhatsappPhone } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function CustomerOrderPipeline() {
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["customer-order-pipeline"],
    queryFn: () => listOrderPipeline(),
    staleTime: 30_000,
  });

  // KPI Metrics
  const metrics = useMemo(() => {
    let overdueCount = 0;
    let criticalDelayCount = 0;
    let tightBufferCount = 0;
    let onTrackCount = 0;
    let completedCount = 0;

    for (const item of items) {
      if (item.health === "overdue") overdueCount++;
      else if (item.health === "critical_delay") criticalDelayCount++;
      else if (item.health === "tight_buffer") tightBufferCount++;
      else if (item.health === "on_track") onTrackCount++;
      else if (item.health === "completed") completedCount++;
    }

    return {
      total: items.length,
      attentionNeeded: overdueCount + criticalDelayCount,
      tightBufferCount,
      onTrackCount,
      completedCount,
    };
  }, [items]);

  // Filtering
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      // Health filter
      if (healthFilter === "attention") {
        if (item.health !== "overdue" && item.health !== "critical_delay") return false;
      } else if (healthFilter === "tight") {
        if (item.health !== "tight_buffer") return false;
      } else if (healthFilter === "on_track") {
        if (item.health !== "on_track") return false;
      } else if (healthFilter === "completed") {
        if (item.health !== "completed") return false;
      }

      // Text search
      if (!q) return true;
      return (
        item.orderNo.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        (item.contactPerson && item.contactPerson.toLowerCase().includes(q)) ||
        (item.firmName && item.firmName.toLowerCase().includes(q)) ||
        item.vendorName.toLowerCase().includes(q) ||
        (item.itemDescription && item.itemDescription.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    });
  }, [items, search, healthFilter]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  if (isLoading) return <LoadingBlock label="Loading order pipeline..." />;
  if (error)
    return (
      <ErrorBlock
        message={(error as Error)?.message || "Failed to load order pipeline"}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-4">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className={cn(
            "cursor-pointer transition-all border",
            healthFilter === "all"
              ? "ring-2 ring-primary border-primary"
              : "hover:border-slate-300",
          )}
          onClick={() => {
            setHealthFilter("all");
            setPage(1);
          }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
              <h3 className="text-2xl font-bold mt-0.5">{metrics.total}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all border",
            healthFilter === "attention"
              ? "ring-2 ring-rose-500 border-rose-500 bg-rose-50/20"
              : "hover:border-rose-300",
          )}
          onClick={() => {
            setHealthFilter("attention");
            setPage(1);
          }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-700 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Needs Attention
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-0.5">{metrics.attentionNeeded}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all border",
            healthFilter === "tight"
              ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/20"
              : "hover:border-amber-300",
          )}
          onClick={() => {
            setHealthFilter("tight");
            setPage(1);
          }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> Tight Buffer (≤2d)
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-0.5">
                {metrics.tightBufferCount}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all border",
            healthFilter === "on_track"
              ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20"
              : "hover:border-emerald-300",
          )}
          onClick={() => {
            setHealthFilter("on_track");
            setPage(1);
          }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> On Track
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{metrics.onTrackCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar / Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order #, vendor, customer, or contact person..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pipeline Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No orders found in pipeline"
          message={
            search || healthFilter !== "all"
              ? "Try adjusting your search query or status filter."
              : "Confirmed orders and purchase orders with assigned vendors will appear here automatically."
          }
          icon={<Boxes className="h-6 w-6" />}
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filteredItems.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Sr.</TableHead>
                <TableHead className="w-36">Order / PO</TableHead>
                <TableHead className="w-56">Customer & Point of Contact</TableHead>
                <TableHead className="w-48">Assigned Vendor</TableHead>
                <TableHead className="w-36">Vendor Deadline</TableHead>
                <TableHead className="w-36">Customer Deadline</TableHead>
                <TableHead className="w-40">Buffer & Health</TableHead>
                <TableHead className="w-24 text-right">Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item, idx) => {
                const targetLink =
                  item.orderType === "po"
                    ? `/purchase-orders/${item.orderId}`
                    : `/sales-orders/${item.orderId}`;

                // Pre-filled WhatsApp texts
                const vendorPhone = item.vendorPhone
                  ? normalizeWhatsappPhone(item.vendorPhone)
                  : "";
                const customerPhone = item.customerPhone
                  ? normalizeWhatsappPhone(item.customerPhone)
                  : "";

                const vendorWaText = `Hi ${item.vendorName}, this is Stone Tech regarding order ${item.orderNo} for ${item.customerName}. Given delivery deadline is ${item.vendorDeadline ? formatDate(item.vendorDeadline) : "as agreed"}. Could you please confirm current fabrication progress?`;
                const customerWaText = `Hi ${item.contactPerson || item.customerName}, this is Stone Tech regarding your order ${item.orderNo}. Your materials are in fabrication and scheduled for delivery by ${item.customerDeadline ? formatDate(item.customerDeadline) : "the committed date"}. We will keep you updated.`;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {(page - 1) * pageSize + idx + 1}
                    </TableCell>

                    {/* Order / PO */}
                    <TableCell>
                      <Link
                        to={targetLink as unknown as string}
                        className="hover:underline flex flex-col gap-0.5"
                      >
                        <span className="font-mono text-xs font-semibold text-primary">
                          {item.orderNo}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-normal">
                          <span className="capitalize">{item.orderType.toUpperCase()}</span>
                          {item.orderDate && <span>· {formatDate(item.orderDate)}</span>}
                        </div>
                      </Link>
                    </TableCell>

                    {/* Customer & Point of Contact */}
                    <TableCell>
                      <div className="flex flex-col gap-1 py-0.5">
                        <Link
                          to={
                            item.customerId
                              ? `/customers/${item.customerId}`
                              : ("/customers" as unknown as string)
                          }
                          className="font-medium text-slate-900 hover:text-primary hover:underline text-xs"
                        >
                          {item.customerName}
                        </Link>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {item.contactPerson && (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-teal-50 text-teal-800 border border-teal-200/60 px-1.5 py-0.2 text-[10px] font-medium"
                              title="Point of Contact / Representative"
                            >
                              <User className="h-2.5 w-2.5 text-teal-600" />
                              <span>{item.contactPerson}</span>
                            </span>
                          )}
                          {item.firmName && item.firmName !== item.customerName && (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[10px]"
                              title="Firm Name"
                            >
                              <Building2 className="h-2.5 w-2.5 text-slate-500" />
                              <span>{item.firmName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Assigned Vendor */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-xs text-slate-800 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{item.vendorName}</span>
                        </span>
                        {item.vendorCode && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {item.vendorCode}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Vendor Deadline */}
                    <TableCell>
                      {item.vendorDeadline ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-slate-900 font-mono">
                            {formatDate(item.vendorDeadline)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Vendor commitment
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not set</span>
                      )}
                    </TableCell>

                    {/* Customer Deadline */}
                    <TableCell>
                      {item.customerDeadline ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-slate-900 font-mono">
                            {formatDate(item.customerDeadline)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Client commitment
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not set</span>
                      )}
                    </TableCell>

                    {/* Buffer & Health Status */}
                    <TableCell>
                      <HealthStatusPill item={item} />
                    </TableCell>

                    {/* Quick WhatsApp Follow-ups */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* WhatsApp Vendor */}
                        {vendorPhone && (
                          <a
                            href={buildWhatsappUrl(vendorPhone, vendorWaText, "wa.me")}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Follow up with vendor (${item.vendorName}) on WhatsApp`}
                            className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 transition-colors border border-emerald-200/60 inline-flex items-center"
                          >
                            <Building2 className="h-3.5 w-3.5 mr-0.5 text-emerald-600" />
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          </a>
                        )}

                        {/* WhatsApp Customer */}
                        {customerPhone && (
                          <a
                            href={buildWhatsappUrl(customerPhone, customerWaText, "wa.me")}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Send progress update to customer (${item.contactPerson || item.customerName}) on WhatsApp`}
                            className="p-1.5 rounded-md hover:bg-teal-50 text-teal-700 transition-colors border border-teal-200/60 inline-flex items-center"
                          >
                            <User className="h-3.5 w-3.5 mr-0.5 text-teal-600" />
                            <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
                          </a>
                        )}

                        {/* Open Order */}
                        <Link
                          to={targetLink as unknown as string}
                          title="Open order details"
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}

function HealthStatusPill({ item }: { item: OrderPipelineItem }) {
  if (item.health === "completed") {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-normal"
      >
        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Completed
      </Badge>
    );
  }

  if (item.health === "overdue") {
    return (
      <Badge
        variant="destructive"
        className="bg-rose-100 text-rose-800 border-rose-300 text-[11px] font-semibold"
      >
        <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
      </Badge>
    );
  }

  if (item.health === "critical_delay") {
    return (
      <Badge
        variant="destructive"
        className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-medium"
      >
        <AlertTriangle className="h-3 w-3 mr-1 text-rose-600" />
        {item.bufferDays !== null ? `${item.bufferDays}d Delay Risk` : "Delay Risk"}
      </Badge>
    );
  }

  if (item.health === "tight_buffer") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-medium"
      >
        <Clock className="h-3 w-3 mr-1 text-amber-600" />
        {item.bufferDays !== null ? `+${item.bufferDays}d Buffer` : "Tight Window"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium"
    >
      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
      {item.bufferDays !== null ? `+${item.bufferDays}d Buffer` : "On Track"}
    </Badge>
  );
}
