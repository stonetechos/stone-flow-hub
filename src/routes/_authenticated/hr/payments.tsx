import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        title={t("hr.employeePaymentsTitle", "Employee Payments & Advances")}
        subtitle={t(
          "hr.employeePaymentsSubtitle",
          "Record intermediate salary payments, advances, and track how much net salary needs to be paid after the month ends.",
        )}
        eyebrow={t("hr.hrOperations", "HR Operations")}
      />

      <EmployeePaymentsManagementView />
    </>
  );
}
