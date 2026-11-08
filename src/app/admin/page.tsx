"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { useSession } from "@/components/auth/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FieldShell, Input, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "student";
  mustChangePassword: boolean;
  tempPassword: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("es-EC", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* portapapeles bloqueado */
        }
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-subtle"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function TempPasswordBox({ email, password }: { email: string; password: string }) {
  return (
    <div className="rounded-xl border border-border bg-accent-2-soft/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-2">
        Contraseña temporal
      </p>
      <p className="mt-1 text-[13px] text-text-muted">
        Compártela con <span className="font-medium text-text">{email}</span>. Solo será visible
        hasta que la persona cree la suya.
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2">
        <code className="font-mono text-sm font-semibold tracking-wide text-text">{password}</code>
        <CopyButton value={password} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [revealed, setRevealed] = useState<{ email: string; password: string } | null>(null);

  const isAdmin = user.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        users?: AdminUser[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "No se pudieron cargar las cuentas.");
        return;
      }
      setUsers(json.users ?? []);
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      pending: users.filter((u) => u.mustChangePassword).length,
    }),
    [users],
  );

  const createUser = async (input: { name: string; email: string; role: "admin" | "student" }) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => ({}))) as {
      user?: AdminUser;
      tempPassword?: string;
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "No se pudo crear la cuenta.");
    setCreateOpen(false);
    if (json.tempPassword && json.user) {
      setRevealed({ email: json.user.email, password: json.tempPassword });
    }
    await load();
  };

  const resetPassword = async (target: AdminUser) => {
    const res = await fetch(`/api/admin/users/${target.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset-password" }),
    });
    const json = (await res.json().catch(() => ({}))) as { tempPassword?: string; error?: string };
    if (!res.ok || !json.tempPassword) {
      setError(json.error ?? "No se pudo restablecer la contraseña.");
      return;
    }
    setRevealed({ email: target.email, password: json.tempPassword });
    await load();
  };

  const setRole = async (target: AdminUser, role: "admin" | "student") => {
    const res = await fetch(`/api/admin/users/${target.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set-role", role }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo cambiar el rol.");
      return;
    }
    await load();
  };

  const removeUser = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo eliminar la cuenta.");
    }
    setDeleteTarget(null);
    await load();
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheck size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-text">Solo administradores</h1>
        <p className="mt-1 text-sm text-text-muted">
          Esta sección gestiona las cuentas institucionales. Pide acceso al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración"
        subtitle="Crea cuentas institucionales y entrega contraseñas temporales."
        action={
          <>
            <Button variant="secondary" onClick={() => void load()} loading={loading}>
              <RefreshCw size={15} aria-hidden="true" /> Actualizar
            </Button>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <UserPlus size={15} aria-hidden="true" /> Nueva cuenta
            </Button>
          </>
        }
      />

      {revealed ? (
        <Card className="p-4">
          <TempPasswordBox email={revealed.email} password={revealed.password} />
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setRevealed(null)}>
              Ocultar
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Cuentas", value: stats.total, icon: Users },
          { label: "Administradores", value: stats.admins, icon: ShieldCheck },
          { label: "Con clave temporal", value: stats.pending, icon: KeyRound },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xl font-semibold tabular text-text">{item.value}</p>
                <p className="text-[12px] text-text-muted">{item.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Cuentas institucionales</h2>
          <p className="text-[12px] text-text-muted">
            La contraseña temporal se oculta automáticamente cuando la persona crea la suya.
          </p>
        </div>

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-subtle">
              <span className="block h-full w-1/2 animate-pulse rounded-full brand-gradient" />
            </span>
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-text-muted">
            Aún no hay cuentas. Crea la primera con “Nueva cuenta”.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-text">
                      <span className="truncate">{item.name || item.email.split("@")[0]}</span>
                      {item.role === "admin" ? (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          Admin
                        </span>
                      ) : null}
                      {item.mustChangePassword ? (
                        <span className="rounded-full bg-pending-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pending">
                          Clave temporal
                        </span>
                      ) : (
                        <span className="rounded-full bg-present-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-present">
                          Contraseña propia
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-text-muted">{item.email}</p>
                    <p className="mt-1 text-[11px] text-text-faint">
                      Creada {fmtDate(item.createdAt)} · Último acceso {fmtDate(item.lastLoginAt)}
                    </p>
                    {item.mustChangePassword && item.tempPassword ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-subtle/70 px-2.5 py-1.5">
                        <span className="text-[11px] font-medium text-text-muted">Temporal:</span>
                        <code className="font-mono text-[12px] font-semibold text-text">
                          {item.tempPassword}
                        </code>
                        <CopyButton value={item.tempPassword} />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Select
                      aria-label={`Rol de ${item.email}`}
                      value={item.role}
                      onChange={(e) => void setRole(item, e.target.value as "admin" | "student")}
                      disabled={item.id === user.id}
                      className="h-8 w-auto text-[12px]"
                    >
                      <option value="student">Estudiante</option>
                      <option value="admin">Administrador</option>
                    </Select>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void resetPassword(item)}
                      title="Generar una nueva contraseña temporal"
                    >
                      <KeyRound size={13} aria-hidden="true" /> Restablecer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(item)}
                      disabled={item.id === user.id}
                      className="text-absent hover:bg-absent-soft"
                      title="Eliminar cuenta"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createUser} />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar cuenta"
        description={
          deleteTarget
            ? `Se borrarán los datos, sesiones e integraciones de ${deleteTarget.email}. Esta acción no se puede deshacer.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void removeUser()}>
              Eliminar definitivamente
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          ¿Confirmas que quieres eliminar{" "}
          <span className="font-medium text-text">{deleteTarget?.name || deleteTarget?.email}</span>?
        </p>
      </Dialog>
    </div>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; email: string; role: "admin" | "student" }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "student">("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setRole("student");
      setError(null);
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onCreate({ name, email, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nueva cuenta institucional"
      description="Se generará una contraseña temporal que podrás ver hasta que la persona la cambie."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="create-user-form" variant="primary" loading={loading}>
            Crear cuenta
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={submit} className="space-y-4">
        <FieldShell label="Nombre completo" htmlFor="new-name">
          <Input
            id="new-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ana Torres"
          />
        </FieldShell>
        <FieldShell label="Correo institucional" htmlFor="new-email" helper="Debe terminar en @espol.edu.ec.">
          <Input
            id="new-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana.torres@espol.edu.ec"
          />
        </FieldShell>
        <FieldShell label="Rol" htmlFor="new-role">
          <Select
            id="new-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "student")}
          >
            <option value="student">Estudiante</option>
            <option value="admin">Administrador</option>
          </Select>
        </FieldShell>
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
