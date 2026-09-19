import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

/**
 * Mirrors Input.tsx's hasError pattern exactly. This matters: FormField
 * always injects a hasError prop onto whatever single child it wraps, so
 * any child used inside FormField needs to declare and consume that prop
 * itself rather than letting it leak onto a raw DOM element.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError = false, className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          "min-h-[44px] w-full rounded-sm border bg-surface px-3 py-2 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          hasError ? "border-error" : "border-border",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";
