import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

/**
 * Mirrors Input.tsx and Select.tsx's hasError pattern exactly, for the
 * same reason: FormField always injects a hasError prop onto whatever
 * single child it wraps, so anything used inside FormField needs to
 * declare and consume that prop itself.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          "w-full rounded-sm border bg-surface px-3 py-2 text-sm text-foreground",
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

Textarea.displayName = "Textarea";
