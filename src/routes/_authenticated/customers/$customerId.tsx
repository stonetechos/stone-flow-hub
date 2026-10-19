import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  ClipboardList,
  FolderPlus,
  Pencil,
  FileText,
  Phone,
  MessageCircle,
  Mail,
  FolderOpen,
  History,
  UserCheck,
  Building2,
  Plus,
  ShoppingCart,
  Truck,
  Receipt,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { NumericInput } from "@/components/forms/inputs/SmartInputs";
import { PROJECT_TYPES, projectCreateSchema, type ProjectCreateInput } from "@/lib/projects/schema";
import { createProject } from "@/lib/projects/api";
import { invalidateProject } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";
import { TransferOwnershipDialog } from "@/components/ownership/TransferOwnershipDialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityInsightPanel } from "@/components/insights/EntityInsightPanel";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getCustomer, addCustomerContact, deleteCustomerContact } from "@/lib/customers/api";
import {
  SPACE_TYPES,
  MATERIAL_OPTIONS,
  getCustomerTypeLabel,
  getEffectiveCustomerType,
} from "@/lib/customers/schema";
import { hydrateMaterialInterests } from "@/lib/customers/material-interests";
import { normalizeCustomerRow } from "@/lib/customers/normalize";
import { hub } from "@/lib/hubs/api";
import { RelatedList, InfoGrid, PlaceholderTab } from "@/components/entity/RelatedList";
import { NotesPanel, AttachmentsPanel } from "@/components/entity/DetailPanels";
import { BusinessTimeline } from "@/components/timeline/BusinessTimeline";
import { useCustomerTimeline } from "@/lib/timeline/hooks";
import { DeliveryChallanListPanel } from "@/components/dispatch/DeliveryChallanListPanel";
import { CustomerLedgerPanel } from "@/components/customer-ledger/CustomerLedgerPanel";
import { StatusPill } from "@/components/entity/StatusPill";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { formatInr, formatDate } from "@/lib/format";
import { CustomerPaymentCentre } from "@/components/customer-payments/CustomerPaymentCentre";
import { listFollowups } from "@/lib/followups/api";
import { NextFollowupChip } from "@/components/enquiry/NextFollowupChip";
import { CustomerResponseStatusSelect } from "@/components/customers/CustomerResponseStatusSelect";
import { CustomerAssigneeSelect } from "@/components/customers/CustomerAssigneeSelect";
import { CustomerPaymentStatusSelect } from "@/components/customers/CustomerPaymentStatusSelect";
import { extractCustomerSerialNumber } from "@/lib/customers/payment-status";
import { CustomerCrmFollowupCard } from "@/components/customers/CustomerCrmFollowupCard";

/** Payment and dispatch due dates for this customer, glanceable right on
 *  Overview (Sales dashboard, 2026-09) — renders nothing when there's
 *  nothing due, so it never adds empty-state clutter to a clean account. */
function CustomerDuesCard({ customerId }: { customerId: string }) {
  const duesQ = useQuery({
    queryKey: ["hub", "customer", customerId, "dues"],
    queryFn: () => hub.customerDues(customerId),
  });
  const today = new Date().toISOString().slice(0, 10);
  const paymentDues = duesQ.data?.paymentDues ?? [];
  const dispatchDues = duesQ.data?.dispatchDues ?? [];

  if (duesQ.isLoading || (paymentDues.length === 0 && dispatchDues.length === 0)) return null;

  return (
    <Card className="shadow-1 border-amber-500/40">
      <CardHeader>
        <CardTitle className="text-sm">Dues</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentDues.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Payment due ({paymentDues.length})
            </div>
            <div className="space-y-1">
              {paymentDues.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <Link
                    to="/invoices/$invoiceId"
                    params={{ invoiceId: r.id }}
                    className="font-mono text-xs hover:underline"
                  >
                    {r.invoice_no}
                  </Link>
                  <span
                    className={
                      r.due_date && r.due_date < today ? "text-destructive font-medium" : ""
                    }
                  >
                    {formatInr(r.balance_due)} · due {formatDate(r.due_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {dispatchDues.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Dispatch due ({dispatchDues.length})
            </div>
            <div className="space-y-1">
              {dispatchDues.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <Link
                    to="/sales-orders/$id"
                    params={{ id: r.id }}
                    className="font-mono text-xs hover:underline"
                  >
                    {r.so_no}
                  </Link>
                  <span
                    className={
                      r.delivery_date && r.delivery_date < today
                        ? "text-destructive font-medium"
                        : ""
                    }
                  >
                    due {formatDate(r.delivery_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Installation orders for this customer — who's assigned, planned dates,
 *  progress (Sales dashboard, 2026-09). Team assignment itself happens on
 *  the existing /installations/$id page this links out to, rather than
 *  duplicating that flow here. */
function CustomerInstallationsTab({ customerId }: { customerId: string }) {
  const q = useQuery({
    queryKey: ["hub", "customer", customerId, "installations"],
    queryFn: () => hub.customerInstallations(customerId),
  });
  const rows = q.data ?? [];

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (rows.length === 0) {
    return (
      <PlaceholderTab message="No installations yet — these are created automatically from Supply + Installation sales orders." />
    );
  }

  return (
    <Card className="shadow-1">
      <CardHeader>
        <CardTitle className="text-sm">Installations</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Sales Order</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    to="/installations/$id"
                    params={{ id: r.id }}
                    className="text-primary hover:underline"
                  >
                    {r.installation_no ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>{r.project?.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.sales_order?.so_no ?? "—"}</TableCell>
                <TableCell>
                  {r.team?.name ?? (
                    <Link
                      to="/installations/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      Assign team
                    </Link>
                  )}
                </TableCell>
                <TableCell>{formatDate(r.planned_start_date)}</TableCell>
                <TableCell>{r.progress_pct}%</TableCell>
                <TableCell>
                  <StatusPill status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** Phase G.10 — full Business Timeline for this customer: enquiries,
 *  quotations, sales orders, invoices, payments, dispatches, installations,
 *  completed tasks and the customer's own activity log, unioned and sorted
 *  chronologically by the shared lib/timeline engine. Answers "what
 *  happened with this customer" directly on the customer page itself. */
function CustomerTimelineTab({ customerId }: { customerId: string }) {
  const timelineQ = useCustomerTimeline(customerId);
  return (
    <BusinessTimeline
      events={timelineQ.data}
      isLoading={timelineQ.isLoading}
      error={timelineQ.error}
      onRetry={() => timelineQ.refetch()}
      emptyTitle="No history yet"
      emptyMessage="Enquiries, quotations, orders, invoices and payments for this customer will appear here as they happen."
    />
  );
}

function CreateCustomerProjectDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  defaultCity,
  defaultAddress,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId: string;
  customerName: string;
  defaultCity?: string | null;
  defaultAddress?: string | null;
}) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [form, setForm] = useState<ProjectCreateInput>({
    customer_id: customerId,
    name: "",
    city: defaultCity || "",
    project_type: "residential",
    site_address: defaultAddress || null,
    state: null,
    pincode: null,
    expected_value_inr: null,
    expected_start_date: null,
    expected_completion_date: null,
    notes: null,
  });

  useEffect(() => {
    if (open) {
      setForm({
        customer_id: customerId,
        name: "",
        city: defaultCity || "",
        project_type: "residential",
        site_address: defaultAddress || null,
        state: null,
        pincode: null,
        expected_value_inr: null,
        expected_start_date: null,
        expected_completion_date: null,
        notes: null,
      });
    }
  }, [open, customerId, defaultCity, defaultAddress]);

  const mutation = useMutation({
    mutationFn: (input: ProjectCreateInput) => createProject(input),
    onSuccess: (row) => {
      toast.success(`Project ${row.project_code} created for ${customerName}`, {
        description: "Ready to draft quotation, approve order, or generate dispatch?",
        action: {
          label: "Draft quote",
          onClick: () =>
            nav({
              to: "/quotes",
              search: { new: "1", project: row.id, customer: customerId },
            }),
        },
      });
      invalidateProject(qc, row.id);
      qc.invalidateQueries({ queryKey: qk.projects.byCustomer(customerId) });
      qc.invalidateQueries({ queryKey: ["hub", "customer", customerId, "projects"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = projectCreateSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
    mutation.mutate(parsed.data);
  }

  const set = <K extends keyof ProjectCreateInput>(k: K, v: ProjectCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            <span>Add Project for {customerName}</span>
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Create a new project site to start a fresh cycle: Quote → Customer Approval → Delivery
          Challan → Invoices.
        </p>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <Field label="Project / Site Name" required className="md:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. DLF Magnolias 1202, Chattarpur Farmhouse, Sec 42 Villa"
              autoFocus
            />
          </Field>
          <Field label="Project Type" required>
            <Select
              value={form.project_type}
              onValueChange={(v) => set("project_type", v as ProjectCreateInput["project_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="City" required>
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="e.g. Gurugram, Delhi, Mumbai"
            />
          </Field>
          <Field label="Site Address" className="md:col-span-2">
            <Textarea
              value={form.site_address ?? ""}
              onChange={(e) => set("site_address", e.target.value || null)}
              placeholder="Physical delivery / installation address"
              rows={2}
            />
          </Field>
          <Field label="Expected Value (INR)">
            <NumericInput
              value={
                form.expected_value_inr !== null && form.expected_value_inr !== undefined
                  ? String(form.expected_value_inr)
                  : ""
              }
              onChange={(v) => set("expected_value_inr", v === "" ? null : Number(v))}
              placeholder="₹ 0"
            />
          </Field>
          <Field label="Notes">
            <Input
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              placeholder="Any special remarks or architect details"
            />
          </Field>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

function AddContactDialog({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    designation: "",
    email: "",
    is_primary: false,
  });

  useEffect(() => {
    if (open) {
      setForm({ name: "", phone: "", designation: "", email: "", is_primary: false });
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      addCustomerContact(customerId, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
        email: form.email.trim() || null,
        is_primary: form.is_primary,
      }),
    onSuccess: () => {
      toast.success("Contact added successfully");
      qc.invalidateQueries({ queryKey: ["hub", "customer", customerId, "contacts"] });
      qc.invalidateQueries({ queryKey: qk.customers.contacts(customerId) });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Contact name is required");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Add Contact Person</span>
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Add an additional contact person (e.g. Architect, Site Engineer, Supervisor, Manager).
        </p>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <Field label="Contact Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rajesh Kumar"
              autoFocus
            />
          </Field>
          <Field label="Phone / Mobile">
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. 9876543210"
            />
          </Field>
          <Field label="Designation / Role">
            <Input
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              placeholder="e.g. Site Supervisor, Architect, Purchase Manager"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="e.g. rajesh@example.com"
            />
          </Field>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

function CustomerProjectsTab({
  customerId,
  customerName,
  onOpenNewProject,
}: {
  customerId: string;
  customerName: string;
  onOpenNewProject: () => void;
}) {
  const q = useQuery({
    queryKey: qk.projects.byCustomer(customerId),
    queryFn: () => hub.customerProjects(customerId),
  });
  const rows = q.data ?? [];

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-lg p-3 sm:px-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Customer Projects & Repeat Workflows</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every project runs its own complete lifecycle: Quote → Approval (Sales Order) → Delivery
            Challan → Invoice & Ledger.
          </p>
        </div>
        <Button size="sm" onClick={onOpenNewProject} className="shrink-0">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Next Project
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="shadow-1">
          <CardContent className="py-8 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-slate-800">
              No projects registered yet for {customerName}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Start their first or next project to manage dedicated quotations, customer approvals,
              dispatches, and invoices for each site.
            </p>
            <Button size="sm" className="mt-4" onClick={onOpenNewProject}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Start New Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-1 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Project Code</TableHead>
                <TableHead>Project Name & Site</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-28">City</TableHead>
                <TableHead className="w-28">Created</TableHead>
                <TableHead className="text-right">Project Lifecycle Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="hover:underline"
                    >
                      {p.project_code || "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="font-medium text-slate-900 hover:underline block"
                    >
                      {p.name}
                    </Link>
                    {p.site_address && (
                      <span className="text-xs text-muted-foreground block line-clamp-1">
                        {p.site_address}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-[11px]">
                      {p.project_type || "residential"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{p.city || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 text-indigo-700 bg-indigo-50/50 border-indigo-200 hover:bg-indigo-100/60"
                        title="Draft a new Quotation for this project"
                      >
                        <Link
                          to="/quotes"
                          search={{ new: "1", project: p.id, customer: customerId }}
                        >
                          <FileText className="mr-1 h-3 w-3" /> Quote
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 text-amber-700 bg-amber-50/50 border-amber-200 hover:bg-amber-100/60"
                        title="Create a Sales Order / Customer Approval"
                      >
                        <Link
                          to="/sales-orders/new"
                          search={{ project: p.id, customer: customerId }}
                        >
                          <ShoppingCart className="mr-1 h-3 w-3" /> Order
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100/60"
                        title="Dispatch / Delivery Challan"
                      >
                        <Link to="/dispatch/new" search={{ customer: customerId }}>
                          <Truck className="mr-1 h-3 w-3" /> Challan
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 text-emerald-700 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/60"
                        title="Create an Invoice"
                      >
                        <Link to="/invoices/new" search={{ customer: customerId }}>
                          <Receipt className="mr-1 h-3 w-3" /> Invoice
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Open Project Workspace"
                      >
                        <Link to="/projects/$projectId" params={{ projectId: p.id }}>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  ssr: false,
  component: CustomerHub,
});

function CustomerHub() {
  const { customerId } = Route.useParams();
  const [tab, setTab] = useState("overview");
  const roles = useRoles();
  const canTransfer = roles.isAdmin || roles.isSalesManager;
  const [transferOpen, setTransferOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const qc = useQueryClient();

  const deleteContactMut = useMutation({
    mutationFn: (contactId: string) => deleteCustomerContact(contactId),
    onSuccess: () => {
      toast.success("Contact removed");
      qc.invalidateQueries({ queryKey: ["hub", "customer", customerId, "contacts"] });
      qc.invalidateQueries({ queryKey: qk.customers.contacts(customerId) });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });
  const q = useQuery({
    queryKey: qk.customers.byId(customerId),
    queryFn: () => getCustomer(customerId),
  });
  const stats = useQuery({
    queryKey: ["hub", "customer", customerId, "stats"],
    queryFn: () => hub.customerStats(customerId),
  });
  const nextFupQ = useQuery({
    queryKey: ["customer-next-followup", customerId],
    queryFn: () => listFollowups({ customerId, scope: "pending", limit: 1 }),
    staleTime: 30_000,
  });
  const nextFupRow = (nextFupQ.data ?? [])[0] ?? null;

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="Customer not found." />;
  const c = normalizeCustomerRow(q.data);

  const phone = c.primary_phone ?? "";
  const wa = c.whatsapp ?? c.primary_phone ?? "";
  const email = c.primary_email ?? "";
  const waDigits = wa.replace(/[^0-9]/g, "");

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to customers
        </Link>
      </div>
      <PageHeader
        title={(() => {
          const serial = extractCustomerSerialNumber(c.customer_code);
          return serial !== null
            ? `${serial}. ${c.name}${c.customer_code ? ` (${c.customer_code})` : ""}`
            : c.customer_code
              ? `${c.name} (${c.customer_code})`
              : c.name;
        })()}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getCustomerTypeLabel(getEffectiveCustomerType(c))}</Badge>
            {c.company_name && (
              <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Firm: {c.company_name}
              </span>
            )}
            {c.contact_person && (
              <span className="text-xs font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                Contact: {c.contact_person}
              </span>
            )}
            <CustomerResponseStatusSelect
              customerId={customerId}
              customerName={c.name}
              isActive={c.is_active}
              workflowState={c.workflow_state}
              externalRef={c.external_ref}
            />
            <CustomerAssigneeSelect
              customerId={customerId}
              customerName={c.name}
              workflowState={c.workflow_state}
              externalRef={c.external_ref}
            />
            <CustomerPaymentStatusSelect
              customerId={customerId}
              customerName={c.name}
              workflowState={c.workflow_state}
              externalRef={c.external_ref}
            />
          </span>
        }
        actions={
          <DetailActionBar
            pin={{ entityType: "customer", entityId: customerId, label: c.name }}
            primary={
              <>
                <Link to="/customers" search={{ edit: customerId }}>
                  <Button size="sm">
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </Link>
                <Link to="/enquiries" search={{ new: "1", customer: customerId }}>
                  <Button variant="outline" size="sm">
                    <ClipboardList className="mr-2 h-4 w-4" /> New enquiry
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => setNewProjectOpen(true)}>
                  <FolderPlus className="mr-2 h-4 w-4 text-indigo-600" /> New project
                </Button>
                <Link to="/quotes" search={{ new: "1", customer: customerId }}>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4 text-emerald-600" /> New quote
                  </Button>
                </Link>
              </>
            }
            overflow={[
              ...(phone
                ? [
                    {
                      label: `Call ${phone}`,
                      icon: <Phone className="h-4 w-4" />,
                      href: `tel:${phone}`,
                    },
                  ]
                : []),
              ...(waDigits
                ? [
                    {
                      label: "WhatsApp",
                      icon: <MessageCircle className="h-4 w-4" />,
                      href: `https://wa.me/${waDigits}`,
                    },
                  ]
                : []),
              ...(email
                ? [{ label: "Email", icon: <Mail className="h-4 w-4" />, href: `mailto:${email}` }]
                : []),
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () => setTab("documents"),
                separatorBefore: true,
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () => setTab("timeline"),
              },
              ...(canTransfer
                ? [
                    {
                      label: "Transfer ownership",
                      icon: <UserCheck className="h-4 w-4" />,
                      onSelect: () => setTransferOpen(true),
                      separatorBefore: true,
                    },
                  ]
                : []),
            ]}
          />
        }
      />

      <EntityInsightPanel entityType="customer" entityId={customerId} />

      <GuidedNextStep entity="customer" entityId={customerId} />

      {canTransfer && (
        <TransferOwnershipDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          sourceType="customer"
          sourceId={customerId}
          sourceLabel={c.name}
          fromCustomerId={customerId}
        />
      )}

      <CreateCustomerProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        customerId={customerId}
        customerName={c.name}
        defaultCity={c.city}
        defaultAddress={c.site_address}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
          <TabsTrigger value="quotes">Quotations</TabsTrigger>
          <TabsTrigger value="sales">Sales Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="challans">Challans</TabsTrigger>
          <TabsTrigger value="installations">Installation</TabsTrigger>
          <TabsTrigger value="statements">Sales Ledger</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <CustomerCrmFollowupCard customer={c} />

          {/* Repeat Projects & Multi-Project Workflow Banner */}
          <Card className="shadow-1 border-primary/20 bg-gradient-to-r from-slate-50/60 to-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Customer Projects & Repeat Workflows</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Returning customer with a new site? Easily add their next project with dedicated
                  quotes, orders, delivery challans, and invoices.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setTab("projects")}
                >
                  View All Projects
                </Button>
                <Button size="sm" className="h-8" onClick={() => setNewProjectOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Next Project
                </Button>
              </div>
            </CardHeader>
          </Card>

          <CustomerDuesCard customerId={customerId} />

          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoGrid
                items={[
                  { label: "Name", value: c.name },
                  ...(c.contact_person
                    ? [
                        {
                          label: "Contact Person",
                          value: c.contact_person,
                        },
                      ]
                    : []),
                  ...(c.company_name
                    ? [
                        {
                          label: "Firm / Company Name",
                          value: c.company_name,
                        },
                      ]
                    : []),
                  { label: "Code", value: <span className="font-mono">{c.customer_code}</span> },
                  {
                    label: "Type of Customer",
                    value: getCustomerTypeLabel(getEffectiveCustomerType(c)),
                  },
                  ...(c.customer_type === "reference" && c.referred_by
                    ? [{ label: "Referred by", value: c.referred_by }]
                    : []),
                  { label: "Mobile", value: c.primary_phone },
                  { label: "Site's Area/Address", value: c.site_address },
                  {
                    label: "Type of space",
                    value: SPACE_TYPES.find((s) => s.value === c.space_type)?.label ?? c.space_type,
                  },
                  {
                    label: "Product of Interest",
                    value: (() => {
                      const interests = hydrateMaterialInterests(c.material_interests, c.notes);
                      return interests.length > 0
                        ? interests
                            .map((m) => MATERIAL_OPTIONS.find((o) => o.value === m)?.label ?? m)
                            .join(", ")
                        : "—";
                    })(),
                  },
                  { label: "Email", value: c.primary_email },
                  { label: "WhatsApp", value: c.whatsapp },
                  { label: "City", value: c.city },
                  { label: "State", value: c.state },
                  { label: "GST", value: c.gst_number },
                  { label: "Source", value: c.source },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <CustomerProjectsTab
            customerId={customerId}
            customerName={c.name}
            onOpenNewProject={() => setNewProjectOpen(true)}
          />
        </TabsContent>

        <TabsContent value="enquiries" className="mt-4">
          <RelatedList
            title="Enquiries"
            queryKey={["hub", "customer", customerId, "enquiries"]}
            queryFn={() => hub.customerEnquiries(customerId)}
            linkFor={(r) => ({ to: "/enquiries/$enquiryId", params: { enquiryId: r.id } })}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.enquiry_no}</span>,
              },
              { header: "Stage", cell: (r) => <Badge variant="outline">{r.stage}</Badge> },
              { header: "Priority", cell: (r) => r.priority },
              { header: "Created", cell: (r) => new Date(r.created_at).toLocaleDateString() },
            ]}
          />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <RelatedList
            title="Quotations"
            queryKey={["hub", "customer", customerId, "quotes"]}
            queryFn={() => hub.customerQuotes(customerId)}
            linkFor={(r) => ({ to: "/quotes/$quoteId", params: { quoteId: r.id } })}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.quote_no}</span>,
              },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Total", cell: (r) => formatInr(r.total) },
              {
                header: "Date",
                cell: (r) => r.issue_date ?? new Date(r.created_at).toLocaleDateString(),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <RelatedList
            title="Sales Orders"
            queryKey={["hub", "customer", customerId, "sales_orders"]}
            queryFn={() => hub.customerSalesOrders(customerId)}
            linkFor={(r) => ({ to: "/sales-orders/$id", params: { id: r.id } })}
            columns={[
              { header: "No.", cell: (r) => <span className="font-mono text-xs">{r.so_no}</span> },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Order date", cell: (r) => r.order_date ?? "—" },
              { header: "Delivery", cell: (r) => r.delivery_date ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <RelatedList
            title="Invoices"
            queryKey={["hub", "customer", customerId, "invoices"]}
            queryFn={() => hub.customerInvoices(customerId)}
            linkFor={(r) => ({ to: "/invoices/$invoiceId", params: { invoiceId: r.id } })}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.invoice_no}</span>,
              },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Total", cell: (r) => formatInr(r.total) },
              { header: "Balance", cell: (r) => formatInr(r.balance_due) },
            ]}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <CustomerPaymentCentre
            customerId={customerId}
            defaultTo={{ email: c.primary_email, whatsapp: c.whatsapp ?? c.primary_phone }}
          />
          <RelatedList
            title="Receipts &amp; payments"
            queryKey={["hub", "customer", customerId, "payments"]}
            queryFn={() => hub.customerPayments(customerId)}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.payment_no}</span>,
              },
              { header: "Invoice", cell: (r) => r.invoice?.invoice_no ?? "—" },
              { header: "Amount", cell: (r) => formatInr(r.amount) },
              { header: "Method", cell: (r) => r.method },
              { header: "Paid at", cell: (r) => new Date(r.paid_at).toLocaleString() },
            ]}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <AttachmentsPanel entityType="customer_document" entityId={customerId} />
        </TabsContent>

        <TabsContent value="challans" className="mt-4">
          <DeliveryChallanListPanel
            customerId={customerId}
            title="Delivery challans for this customer"
          />
        </TabsContent>

        <TabsContent value="installations" className="mt-4">
          <CustomerInstallationsTab customerId={customerId} />
        </TabsContent>

        <TabsContent value="statements" className="mt-4">
          <CustomerLedgerPanel customerId={customerId} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <CustomerTimelineTab customerId={customerId} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesPanel
            table="customers"
            id={customerId}
            value={c.notes}
            invalidateKey={qk.customers.byId(customerId)}
          />
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel entityType="customer" entityId={customerId} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <RelatedList
            title="Contacts"
            action={
              <Button size="sm" onClick={() => setAddContactOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add a contact
              </Button>
            }
            queryKey={["hub", "customer", customerId, "contacts"]}
            queryFn={() => hub.customerContacts(customerId)}
            emptyMessage="No contacts recorded."
            columns={[
              { header: "Name", cell: (r) => r.name },
              { header: "Designation", cell: (r) => r.designation ?? "—" },
              { header: "Phone", cell: (r) => r.phone ?? "—" },
              { header: "Email", cell: (r) => r.email ?? "—" },
              {
                header: "Primary",
                cell: (r) => (r.is_primary ? <Badge variant="secondary">Primary</Badge> : "—"),
              },
              {
                header: "Actions",
                cell: (r) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    title="Remove contact"
                    onClick={() => {
                      if (window.confirm(`Remove contact ${r.name}?`)) {
                        deleteContactMut.mutate(r.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ),
              },
            ]}
          />
          <AddContactDialog
            open={addContactOpen}
            onOpenChange={setAddContactOpen}
            customerId={customerId}
          />
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoGrid
                items={[
                  { label: "Billing address", value: c.billing_address ?? "—" },
                  { label: "City", value: c.city },
                  { label: "State", value: c.state },
                  { label: "Pincode", value: c.pincode },
                  { label: "Country", value: c.country },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {stats.isLoading ? (
            <LoadingBlock />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Projects", value: stats.data?.projects ?? 0 },
                { label: "Enquiries", value: stats.data?.enquiries ?? 0 },
                { label: "Quotations", value: stats.data?.quotes ?? 0 },
                { label: "Invoices", value: stats.data?.invoices ?? 0 },
              ].map((s) => (
                <Card key={s.label} className="shadow-1">
                  <CardContent className="py-4">
                    <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
                    <div className="mt-1 text-2xl font-semibold">{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {stats.isError && <PlaceholderTab message="Stats unavailable" />}
      <span className="hidden">
        <Users />
      </span>
    </div>
  );
}
