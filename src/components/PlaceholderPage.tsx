import { Card } from "@/components/ui/Card";

export interface PlaceholderPageProps {
  title: string;
  description: string;
}

/**
 * Used by routes that exist as navigable pages in this foundation feature
 * but don't have real functionality yet. This is intentionally NOT fake
 * data — it clearly states that the feature isn't built, per CLAUDE.md
 * section 4 ("No Fake Functionality") and DESIGN_SYSTEM.md section 13
 * (helpful empty states, not "No data").
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <Card>
        <p className="text-sm text-text-muted">{description}</p>
        <p className="mt-2 text-sm text-text-muted">
          This page is a placeholder created as part of the application foundation.
          Its real functionality has not been built yet.
        </p>
      </Card>
    </div>
  );
}
