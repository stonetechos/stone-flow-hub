import { createFileRoute } from "@tanstack/react-router";
import { MasterListPage } from "@/components/masters/MasterListPage";
import { masterByRoute } from "@/lib/masters/config";

export const Route = createFileRoute("/_authenticated/masters/uoms")({
  component: () => {
    const cfg = masterByRoute("uoms");
    if (!cfg) return null;
    return <MasterListPage config={cfg} />;
  },
});
