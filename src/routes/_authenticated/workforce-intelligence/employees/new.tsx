/**
 * Employee — create / edit. Owner-only. Uses FormLayout primitives.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  createEmployee,
  updateEmployee,
  getEmployee,
  listDesignations,
  listEmployees,
} from "@/lib/workforce/api";
import type { EmployeeInput } from "@/lib/workforce/schema";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES } from "@/lib/workforce/types";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/employees/new")({
  head: () => ({ meta: [{ title: "New employee" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || undefined }),
  component: EmployeeFormPage,
});

function empty(): EmployeeInput {
  return {
    full_name: "",
    designation_id: null,
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
  const canWrite = roles.isAdmin || roles.isSalesManager;

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

  // Load existing into state on first fetch
  if (id && existing.data && form.full_name === "" && !existing.isFetching) {
    const e = existing.data;
    setForm({
      full_name: e.full_name,
      designation_id: e.designation_id,
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
      bank_details: (e.bank_details as Record<string, unknown>) ?? {},
      salary_ctc: e.salary_ctc,
      skills: e.skills ?? [],
      employment_status: e.employment_status,
      photo_url: e.photo_url ?? "",
      remarks: e.remarks ?? "",
      user_id: e.user_id,
    });
  }

  const mut = useMutation({
    mutationFn: (v: EmployeeInput) => (id ? updateEmployee(id, v) : createEmployee(v)),
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
    mut.mutate(form);
  }

  if (!canWrite) {
    return (
      <>
        <PageHeader title="Not authorized" subtitle="Only owners can edit employee records." />
      </>
    );
  }

  return (
    <>
      <PageHeader title={id ? "Edit employee" : "New employee"} eyebrow="Workforce Intelligence" />
      <FormLayout onSubmit={submit} busy={mut.isPending}>
        <FormSection title="Basic information">
          <FormGrid>
            <Field label="Full name" required>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="Designation">
              <Select
                value={form.designation_id ?? ""}
                onValueChange={(v) => setForm({ ...form, designation_id: v || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(designations.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                onValueChange={(v) =>
                  setForm({ ...form, employment_status: v as EmployeeInput["employment_status"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Contact">
          <FormGrid>
            <Field label="Phone">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Emergency contact">
              <Input
                value={form.emergency_contact ?? ""}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
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
              <Input
                value={form.pan ?? ""}
                onChange={(e) => setForm({ ...form, pan: e.target.value })}
              />
            </Field>
            <Field label="Salary (CTC)">
              <Input
                type="number"
                value={form.salary_ctc ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    salary_ctc: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Skills (comma-separated)">
              <Input
                value={(form.skills ?? []).join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    skills: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
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
