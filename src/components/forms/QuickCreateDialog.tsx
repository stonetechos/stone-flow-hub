/**
 * <QuickCreateDialog> — Inline create for customer/vendor/project/product from any picker.
 *
 * Uses the same Quick Fill fields as the full-page form (essentials only) so a
 * user never leaves the parent form. Runs the canonical create* mutation and
 * fires the centralized cache-invalidation helper so the new row shows up
 * everywhere without a page refresh.
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuickForm } from "./QuickForm";
import { Field } from "./Field";
import { toUserMessage } from "@/lib/errors";
import {
  invalidateCustomer,
  invalidateVendor,
  invalidateProject,
  invalidateProduct,
  seedPickerCache,
} from "@/lib/query-invalidation";
import { createCustomer } from "@/lib/customers/api";
import { customerCreateSchema, CUSTOMER_TYPES } from "@/lib/customers/schema";
import { createVendor } from "@/lib/vendors/api";
import { vendorCreateSchema } from "@/lib/vendors/schema";
import { createProject, listProjectsForPicker } from "@/lib/projects/api";
import { projectCreateSchema, PROJECT_TYPES } from "@/lib/projects/schema";
import { createProduct } from "@/lib/products/api";
import { productCreateSchema, STONE_TYPES } from "@/lib/products/schema";
import { EntityPicker } from "./EntityPicker";
import type { EntityType } from "./EntityPicker";

interface QuickCreateDialogProps {
  type: EntityType;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialName?: string;
  defaults?: Record<string, unknown>;
  onCreated: (row: any) => void;
}

export function QuickCreateDialog(props: QuickCreateDialogProps) {
  if (!props.open) return null;
  switch (props.type) {
    case "customer":
      return <QuickCreateCustomer {...props} />;
    case "vendor":
      return <QuickCreateVendor {...props} />;
    case "project":
      return <QuickCreateProject {...props} />;
    case "product":
      return <QuickCreateProduct {...props} />;
  }
}

function QuickCreateCustomer({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: QuickCreateDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initialName ?? "",
    mobile: "",
    email: "",
    city: "",
    customer_type: "individual" as const,
  });
  useEffect(() => {
    if (open) setForm((f) => ({ ...f, name: initialName ?? f.name }));
  }, [open, initialName]);

  const mut = useMutation({
    mutationFn: () => {
      const parsed = customerCreateSchema.parse(form);
      return createCustomer(parsed);
    },
    onSuccess: (row) => {
      toast.success(`Customer ${row.customer_code} created`);
      seedPickerCache(qc, "customer", row);
      invalidateCustomer(qc, row.id);
      onCreated(row);
      onOpenChange(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          busy={mut.isPending}
        >
          <QuickForm.QuickFill>
            <Field label="Customer name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Mobile" required hint="10 digits, +91 optional">
              <Input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
            <Field label="Type" className="md:col-span-2">
              <Select
                value={form.customer_type}
                onValueChange={(v) => setForm({ ...form, customer_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </QuickForm.QuickFill>
          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

function QuickCreateVendor({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: QuickCreateDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    company_name: initialName ?? "",
    contact_name: "",
    mobile: "",
    email: "",
    city: "",
  });
  useEffect(() => {
    if (open) setForm((f) => ({ ...f, company_name: initialName ?? f.company_name }));
  }, [open, initialName]);

  const mut = useMutation({
    mutationFn: () => {
      const parsed = vendorCreateSchema.parse(form);
      return createVendor(parsed);
    },
    onSuccess: (row) => {
      toast.success(`Vendor ${row.vendor_code} created`);
      seedPickerCache(qc, "vendor", row);
      invalidateVendor(qc, row.id);
      onCreated(row);
      onOpenChange(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New vendor</DialogTitle>
        </DialogHeader>
        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          busy={mut.isPending}
        >
          <QuickForm.QuickFill>
            <Field label="Company" required>
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Contact person" required>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Mobile" required>
              <Input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="City" className="md:col-span-2">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
          </QuickForm.QuickFill>
          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

function QuickCreateProject({
  open,
  onOpenChange,
  initialName,
  defaults,
  onCreated,
}: QuickCreateDialogProps) {
  const qc = useQueryClient();
  const defaultCustomer = (defaults?.customer_id as string | undefined) ?? "";
  const [form, setForm] = useState({
    customer_id: defaultCustomer,
    name: initialName ?? "",
    city: "",
    project_type: "residential" as const,
  });
  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        name: initialName ?? f.name,
        customer_id: defaultCustomer || f.customer_id,
      }));
    }
  }, [open, initialName, defaultCustomer]);

  const mut = useMutation({
    mutationFn: () => {
      const parsed = projectCreateSchema.parse(form);
      return createProject(parsed);
    },
    onSuccess: (row) => {
      toast.success(`Project ${row.project_code} created`);
      seedPickerCache(qc, "project", row);
      invalidateProject(qc, row.id);
      onCreated(row);
      onOpenChange(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          busy={mut.isPending}
        >
          <QuickForm.QuickFill>
            <Field label="Customer" required className="md:col-span-2">
              <EntityPicker
                type="customer"
                value={form.customer_id || null}
                onChange={(id) => setForm({ ...form, customer_id: id ?? "" })}
              />
            </Field>
            <Field label="Project name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="City" required>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </Field>
            <Field label="Type" className="md:col-span-2">
              <Select
                value={form.project_type}
                onValueChange={(v) => setForm({ ...form, project_type: v as any })}
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
          </QuickForm.QuickFill>
          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending || !form.customer_id}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

function QuickCreateProduct({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: QuickCreateDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initialName ?? "",
    stone_type: "marble" as const,
  });
  useEffect(() => {
    if (open) setForm((f) => ({ ...f, name: initialName ?? f.name }));
  }, [open, initialName]);

  const mut = useMutation({
    mutationFn: () => {
      const parsed = productCreateSchema.parse(form);
      return createProduct(parsed);
    },
    onSuccess: (row) => {
      toast.success(`Product ${row.product_code} created`);
      seedPickerCache(qc, "product", row);
      invalidateProduct(qc, row.id);
      onCreated(row);
      onOpenChange(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
        </DialogHeader>
        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          busy={mut.isPending}
        >
          <QuickForm.QuickFill>
            <Field label="Product name" required className="md:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Stone type" className="md:col-span-2">
              <Select
                value={form.stone_type}
                onValueChange={(v) => setForm({ ...form, stone_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STONE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </QuickForm.QuickFill>
          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

// Silence unused-import lint for helpers held for future variants.
void useQuery;
void listProjectsForPicker;
