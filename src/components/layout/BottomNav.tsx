"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid } from "lucide-react";

import { Dialog } from "@/components/ui/Dialog";
import { MOBILE_MORE_ITEMS, MOBILE_NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Navegación inferior"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-16 items-stretch">
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                  active ? "text-accent" : "text-text-faint hover:text-text-muted",
                )}
              >
                {active ? (
                  <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-b bg-accent" />
                ) : null}
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-text-faint transition-colors hover:text-text-muted"
          >
            <LayoutGrid size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>Más</span>
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="Más secciones" description="Accesos rápidos desde el teléfono." size="sm">
        <ul className="space-y-1">
          {MOBILE_MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-accent-soft text-accent" : "text-text hover:bg-surface-subtle",
                  )}
                >
                  <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </>
  );
}