"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Cloud, CloudOff, ExternalLink, RefreshCcw, School, Unplug } from "lucide-react";

import { useCloudSync } from "@/components/providers/CloudSyncProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app";
import type { CanvasSyncPayload } from "@/types";

type SyncResult = CanvasSyncPayload["counts"] & { syncedAt: string };

export function IntegrationsCard() {
  const applyCanvasSync = useAppStore((state) => state.applyCanvasSync);
  const cloud = useCloudSync();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [canvasToken, setCanvasToken] = useState("");
  const [rememberToken, setRememberToken] = useState(true);
  const [canvasConnected, setCanvasConnected] = useState(false);

  async function authHeaders(): Promise<Record<string, string>> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }

  useEffect(() => {
    if (cloud.status === "connecting") return;
    let active = true;
    authHeaders().then(async (headers) => {
      if (!headers.Authorization) return;
      const response = await fetch("/api/canvas/sync", { headers });
      const body = await response.json() as { connected?: boolean };
      if (active && response.ok) setCanvasConnected(body.connected === true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [cloud.status]);

  async function syncCanvas() {
    setSyncing(true);
    setError(null);
    try {
      const shouldAuthenticate = rememberToken || canvasConnected;
      const response = await fetch("/api/canvas/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(shouldAuthenticate ? await authHeaders() : {}),
        },
        body: JSON.stringify({
          canvasToken: canvasToken || undefined,
          remember: rememberToken && cloud.status !== "disabled",
        }),
      });
      const body = (await response.json()) as CanvasSyncPayload | { error?: string };
      if (!response.ok || !("courses" in body)) {
        throw new Error("error" in body && body.error ? body.error : "No se pudo sincronizar con Canvas.");
      }
      applyCanvasSync(body);
      setResult({ ...body.counts, syncedAt: body.syncedAt });
      if (canvasToken && rememberToken && cloud.status !== "disabled") setCanvasConnected(true);
      setCanvasToken("");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "No se pudo sincronizar con Canvas.");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectCanvas() {
    setError(null);
    const response = await fetch("/api/canvas/sync", {
      method: "DELETE",
      headers: await authHeaders(),
    });
    const body = await response.json() as { error?: string };
    if (!response.ok) {
      setError(body.error || "No se pudo eliminar el token guardado.");
      return;
    }
    setCanvasConnected(false);
    setResult(null);
  }

  const cloudLabel = {
    disabled: "Solo local",
    connecting: "Conectando",
    synced: "Sincronizado",
    error: "Error",
  }[cloud.status];

  return (
    <Card className="p-4 sm:p-5">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <School size={16} className="text-text-faint" aria-hidden="true" />
            Canvas ESPOL y nube
          </span>
        }
        description="Importa materias, tareas y notas desde Aula Virtual; Supabase mantiene un respaldo privado en la nube."
        action={<Badge tone={cloud.status === "synced" ? "success" : cloud.status === "error" ? "danger" : "neutral"} dot>{cloudLabel}</Badge>}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-start gap-2.5">
            <School size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">Aula Virtual ESPOL</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                Introduce tu token personal. Se envía por HTTPS y, si eliges guardarlo, se cifra únicamente en el servidor.
              </p>
            </div>
          </div>
          <Input
            className="mt-3"
            type="password"
            autoComplete="off"
            value={canvasToken}
            onChange={(event) => setCanvasToken(event.target.value)}
            placeholder={canvasConnected ? "Token guardado; déjalo vacío para reutilizarlo" : "Token personal de Canvas"}
            aria-label="Token personal de Canvas"
          />
          <label className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-text-muted">
            <input
              type="checkbox"
              className="mt-0.5 accent-[var(--accent)]"
              checked={rememberToken && cloud.status !== "disabled"}
              disabled={cloud.status === "disabled"}
              onChange={(event) => setRememberToken(event.target.checked)}
            />
            {cloud.status === "disabled"
              ? "Conecta Supabase para guardar el token cifrado. Aún puedes usarlo una sola vez."
              : "Guardar cifrado en Supabase para próximas sincronizaciones."}
          </label>
          <Button className="mt-2 w-full" variant="primary" loading={syncing} disabled={!canvasToken && !canvasConnected} onClick={syncCanvas}>
            <RefreshCcw size={15} /> {syncing ? "Sincronizando" : "Sincronizar ahora"}
          </Button>
          {canvasConnected ? (
            <Button className="mt-2 w-full" variant="ghost" onClick={disconnectCanvas}>
              <Unplug size={14} /> Olvidar token guardado
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl border border-border p-3">
          <div className="flex items-start gap-2.5">
            {cloud.status === "disabled" || cloud.status === "error" ? (
              <CloudOff size={17} className="mt-0.5 shrink-0 text-text-faint" aria-hidden="true" />
            ) : (
              <Cloud size={17} className="mt-0.5 shrink-0 text-present" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-medium text-text">Respaldo Supabase</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                {cloud.message || (cloud.lastSyncedAt
                  ? `Último respaldo: ${new Date(cloud.lastSyncedAt).toLocaleString("es-EC")}`
                  : "Preparando el respaldo automático.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {result ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-present/30 bg-present-soft/20 px-3 py-2.5 text-[13px] text-text">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-present" aria-hidden="true" />
          <span>{result.courses} materias, {result.tasks} tareas y {result.grades} notas actualizadas.</span>
        </div>
      ) : null}
      {error ? (
        <div className="mt-3 rounded-xl border border-absent/30 bg-absent-soft/20 px-3 py-2.5 text-[13px] text-absent">
          {error}
        </div>
      ) : null}

      <a
        href="https://aulavirtual.espol.edu.ec/profile/settings"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
      >
        Administrar tokens en Canvas <ExternalLink size={12} aria-hidden="true" />
      </a>
    </Card>
  );
}
