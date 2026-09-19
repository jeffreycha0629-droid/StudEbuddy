"use client";

import { ReactElement, ReactNode, cloneElement, isValidElement, useId } from "react";

export interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/**
 * Wraps a form control with a visible label, optional hint text, a
 * required-state indicator, and a validation error message.
 * DESIGN_SYSTEM.md section 9: never use placeholder text as a label.
 *
 * Usage:
 *   <FormField label="Email" required error={errors.email}>
 *     <Input type="email" name="email" />
 *   </FormField>
 */
export function FormField({ label, required, hint, error, children }: FormFieldProps) {
  const generatedId = useId();
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control =
    isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id: generatedId,
          "aria-describedby": describedBy,
          "aria-required": required || undefined,
          hasError: Boolean(error),
        })
      : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={generatedId} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-error" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {control}

      {hint && !error && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
