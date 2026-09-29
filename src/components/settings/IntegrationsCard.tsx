"use client";

import { useState } from "react";
import { CheckCircle2, Cloud, CloudOff, ExternalLink, RefreshCcw, School } from "lucide-react";

import { useCloudSync } from "@/components/providers/CloudSyncProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { useAppStore } from "@/store/app";
import type { CanvasSyncPayload } from "@/types";

type SyncResult = CanvasSyncPayload["counts"] & { syncedAt: string };

export function IntegrationsCard() {
  const applyCanvasSync = useAppStore((state) => state.applyCanvasSync);
  const cloud = useCloudSync();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [syncSecret, setSyncSecret] = useState("");

  async function syncCanvas() {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/canvas/sync", {
        method: "POST",
        headers: { "x-canvas-sync-secret": syncSecret },
      });
      const body = (await response.json()) as CanvasSyncPayload | { error?: string };
      if (!response.ok || !("courses" in body)) {
        throw new Error("error" in body && body.error ? body.error : "No se pudo sincronizar con Canvas.");
      }
      applyCanvasSync(body);
      setResult({ ...body.counts, syncedAt: body.syncedAt });
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "No se pudo sincronizar con Canvas.");
    } finally {
      setSyncing(false);
    }
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
                El token se queda en el servidor. Usa la clave privada del despliegue para autorizar la sincronización.
              </p>
            </div>
          </div>
          <Input
            className="mt-3"
            type="password"
            autoComplete="current-password"
            value={syncSecret}
            onChange={(event) => setSyncSecret(event.target.value)}
            placeholder="Clave de sincronización"
            aria-label="Clave privada de sincronización"
          />
          <Button className="mt-2 w-full" variant="primary" loading={syncing} disabled={!syncSecret} onClick={syncCanvas}>
            <RefreshCcw size={15} /> {syncing ? "Sincronizando" : "Sincronizar ahora"}
          </Button>
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
