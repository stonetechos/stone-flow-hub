import { createFileRoute } from "@tanstack/react-router";
import { MasterListPage } from "@/components/masters/MasterListPage";
import { masterByRoute } from "@/lib/masters/config";

export const Route = createFileRoute("/_authenticated/masters/quality-grades")({
  component: () => {
    const cfg = masterByRoute("quality-grades");
    if (!cfg) return null;
    return <MasterListPage config={cfg} />;
  },
});
