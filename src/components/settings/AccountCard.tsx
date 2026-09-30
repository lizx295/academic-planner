"use client";

import { Cloud, Laptop, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

export function AccountCard() {
  const auth = useAuth();
  const router = useRouter();
  const email = auth.user?.email ?? auth.localSession?.email ?? "Sesión local";
  const name = String(auth.user?.user_metadata?.display_name ?? auth.localSession?.name ?? "Estudiante");

  async function logout() {
    await auth.signOut();
    router.replace("/login");
  }

  return (
    <Card className="p-4 sm:p-5">
      <CardHeader
        title={<span className="flex items-center gap-2"><UserRound size={16} className="text-text-faint" /> Cuenta</span>}
        description="La identidad se usa para sincronizar datos y notificaciones entre dispositivos."
        action={<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${auth.status === "authenticated" ? "bg-present-soft text-present" : "bg-surface-subtle text-text-muted"}`}>{auth.status === "authenticated" ? <Cloud size={12} /> : <Laptop size={12} />}{auth.status === "authenticated" ? "Nube" : "Local"}</span>}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="text-sm font-medium text-text">{name}</p>
          <p className="mt-0.5 text-xs text-text-faint">{email}</p>
        </div>
        <Button variant="outline" onClick={() => void logout()}><LogOut size={15} /> Cerrar sesión</Button>
      </div>
    </Card>
  );
}
