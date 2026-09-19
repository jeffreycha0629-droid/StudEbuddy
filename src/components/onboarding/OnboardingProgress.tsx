export interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_LABELS = [
  "Welcome",
  "Basic Info",
  "Subjects",
  "Goals",
  "Preferences",
  "Availability",
  "Complete",
];

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const percent = Math.round((currentStep / totalSteps) * 100);
  const label = STEP_LABELS[currentStep - 1] ?? "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-medium text-text-muted">
        <span>
          Step {currentStep} of {totalSteps}: {label}
        </span>
        <span>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label="Onboarding progress"
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
