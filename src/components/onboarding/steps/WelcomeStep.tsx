import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function WelcomeStep() {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome to StudEbuddy
        </h1>
        <p className="text-sm text-text-muted">
          Let&apos;s get your account set up. This only takes a couple of
          minutes, and you can change any of this later in Settings.
        </p>
        <Link href="/onboarding?step=2">
          <Button variant="primary" className="w-full">
            Get Started
          </Button>
        </Link>
      </div>
    </Card>
  );
}
