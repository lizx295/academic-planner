import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ProgressTone = "solid" | "accent" | "success" | "warning" | "danger";

const FILL: Record<ProgressTone, string> = {
  solid: "bg-text",
  accent: "bg-accent",
  success: "bg-present",
  warning: "bg-pending",
  danger: "bg-absent",
};

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0 - 100
  tone?: ProgressTone;
  /** Muestra la barra con un ancho alto (para banners). */
  large?: boolean;
}

export function Progress({ value, tone = "accent", large, className, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn(
        "w-full overflow-hidden rounded-full bg-surface-subtle",
        large ? "h-2" : "h-1.5",
        className,
      )}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", FILL[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}