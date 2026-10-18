import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeePaymentsManagementView } from "@/components/hr/EmployeePaymentsManagementView";

export const Route = createFileRoute("/_authenticated/hr/payments")({
  head: () => ({
    meta: [
      { title: "Employee Payments & Advances — Human Resources" },
      {
        name: "description",
        content:
          "Record intermediate employee payments, advances, and view month-end salary balances due.",
      },
    ],
  }),
  component: EmployeePaymentsPage,
});

function EmployeePaymentsPage() {
  return (
    <>
      <PageHeader
        title="Employee Payments & Advances"
        subtitle="Record intermediate salary payments, advances, and track how much net salary needs to be paid after the month ends."
        eyebrow="HR Operations"
      />

      <EmployeePaymentsManagementView />
    </>
  );
}
