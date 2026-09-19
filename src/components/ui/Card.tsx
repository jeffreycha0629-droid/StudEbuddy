import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: ReactNode;
}

/**
 * Base Card per DESIGN_SYSTEM.md section 10: clear title, concise content,
 * consistent padding, meaningful actions. Avoid nesting cards inside cards.
 */
export function Card({ title, actions, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5 shadow-sm",
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
