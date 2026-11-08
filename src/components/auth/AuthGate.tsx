"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SessionProvider, type SessionUser } from "@/components/auth/session";
import { Logo } from "@/components/layout/Logo";

function isPublic(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/pair");
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        const next = encodeURIComponent(pathname || "/");
        router.replace(`/login?next=${next}`);
        return;
      }
      const json = (await res.json()) as { user: SessionUser };
      if (json.user?.mustChangePassword) {
        router.replace("/login?change=1");
        setUser(json.user);
        return;
      }
      setUser(json.user);
    } catch {
      setUser(null);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (isPublic(pathname)) {
      setLoading(false);
      return;
    }
    void load();
  }, [pathname, load]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }, [router]);

  if (isPublic(pathname)) return <>{children}</>;

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="glass flex flex-col items-center gap-3 rounded-3xl px-10 py-8">
          <span className="text-accent">
            <Logo size={36} />
          </span>
          <p className="text-sm font-medium text-text-muted">Cargando tu planificador…</p>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-subtle">
            <span className="block h-full w-1/2 animate-pulse rounded-full brand-gradient" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider value={{ user, refresh: load, logout }}>{children}</SessionProvider>
  );
}
