"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Laptop,
  Link2,
  MonitorSmartphone,
  QrCode,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCloudStore } from "@/store/cloud";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  name: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

interface PairCode {
  code: string;
  expiresAt: string;
  url: string;
  email: string;
}

function fmt(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-EC", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expirado";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function deviceIcon(name: string) {
  if (/iphone|android|ipad|móvil|movil|phone/i.test(name)) return Smartphone;
  return Laptop;
}

export default function ConnectPage() {
  const status = useCloudStore((s) => s.status);
  const version = useCloudStore((s) => s.version);
  const lastSyncAt = useCloudStore((s) => s.lastSyncAt);

  const [devices, setDevices] = useState<Device[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<PairCode | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        devices?: Device[];
        current?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "No se pudieron cargar los dispositivos.");
        return;
      }
      setDevices(json.devices ?? []);
      setCurrent(json.current ?? null);
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pair) return;
    const interval = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(interval);
  }, [pair]);

  const createCode = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/pair", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as PairCode & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "No se pudo generar el código.");
        return;
      }
      setPair(json);
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (device: Device) => {
    const res = await fetch(`/api/devices?id=${encodeURIComponent(device.id)}`, {
      method: "DELETE",
    });
    const json = (await res.json().catch(() => ({}))) as { wasCurrent?: boolean };
    if (json.wasCurrent) {
      window.location.assign("/login");
      return;
    }
    await load();
  };

  const copy = async () => {
    if (!pair) return;
    try {
      await navigator.clipboard.writeText(pair.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sin portapapeles */
    }
  };

  // fuerza el re-render del contador
  void tick;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispositivos y sincronización"
        subtitle="Conecta tu teléfono y laptop con un código o QR. Los cambios se propagan casi en tiempo real."
        action={
          <Button variant="secondary" onClick={() => void load()} loading={loading}>
            <RefreshCw size={15} aria-hidden="true" /> Actualizar
          </Button>
        }
      />

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <Link2 size={16} aria-hidden="true" className="text-accent" />
                Vincular un dispositivo
              </h2>
              <p className="mt-0.5 text-[13px] text-text-muted">
                Genera un código de un solo uso (10 min) o escanea el QR desde tu teléfono.
              </p>
            </div>
          </div>

          {!pair ? (
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => void createCode()}
              loading={creating}
            >
              <QrCode size={15} aria-hidden="true" /> Generar código y QR
            </Button>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr?data=${encodeURIComponent(pair.url)}`}
                  alt="Código QR para vincular el dispositivo"
                  width={148}
                  height={148}
                  className="mx-auto rounded-2xl border border-border bg-white p-1.5 sm:mx-0"
                />
                <div className="min-w-0 text-center sm:text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                    Código
                  </p>
                  <p className="font-mono text-3xl font-semibold tracking-[0.3em] text-text">
                    {pair.code}
                  </p>
                  <p className="mt-1 text-[12px] text-text-muted">
                    Expira en <span className="font-semibold text-accent">{timeLeft(pair.expiresAt)}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                    <Button variant="secondary" size="sm" onClick={() => void copy()}>
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Enlace copiado" : "Copiar enlace"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPair(null)}>
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-subtle/60 px-3 py-2.5 text-[12px] leading-relaxed text-text-muted">
                <p className="font-semibold text-text">En el teléfono:</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                  <li>Abre la cámara y escanea el QR (o abre el enlace).</li>
                  <li>Confirma la vinculación: se abrirá la app con tu sesión.</li>
                  <li>
                    En iPhone: Safari → Compartir → <span className="text-text">Añadir a pantalla de inicio</span>.
                  </li>
                </ol>
                <p className="mt-1.5">
                  También puedes entrar manualmente en{" "}
                  <Link href="/pair" className="font-medium text-accent hover:underline">
                    /pair
                  </Link>{" "}
                  y escribir el código.
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <MonitorSmartphone size={16} aria-hidden="true" className="text-accent-2" />
            Estado de la nube
          </h2>
          <dl className="mt-3 space-y-2 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">Sincronización</dt>
              <dd
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  status === "synced" && "bg-present-soft text-present",
                  status === "syncing" && "bg-pending-soft text-pending",
                  status === "error" && "bg-absent-soft text-absent",
                  (status === "offline" || status === "idle") && "bg-surface-subtle text-text-faint",
                )}
              >
                {status === "synced"
                  ? "Al día"
                  : status === "syncing"
                    ? "Sincronizando"
                    : status === "error"
                      ? "Con error"
                      : status === "offline"
                        ? "Sin conexión"
                        : "Conectando"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">Versión del documento</dt>
              <dd className="font-mono text-text">{version || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">Última sincronización</dt>
              <dd className="text-text">{lastSyncAt ? fmt(new Date(lastSyncAt).toISOString()) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">Frecuencia</dt>
              <dd className="text-text">Cada 8 s + al volver a la app</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-lg bg-surface-subtle/60 px-2.5 py-2 text-[11px] leading-relaxed text-text-faint">
            Cada cambio se guarda localmente al instante y se sube a la nube en segundo plano. Si
            dos dispositivos editan a la vez, se fusionan por identificador.
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Sesiones activas</h2>
          <p className="text-[12px] text-text-muted">
            Revoca cualquier dispositivo que no reconozcas.
          </p>
        </div>
        {loading && devices.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-subtle">
              <span className="block h-full w-1/2 animate-pulse rounded-full brand-gradient" />
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((device) => {
              const Icon = deviceIcon(device.name);
              const isCurrent = device.id === current;
              return (
                <li key={device.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      isCurrent ? "bg-accent-2-soft text-accent-2" : "bg-surface-subtle text-text-muted",
                    )}
                  >
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-text">
                      <span className="truncate">{device.name}</span>
                      {isCurrent ? (
                        <span className="rounded-full bg-accent-2-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-2">
                          Este dispositivo
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11px] text-text-faint">
                      Último uso {fmt(device.lastSeenAt)} · creado {fmt(device.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void revoke(device)}
                    className="text-absent hover:bg-absent-soft"
                  >
                    <Trash2 size={13} aria-hidden="true" /> Revocar
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Smartphone size={16} aria-hidden="true" className="text-accent" />
          Instalar como app
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-subtle/50 p-3 text-[12px] leading-relaxed text-text-muted">
            <p className="font-semibold text-text">iPhone / iPad</p>
            <p className="mt-1">
              Safari → Compartir → <span className="text-text">Añadir a pantalla de inicio</span>.
              Ábrela desde el ícono para recibir notificaciones push.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-subtle/50 p-3 text-[12px] leading-relaxed text-text-muted">
            <p className="font-semibold text-text">Android</p>
            <p className="mt-1">
              Chrome → menú ⋮ → <span className="text-text">Instalar aplicación</span>. También
              funciona con Tasker/MacroDroid usando la API de atajos.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
