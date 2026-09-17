/**
 * Employee — create / edit. Owner-only. Uses FormLayout primitives.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PhoneInput,
  EmailInput,
  PanInput,
  NumericInput,
} from "@/components/forms/inputs/SmartInputs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormLayout, FormSection, FormGrid, FormActions } from "@/components/forms/FormLayout";
import { Field } from "@/components/forms/Field";
import { SkillsInput } from "@/components/workforce/SkillsInput";
import { KraKpaBuilder } from "@/components/workforce/KraKpaBuilder";
import { DesignationMultiSelect } from "@/components/workforce/DesignationMultiSelect";
import {
  createEmployee,
  updateEmployee,
  getEmployee,
  listDesignations,
  listEmployees,
} from "@/lib/workforce/api";
import type { EmployeeInput, EmployeeKra, EmployeeKpa } from "@/lib/workforce/schema";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES } from "@/lib/workforce/types";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { assignRole, type AppRole } from "@/lib/admin/users";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/employees/new")({
  head: () => ({ meta: [{ title: "New employee" }] }),
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({
    id: (s.id as string) || undefined,
  }),
  component: EmployeeFormPage,
});

function empty(): EmployeeInput {
  return {
    full_name: "",
    designation_id: null,
    designation_ids: [],
    department: "",
    employment_type: "full_time",
    reporting_manager_id: null,
    joining_date: "",
    phone: "",
    email: "",
    emergency_contact: "",
    address: "",
    aadhaar: "",
    pan: "",
    bank_details: {},
    salary_ctc: null,
    skills: [],
    kras: [],
    kpas: [],
    employment_status: "active",
    photo_url: "",
    remarks: "",
    user_id: null,
  };
}

function EmployeeFormPage() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite =
    roles.isAdmin ||
    roles.isSalesManager ||
    roles.isHr ||
    roles.canWrite ||
    roles.roles.length === 0;

  const existing = useQuery({
    queryKey: ["wf", "employees", id],
    queryFn: () => getEmployee(id!),
    enabled: !!id,
  });
  const designations = useQuery({ queryKey: ["wf", "designations"], queryFn: listDesignations });
  const managers = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
  });

  const [form, setForm] = useState<EmployeeInput>(empty);
  const [systemRole, setSystemRole] = useState<AppRole>("sales");
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(empty()));
  const dirty = JSON.stringify(form) !== baseline;

  // Query existing role if employee has user_id
  useQuery({
    queryKey: ["employee_user_role", existing.data?.user_id],
    queryFn: async () => {
      if (!existing.data?.user_id) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", existing.data.user_id)
        .maybeSingle();
      if (data?.role) {
        setSystemRole(data.role as AppRole);
      }
      return data;
    },
    enabled: !!existing.data?.user_id,
  });

  // Load existing into state on first fetch
  if (id && existing.data && form.full_name === "" && !existing.isFetching) {
    const e = existing.data;
    const bankObj = (e.bank_details as Record<string, unknown>) ?? {};
    const rawDesigIds =
      e.designation_ids ?? (bankObj as { _designation_ids?: string[] })._designation_ids;
    const loadedDesignationIds: string[] = Array.isArray(rawDesigIds)
      ? (rawDesigIds as string[])
      : e.designation_id
        ? [e.designation_id]
        : [];

    const loaded: EmployeeInput = {
      full_name: e.full_name,
      designation_id: e.designation_id,
      designation_ids: loadedDesignationIds,
      department: e.department ?? "",
      employment_type: e.employment_type,
      reporting_manager_id: e.reporting_manager_id,
      joining_date: e.joining_date ?? "",
      phone: e.phone ?? "",
      email: e.email ?? "",
      emergency_contact: e.emergency_contact ?? "",
      address: e.address ?? "",
      aadhaar: e.aadhaar ?? "",
      pan: e.pan ?? "",
      bank_details: bankObj,
      salary_ctc: e.salary_ctc,
      skills: e.skills ?? [],
      kras:
        (e as unknown as { kras?: EmployeeKra[] }).kras ??
        (bankObj as { _kras?: EmployeeKra[] })._kras ??
        [],
      kpas:
        (e as unknown as { kpas?: EmployeeKpa[] }).kpas ??
        (bankObj as { _kpas?: EmployeeKpa[] })._kpas ??
        [],
      employment_status: e.employment_status,
      photo_url: e.photo_url ?? "",
      remarks: e.remarks ?? "",
      user_id: e.user_id,
    };
    setForm(loaded);
    setBaseline(JSON.stringify(loaded));
  }

  const mut = useMutation({
    mutationFn: async (v: EmployeeInput) => {
      // If email provided, link to user if auth profile exists
      if (v.email?.trim() && !v.user_id) {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", v.email.trim().toLowerCase())
            .maybeSingle();
          if (prof?.id) {
            const { data: existingEmp } = await supabase
              .from("employees")
              .select("id")
              .eq("user_id", prof.id)
              .maybeSingle();
            if (!existingEmp || existingEmp.id === id) {
              v.user_id = prof.id;
            }
          }
        } catch {
          /* skip */
        }
      }

      const empRow = id
        ? await updateEmployee(id, v, systemRole)
        : await createEmployee(v, systemRole);

      // Assign system role if user_id linked
      if (empRow.user_id && systemRole) {
        try {
          await assignRole(empRow.user_id, systemRole);
        } catch {
          /* ignore duplicate role */
        }
      }

      return empRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["wf", "employees"] });
      toast.success(id ? "Employee updated" : "Employee created");
      nav({ to: "/workforce-intelligence/employees/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!canWrite) return;
    if (form.employment_status === "terminated" && !roles.isSuperAdmin) {
      toast.error(
        "Admins are not permitted to terminate employees. Only Super Admin can perform termination.",
      );
      return;
    }
    mut.mutate(form);
  }

  if (!roles.isReady) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader title={id ? "Edit employee" : "New employee"} subtitle="Loading permissions…" />
        <SkeletonTable rows={4} columns={2} />
      </div>
    );
  }

  if (!canWrite) {
    return (
      <>
        <PageHeader
          title="Not authorized"
          subtitle="Only administrators and HR managers can edit employee records."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={id ? "Edit employee" : "New employee"} eyebrow="Workforce Intelligence" />
      <FormLayout onSubmit={submit} busy={mut.isPending} dirty={dirty}>
        <FormSection title="Basic information">
          <FormGrid>
            <Field label="Full name" required>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field
              label="Designation(s)"
              hint="Select one or multiple designations. The first designation is Primary."
              className="sm:col-span-2"
            >
              <DesignationMultiSelect
                selectedIds={
                  form.designation_ids && form.designation_ids.length > 0
                    ? form.designation_ids
                    : form.designation_id
                      ? [form.designation_id]
                      : []
                }
                onChange={(ids) => {
                  setForm({
                    ...form,
                    designation_ids: ids,
                    designation_id: ids[0] ?? null,
                  });
                }}
                designations={designations.data ?? []}
                disabled={mut.isPending}
              />
            </Field>
            <Field label="Department">
              <Input
                value={form.department ?? ""}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </Field>
            <Field label="Employment type">
              <Select
                value={form.employment_type}
                onValueChange={(v) =>
                  setForm({ ...form, employment_type: v as EmployeeInput["employment_type"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reporting manager">
              <Select
                value={form.reporting_manager_id ?? ""}
                onValueChange={(v) => setForm({ ...form, reporting_manager_id: v || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {(managers.data ?? [])
                    .filter((m) => m.id !== id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Joining date">
              <Input
                type="date"
                value={form.joining_date ?? ""}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
              />
            </Field>
            <Field label="Employment status">
              <Select
                value={form.employment_status}
                onValueChange={(v) => {
                  if (v === "terminated" && !roles.isSuperAdmin) {
                    toast.error(
                      "Admins are not permitted to terminate employees. Only Super Admin can perform termination.",
                    );
                    return;
                  }
                  setForm({ ...form, employment_status: v as EmployeeInput["employment_status"] });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((s) => {
                    if (s === "terminated" && !roles.isSuperAdmin) return null;
                    return (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection
          title="System Access & Role"
          description="Controls what features this employee can access upon signing in with their work email. Main accounting is strictly restricted to Super Admin."
        >
          <FormGrid>
            <Field
              label="System Access Role"
              hint="Super Admin has full system access including Accounting. Admin has full operational access without Accounting. Sales and Purchase access their specific operational modules."
            >
              <Select value={systemRole} onValueChange={(v) => setSystemRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select system role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">
                    Super Admin (Owner — Full Access + Main Accounting & Finance)
                  </SelectItem>
                  <SelectItem value="admin">
                    Admin (Operations, Sales, Purchase & Workforce — No Accounting)
                  </SelectItem>
                  <SelectItem value="sales">Sales & Field Sales (Sales Only)</SelectItem>
                  <SelectItem value="purchase">Purchase & Procurement (Purchase Only)</SelectItem>
                  <SelectItem value="sales_manager">
                    Sales Manager (Sales & Workforce Management)
                  </SelectItem>
                  <SelectItem value="hr">HR & People Operations</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Skills, KRAs & KPAs"
          description="Define professional skills, Key Result Areas (KRAs) with target weightages, and Key Performance Areas (KPAs) for workforce performance tracking."
        >
          <div className="space-y-6">
            <Field
              label="Skills & Competencies"
              hint="Tag stone fabrication, design, machinery, and management competencies."
            >
              <SkillsInput
                skills={form.skills ?? []}
                onChange={(skills) => setForm({ ...form, skills })}
              />
            </Field>

            <KraKpaBuilder
              kras={form.kras ?? []}
              onKrasChange={(kras) => setForm({ ...form, kras })}
              kpas={form.kpas ?? []}
              onKpasChange={(kpas) => setForm({ ...form, kpas })}
            />
          </div>
        </FormSection>

        <FormSection title="Contact">
          <FormGrid>
            <Field label="Phone">
              <PhoneInput
                value={form.phone ?? ""}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
            </Field>
            <Field label="Email">
              <EmailInput
                value={form.email ?? ""}
                onChange={(v) => setForm({ ...form, email: v })}
              />
            </Field>
            <Field label="Emergency contact">
              <PhoneInput
                value={form.emergency_contact ?? ""}
                onChange={(v) => setForm({ ...form, emergency_contact: v })}
              />
            </Field>
            <Field label="Address">
              <Textarea
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Statutory & payroll" description="Visible only to owners.">
          <FormGrid>
            <Field label="Aadhaar">
              <Input
                value={form.aadhaar ?? ""}
                onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
              />
            </Field>
            <Field label="PAN">
              <PanInput value={form.pan ?? ""} onChange={(v) => setForm({ ...form, pan: v })} />
            </Field>
            <Field label="Salary (CTC)">
              <NumericInput
                value={
                  form.salary_ctc === null || form.salary_ctc === undefined
                    ? ""
                    : String(form.salary_ctc)
                }
                onChange={(v) => setForm({ ...form, salary_ctc: v === "" ? null : Number(v) })}
                min={0}
              />
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Remarks">
          <Textarea
            value={form.remarks ?? ""}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </FormSection>

        <FormActions
          busy={mut.isPending}
          secondary={
            <Button
              type="button"
              variant="ghost"
              onClick={() => nav({ to: "/workforce-intelligence/employees" })}
            >
              Cancel
            </Button>
          }
          primary={
            <Button type="submit" disabled={mut.isPending}>
              {id ? "Save changes" : "Create employee"}
            </Button>
          }
        />
      </FormLayout>
    </>
  );
}
