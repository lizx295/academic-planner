"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { NAV_SECTIONS, SETTINGS_ITEM } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";

function NavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof SETTINGS_ITEM.icon;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "bg-accent-soft text-accent"
          : "text-text-muted hover:bg-surface-subtle hover:text-text",
      )}
    >
      <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
      <span>{label}</span>
      {active ? (
        <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
      ) : null}
    </Link>
  );
}

export function Sidebar() {
  const profile = useAppStore((s) => s.profile);
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);
  const semester = useAppStore((s) =>
    s.semesters.find((sem) => sem.id === activeSemesterId),
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <span className="text-accent">
          <Logo size={26} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-text">
            Academic Planner
          </p>
          <p className="truncate text-xs text-text-faint">
            {semester ? `Semestre ${semester.label}` : "Sin semestre activo"}
          </p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <NavLink href={SETTINGS_ITEM.href} label={SETTINGS_ITEM.label} icon={SETTINGS_ITEM.icon} />
        {profile.name ? (
          <div className="mt-2 flex items-center gap-2.5 rounded-[10px] px-3 py-2">
            <Avatar name={profile.name} color={profile.avatarColor} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-text">{profile.name}</p>
              <p className="truncate text-xs text-text-faint">{profile.program || "Estudiante"}</p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}