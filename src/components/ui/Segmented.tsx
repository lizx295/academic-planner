"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[10px] border border-border bg-surface-subtle p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 shrink-0 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors duration-150",
              selected
                ? "bg-surface text-text shadow-xs"
                : "text-text-muted hover:text-text",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
