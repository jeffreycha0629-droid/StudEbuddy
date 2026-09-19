import { LogoutButton } from "@/components/auth/LogoutButton";
import { AiConnectionTest } from "@/components/settings/AiConnectionTest";
import { AvailabilityEditor } from "@/components/settings/AvailabilityEditor";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import type { StudyAvailability } from "@/types/database";

/**
 * (app)/layout.tsx already guards this route, but this page fetches its
 * own data independently, consistent with the rest of this codebase.
 */
export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let availability: StudyAvailability[] = [];
  if (user) {
    const { data } = await supabase
      .from("study_availability")
      .select("*")
      .eq("user_id", user.id);
    availability = (data ?? []) as StudyAvailability[];
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>

      <Card>
        <p className="text-sm text-text-muted">
          Privacy controls and account deletion have not been built yet.
        </p>
      </Card>

      <AvailabilityEditor initialAvailability={availability} />

      <Card title="Account">
        <p className="mb-4 text-sm text-text-muted">
          Log out of StudEbuddy on this device.
        </p>
        <LogoutButton />
      </Card>

      <AiConnectionTest />
    </div>
  );
}
