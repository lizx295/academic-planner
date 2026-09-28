import type { ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle text-text-faint">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-85" fill="currentColor" d="M4 12a8 8 0 018-8v2.5a5.5 5.5 0 00-5.5 5.5H4z" />
    </svg>
  );
}