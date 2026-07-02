import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { TasksPanel } from "@/components/entity/TasksPanel";

export const Route = createFileRoute("/_authenticated/tasks")({
  ssr: false,
  component: TasksPage,
});

function TasksPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        subtitle="Every task across every entity. Add general tasks or filter by status."
      />
      <TasksPanel title="All tasks" />
    </div>
  );
}
