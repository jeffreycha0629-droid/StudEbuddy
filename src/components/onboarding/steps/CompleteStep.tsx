"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { completeOnboarding } from "@/lib/actions/onboarding";
import type { Profile } from "@/types/database";

export interface CompleteStepProps {
  initialProfile: Profile | null;
}

/**
 * "When required onboarding information exists" is checked in two
 * places: here, proactively, so the Finish button is disabled with a
 * clear explanation before the user even clicks it; and again,
 * authoritatively, inside completeOnboarding() itself - since a client
 * check alone could be bypassed (e.g. stale props, direct action calls).
 */
export function CompleteStep({ initialProfile }: CompleteStepProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const missingRequiredInfo = !initialProfile?.display_name || !initialProfile?.grade_level;

  async function handleFinish() {
    if (isSubmitting || missingRequiredInfo) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await completeOnboarding();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card title="You're All Set">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Thanks for setting up your profile. You can always update any of
          this later from Settings.
        </p>

        {missingRequiredInfo && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            Please finish your name and grade level before completing
            onboarding.{" "}
            <Link href="/onboarding?step=2" className="font-medium underline">
              Go back
            </Link>
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Link href="/onboarding?step=6" className="flex-1">
            <Button type="button" variant="secondary" className="w-full" disabled={isSubmitting}>
              Back
            </Button>
          </Link>
          <Button
            type="button"
            isLoading={isSubmitting}
            className="flex-1"
            onClick={handleFinish}
            disabled={missingRequiredInfo}
          >
            Finish
          </Button>
        </div>
      </div>
    </Card>
  );
}
