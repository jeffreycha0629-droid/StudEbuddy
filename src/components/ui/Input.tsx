import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

/**
 * Base Input. Per DESIGN_SYSTEM.md section 9, every field needs a visible
 * label and error message — those are provided by wrapping this in
 * <FormField>, not by this component alone. Never rely on placeholder
 * text as a substitute for a real label.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          "min-h-[44px] w-full rounded-sm border bg-surface px-3 py-2 text-sm text-foreground",
          "placeholder:text-text-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          hasError ? "border-error" : "border-border",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
