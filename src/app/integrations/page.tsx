"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cable,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldShell, Input } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

interface IntegrationInfo {
  status?: string;
  lastSyncAt?: string | null;
  lastError?: string | null;
  username?: string;
  siteName?: string;
  error?: string;
}

interface Integrations {
  aulavirtual?: IntegrationInfo;
}

function fmt(value: string | null | undefined): string {
  if (!value) return "Aún no se sincroniza";
  try {
    return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function StatusPill({ status }: { status?: string }) {
  const value = status ?? "disconnected";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        value === "connected" && "bg-present-soft text-present",
        value === "warning" && "bg-pending-soft text-pending",
        value === "error" && "bg-absent-soft text-absent",
        value === "disconnected" && "bg-surface-subtle text-text-faint",
      )}
    >
      {value === "connected"
        ? "Conectado"
        : value === "warning"
          ? "Con avisos"
          : value === "error"
            ? "Con error"
            : "Sin conectar"}
    </span>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integrations>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        integrations?: Integrations;
        error?: string;
      };
      if (!res.ok) {
        setNotice({ kind: "error", text: json.error ?? "No se pudieron cargar las integraciones." });
        return;
      }
      setIntegrations(json.integrations ?? {});
    } catch {
      setNotice({ kind: "error", text: "No hay conexión con el servidor." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const call = useCallback(
    async (
      url: string,
      body: Record<string, unknown> | null,
      method: "POST" | "DELETE",
      key: string,
    ) => {
      setBusy(key);
      setNotice(null);
      try {
        const res = await fetch(url, {
          method,
          headers: body ? { "content-type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
          error?: string;
        };
        if (!res.ok) {
          setNotice({ kind: "error", text: json.error ?? "La operación falló." });
          return null;
        }
        return json;
      } catch {
        setNotice({ kind: "error", text: "No hay conexión con el servidor." });
        return null;
      } finally {
        setBusy(null);
        await load();
      }
    },
    [load],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integraciones"
        subtitle="Conecta tu Aula Virtual ESPOL. Las credenciales se guardan cifradas."
        action={
          <Button variant="secondary" onClick={() => void load()} loading={loading}>
            <RefreshCw size={15} aria-hidden="true" /> Actualizar
          </Button>
        }
      />

      {notice ? (
        <p
          role="alert"
          className={cn(
            "rounded-xl border border-border px-3 py-2 text-[13px] font-medium",
            notice.kind === "ok" ? "bg-present-soft text-present" : "bg-absent-soft text-absent",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      <MoodleCard
        info={integrations.aulavirtual ?? {}}
        busy={busy}
        onConnect={(username, password) =>
          call(
            "/api/integrations/aulavirtual",
            { action: "connect", username, password },
            "POST",
            "moodle-connect",
          )
        }
        onAction={(action) =>
          call("/api/integrations/aulavirtual", { action }, "POST", `moodle-${action}`)
        }
        onDisconnect={() =>
          call("/api/integrations/aulavirtual", null, "DELETE", "moodle-disconnect")
        }
        onNotice={setNotice}
      />

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Cable size={16} aria-hidden="true" className="text-accent" /> Cómo funciona
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-subtle/50 p-3 text-[12px] leading-relaxed text-text-muted">
            <p className="font-semibold text-text">Aula Virtual</p>
            <p className="mt-1">
              Se conecta por los servicios web móviles de Moodle con tu propio usuario. Importa
              cursos, fechas, notas y anuncios.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-subtle/50 p-3 text-[12px] leading-relaxed text-text-muted">
            <p className="font-semibold text-text">Privacidad</p>
            <p className="mt-1">
              Tus credenciales viajan una vez y se guardan cifradas (AES-256-GCM) en la base de
              datos. Puedes desconectar cuando quieras.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MoodleCard({
  info,
  busy,
  onConnect,
  onAction,
  onDisconnect,
  onNotice,
}: {
  info: IntegrationInfo;
  busy: string | null;
  onConnect: (username: string, password: string) => Promise<Record<string, unknown> | null>;
  onAction: (action: "sync" | "test") => Promise<Record<string, unknown> | null>;
  onDisconnect: () => Promise<Record<string, unknown> | null>;
  onNotice: (notice: { kind: "ok" | "error"; text: string } | null) => void;
}) {
  const connected = info.status === "connected" || info.status === "warning";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await onConnect(username.trim(), password);
    if (result) {
      setUsername("");
      setPassword("");
      onNotice({ kind: "ok", text: "Aula Virtual conectada correctamente." });
    }
  };

  const run = async (action: "sync" | "test") => {
    const result = await onAction(action);
    if (!result) return;
    if (action === "sync") {
      onNotice({
        kind: "ok",
        text: `Aula Virtual: ${result.coursesCreated ?? 0} materia(s), ${result.tasksCreated ?? 0} tarea(s), ${result.assessmentsCreated ?? 0} evaluación(es) y ${result.announcementsCreated ?? 0} anuncio(s).`,
      });
    } else {
      onNotice({ kind: "ok", text: "Conexión con el Aula Virtual verificada." });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <GraduationCap size={16} aria-hidden="true" className="text-accent-2" /> Aula Virtual ESPOL
          </h2>
          <p className="mt-0.5 text-[13px] text-text-muted">
            Actividades, notas y anuncios de Moodle como notificaciones.
          </p>
        </div>
        <StatusPill status={info.status} />
      </div>

      {connected ? (
        <div className="mt-4 space-y-3">
          <dl className="space-y-1.5 rounded-xl border border-border bg-surface-subtle/50 p-3 text-[12px]">
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">Usuario</dt>
              <dd className="truncate font-medium text-text">{info.username || "Conectado"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">Portal</dt>
              <dd className="truncate text-text">{info.siteName || "Aula Virtual ESPOL"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">Última sincronización</dt>
              <dd className="text-text">{fmt(info.lastSyncAt)}</dd>
            </div>
          </dl>

          {info.lastError ? (
            <p className="rounded-lg bg-pending-soft px-2.5 py-2 text-[11px] leading-relaxed text-pending">
              {info.lastError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="primary"
              size="sm"
              loading={busy === "moodle-sync"}
              onClick={() => void run("sync")}
            >
              <RefreshCw size={13} aria-hidden="true" /> Sincronizar ahora
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={busy === "moodle-test"}
              onClick={() => void run("test")}
            >
              <ShieldCheck size={13} aria-hidden="true" /> Probar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-absent hover:bg-absent-soft"
              loading={busy === "moodle-disconnect"}
              onClick={() => void onDisconnect()}
            >
              <Unplug size={13} aria-hidden="true" /> Desconectar
            </Button>
          </div>
          <p className="rounded-lg bg-surface-subtle/60 px-2.5 py-2 text-[11px] leading-relaxed text-text-faint">
            Consejo: crea un atajo de iOS o una automatización de Android que abra esta app y pulse
            “Sincronizar” una vez al día; o programa el cron de recordatorios en Vercel.
          </p>
        </div>
      ) : (
        <form onSubmit={connect} className="mt-4 space-y-3">
          <FieldShell
            label="Usuario del Aula Virtual"
            htmlFor="moodle-user"
            helper="El mismo usuario con el que entras a aulavirtual.espol.edu.ec."
          >
            <Input
              id="moodle-user"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tu.usuario"
              autoComplete="username"
            />
          </FieldShell>
          <FieldShell label="Contraseña" htmlFor="moodle-password">
            <Input
              id="moodle-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña del Aula Virtual"
              autoComplete="current-password"
            />
          </FieldShell>
          <Button type="submit" variant="primary" loading={busy === "moodle-connect"}>
            <CheckCircle2 size={14} aria-hidden="true" /> Conectar Aula Virtual
          </Button>
          <p className="text-[11px] leading-relaxed text-text-faint">
            Se usan los servicios web oficiales de Moodle. Si la universidad los deshabilita, la app
            te mostrará el error exacto.
          </p>
        </form>
      )}
    </Card>
  );
}
