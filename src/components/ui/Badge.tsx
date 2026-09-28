import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-surface-subtle text-text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-present-soft text-present",
  warning: "bg-pending-soft text-pending",
  danger: "bg-absent-soft text-absent",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  outline: "border border-border-strong text-text-muted bg-transparent",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        TONE[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full bg-current")} />
      ) : null}
      {children}
    </span>
  );
}

/** Par de icono + texto consistente para estados. */
export function StatusPill({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", className)}>
      {icon ? <span className="text-[15px] opacity-80" aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}