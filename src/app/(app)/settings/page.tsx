import { LogoutButton } from "@/components/auth/LogoutButton";
import { AiConnectionTest } from "@/components/settings/AiConnectionTest";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>

      <Card>
        <p className="text-sm text-text-muted">
          This page is a placeholder created as part of the application
          foundation. Study availability, privacy controls, and account
          deletion have not been built yet.
        </p>
      </Card>

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
