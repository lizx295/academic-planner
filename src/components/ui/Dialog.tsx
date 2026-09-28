"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/Button";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Ancho. "sm" para formularios pequeños, "md" por defecto, "lg" para calendario. */
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({ open, onClose, title, description, size = "md", children, footer }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    const t = window.setTimeout(() => panelRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(t);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-desc" : undefined}
    >
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[92dvh] w-full overflow-y-auto scale-in rounded-t-2xl border border-border bg-surface p-5 shadow-xl shadow-black/10 outline-none sm:rounded-2xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p id="dialog-title" className="text-base font-semibold tracking-tight text-text">
              {title}
            </p>
            {description ? (
              <p id="dialog-desc" className="mt-1 text-[13px] leading-relaxed text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </IconButton>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-5 flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}