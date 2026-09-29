"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  Info,
  Moon,
  SquareCheck,
  Sun,
  UserCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { applyThemeClass, useResolvedDark, useTheme } from "@/hooks/useTheme";
import { fmtRelativeIn } from "@/lib/format";
import { pageTitleFor } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import type { NotificationKind } from "@/types";

const NOTIFICATION_ICON: Record<NotificationKind, typeof Bell> = {
  class_reminder: Bell,
  class_ended: CalendarCheck,
  attendance_confirm: UserCheck,
  task_due: SquareCheck,
  assessment_soon: CalendarClock,
  system: Info,
};

function NotificationBell() {
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAll = useAppStore((s) => s.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <IconButton
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative"
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-absent px-0.5 text-[9px] font-bold leading-none text-white"
          >
            {unread}
          </span>
        ) : null}
      </IconButton>

      {open ? (
        <div
          role="dialog"
          aria-label="Panel de notificaciones"
          className="fade-up absolute right-0 top-full z-50 mt-2 w-[min(92vw,380px)] scale-in overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/10"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">Notificaciones</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="text-xs font-medium text-accent hover:underline"
              >
                Marcar todas como leídas
              </button>
            ) : null}
          </div>
          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Sin notificaciones" description="Aquí aparecerán recordatorios de clases, tareas y exámenes." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => {
                  const Icon = NOTIFICATION_ICON[n.kind];
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle",
                          !n.read && "bg-accent-soft/40",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            n.read ? "bg-surface-subtle text-text-faint" : "bg-accent-soft text-accent",
                          )}
                        >
                          <Icon size={15} strokeWidth={2} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-text">{n.title}</span>
                            {!n.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> : null}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">{n.body}</span>
                          <span className="mt-1 block text-[11px] text-text-faint">
                            {fmtRelativeIn(new Date(n.createdAt))}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = useResolvedDark(theme);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    setTheme(next);
    applyThemeClass(next);
  };
  return (
    <IconButton aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} onClick={toggle}>
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </IconButton>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const semesters = useAppStore((s) => s.semesters);
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);
  const setActiveSemester = useAppStore((s) => s.setActiveSemester);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Marca en móvil (en desktop el título lo proporciona el sidebar) */}
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <span className="text-accent">
            <Logo size={22} />
          </span>
          <p className="truncate text-[15px] font-semibold tracking-tight text-text">
            Academic Planner
          </p>
        </div>
        <p className="hidden truncate text-[15px] font-semibold tracking-tight text-text lg:block">
          {pageTitleFor(pathname)}
        </p>

        <div className="flex items-center gap-1.5">
          <label className="hidden items-center gap-2 sm:flex">
            <span className="sr-only">Semestre activo</span>
            <select
              value={activeSemesterId}
              onChange={(e) => setActiveSemester(e.target.value)}
              className="h-8 rounded-lg border border-border bg-surface px-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-surface-subtle focus:border-accent focus:outline-none"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  Semestre {s.label}
                </option>
              ))}
            </select>
          </label>
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
