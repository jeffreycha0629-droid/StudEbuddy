import { Card } from "@/components/ui/Card";

export function UpcomingDeadlinesCard() {
  return (
    <Card title="Upcoming Deadlines">
      <p className="text-sm text-text-muted">
        No assignments yet. Add your first task to start building your
        study plan.
      </p>
    </Card>
  );
}
