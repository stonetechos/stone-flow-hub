import { createFileRoute } from "@tanstack/react-router";
import { AccountingGuard } from "@/components/auth/AccountingGuard";
import { PersonalTransfersLedger } from "@/components/finance/PersonalTransfersLedger";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/personal-transfers")({
  ssr: false,
  component: PersonalTransfersPage,
});

function PersonalTransfersPage() {
  const { t } = useTranslation();
  return (
    <AccountingGuard moduleName="Personal Transfers & Ledgers">
      <div className="space-y-6 pb-12">
        <PageHeader
          title={t("personalTransfers.title", "Personal Transfers & Ledgers")}
          subtitle={t(
            "personalTransfers.subtitle",
            "Track capital flows, personal loans, transfers between owners, and running ledgers.",
          )}
        />
        <PersonalTransfersLedger />
      </div>
    </AccountingGuard>
  );
}
