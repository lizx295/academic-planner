"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "bg-accent" : "bg-border-strong",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}