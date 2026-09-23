import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useListPageState } from "@/hooks/use-list-page-state";
import { useRoles } from "@/hooks/use-roles";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listMessageTemplates, upsertMessageTemplate } from "@/lib/notifications/templates-api";
import { extractPlaceholders } from "@/lib/notifications/templates";
import { invalidateMessageTemplate } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/message-templates")({
  ssr: false,
  component: TemplatesPage,
});

function TemplatesPage() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: qk.messageTemplates.all,
    queryFn: () => listMessageTemplates(),
  });
  // Search/debounce/pagination/table-prefs via the
  // shared list-page hook (same 200ms debounce and prefs key as before).
  const list = useListPageState("message-templates", { debounceMs: 200 });
  const dq = list.debouncedQuery;
  const { prefs, setDensity, toggleColumn, isHidden } = list;
  // Message_templates RLS allows writes only for the
  // admin role ("admin manage templates", migration 20260707063953);
  // useRoles().isAdmin is inheritance-aware, so the Platform Super Admin
  // passes too. Previously New/Edit rendered for every staff user and their
  // save failed at the database. The policy itself is unchanged — this only
  // stops showing affordances the DB was already rejecting.
  const canManage = useRoles().isAdmin;

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: t("table.code", "Code"), required: true },
      { key: "name", label: t("table.name", "Name") },
      { key: "channel", label: t("table.channel", "Channel") },
      { key: "category", label: t("table.category", "Category") },
      { key: "active", label: t("table.active", "Active") },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    const term = dq.trim().toLowerCase();
    const all = query.data ?? [];
    if (!term) return all;
    return all.filter((tpl) =>
      [tpl.code, tpl.name, tpl.channel, tpl.category].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [query.data, dq]);
  const pageRows = list.paginate(filtered);

  return (
    <div>
      <PageHeader
        title={t("messageTemplates.title", "Message Templates")}
        subtitle={t(
          "messageTemplates.subtitle",
          "Reusable Email / WhatsApp / SMS templates for Estimates, Receipts, Invoices and more. Placeholders like {{customer_name}} are replaced at send time.",
        )}
      />

      <DataToolbar
        count={filtered.length}
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder={t("messageTemplates.searchPlaceholder", "Search code, name, category…")}
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        extra={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link to="/notification-settings">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("messageTemplates.providers", "Providers")}
            </Link>
          </Button>
        }
        action={
          canManage ? (
            <EditTemplateDialog
              existingCodes={(query.data ?? []).map((tpl) => tpl.code)}
              trigger={
                <Button size="sm" className="h-8">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
                  {t("messageTemplates.newTemplate", "New template")}
                </Button>
              }
            />
          ) : undefined
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("messageTemplates.noTemplates", "No templates")}
          message={
            canManage
              ? t(
                  "messageTemplates.emptyCanManage",
                  "Create your first template to reuse across the ERP.",
                )
              : t("messageTemplates.emptyCannotManage", "Ask an admin to add templates.")
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={<TablePagination {...list.paginationProps(filtered.length)} />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("code") && <TableHead>{t("table.code", "Code")}</TableHead>}
                {!isHidden("name") && <TableHead>{t("table.name", "Name")}</TableHead>}
                {!isHidden("channel") && <TableHead>{t("table.channel", "Channel")}</TableHead>}
                {!isHidden("category") && <TableHead>{t("table.category", "Category")}</TableHead>}
                {!isHidden("active") && <TableHead>{t("table.active", "Active")}</TableHead>}
                {canManage && (
                  <TableHead className="text-right">{t("table.edit", "Edit")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((tpl) => (
                <TableRow key={tpl.id}>
                  {!isHidden("code") && (
                    <TableCell className="font-mono text-xs">{tpl.code}</TableCell>
                  )}
                  {!isHidden("name") && <TableCell>{tpl.name}</TableCell>}
                  {!isHidden("channel") && (
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {tpl.channel}
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("category") && (
                    <TableCell className="text-sm">{tpl.category}</TableCell>
                  )}
                  {!isHidden("active") && (
                    <TableCell>
                      <Badge variant={tpl.is_active ? "default" : "outline"}>
                        {tpl.is_active ? t("common.yes", "Yes") : t("common.no", "No")}
                      </Badge>
                    </TableCell>
                  )}
                  {canManage && (
                    <TableCell className="text-right">
                      <EditTemplateDialog
                        template={{ ...tpl, channel: tpl.channel as "email" | "whatsapp" | "sms" }}
                        trigger={
                          <Button variant="ghost" size="sm">
                            {t("table.edit", "Edit")}
                          </Button>
                        }
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}

function EditTemplateDialog({
  template,
  trigger,
  existingCodes = [],
}: {
  template?: {
    code: string;
    name: string;
    channel: "email" | "whatsapp" | "sms";
    category: string;
    subject: string | null;
    body: string;
    is_active: boolean;
  };
  trigger: React.ReactNode;
  /** Codes already in use — guards the create path against a silent upsert overwrite. */
  existingCodes?: string[];
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(template?.code ?? "");
  const [name, setName] = useState(template?.name ?? "");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "sms">(
    template?.channel ?? "email",
  );
  const [category, setCategory] = useState(template?.category ?? "general");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [active, setActive] = useState<boolean>(template?.is_active ?? true);

  // The dialog stays mounted between openings, so without this the "New
  // template" form kept whatever was typed (or saved) last time, and an
  // edited row that was refetched still showed the stale values.
  useEffect(() => {
    if (!open) return;
    setCode(template?.code ?? "");
    setName(template?.name ?? "");
    setChannel(template?.channel ?? "email");
    setCategory(template?.category ?? "general");
    setSubject(template?.subject ?? "");
    setBody(template?.body ?? "");
    setActive(template?.is_active ?? true);
  }, [open, template]);

  const duplicateCode = !template && existingCodes.includes(code.trim());

  const save = useMutation({
    mutationFn: () =>
      upsertMessageTemplate({
        code: code.trim(),
        name,
        channel,
        category,
        subject: channel === "email" ? subject : null,
        body,
        variables: extractPlaceholders(body + " " + (subject ?? "")),
        is_active: active,
      }),
    onSuccess: () => {
      toast.success(t("messageTemplates.saved", "Template saved"));
      invalidateMessageTemplate(qc, code.trim());
      setOpen(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {template
              ? t("messageTemplates.editTemplate", "Edit template")
              : t("messageTemplates.newTemplate", "New template")}
          </DialogTitle>
        </DialogHeader>
        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!code || !name || !body || duplicateCode) return;
            save.mutate();
          }}
          busy={save.isPending}
        >
          <QuickForm.QuickFill>
            <Field
              label={t("messageTemplates.code", "Code")}
              required
              error={
                duplicateCode
                  ? t("messageTemplates.duplicateCode", "A template with this code already exists.")
                  : undefined
              }
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={!!template}
                placeholder="e.g. estimate.email.v2"
              />
            </Field>
            <Field label={t("messageTemplates.name", "Name")} required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("messageTemplates.channel", "Channel")} required>
              <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("messageTemplates.category", "Category")}>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. estimate / receipt / invoice"
              />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            {channel === "email" && (
              <Field label={t("messageTemplates.subject", "Subject")} className="md:col-span-2">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
            )}
            <Field
              label={t("messageTemplates.body", "Body")}
              required
              className="md:col-span-2"
              hint={`${t("messageTemplates.placeholders", "Placeholders")}: ${
                extractPlaceholders(body + " " + subject)
                  .map((v) => `{{${v}}}`)
                  .join(", ") || "—"
              }`}
            >
              <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Actions>
            <Button type="button" variant="outline" onClick={() => setActive(!active)}>
              {active ? t("common.deactivate", "Deactivate") : t("common.activate", "Activate")}
            </Button>
            <Button
              type="submit"
              disabled={!code || !name || !body || duplicateCode || save.isPending}
            >
              <Save className="mr-2 h-4 w-4" /> {t("common.save", "Save")}
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
