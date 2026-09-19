"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  hasError?: boolean;
}

/**
 * A password field with a show/hide toggle. Wraps the base Input rather
 * than duplicating its styles, so both stay visually consistent.
 * Text label ("Show"/"Hide") instead of an icon — no icon library has
 * been added to this project yet (see Feature 1 notes).
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-16", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-pressed={visible}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-sm px-2 py-1 text-xs font-medium text-text-muted",
            "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {visible ? "Hide" : "Show"}
          <span className="sr-only"> password</span>
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
