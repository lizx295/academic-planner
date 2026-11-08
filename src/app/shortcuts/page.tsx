"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FieldShell, Input } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";

interface Token {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

function fmt(value: string | null): string {
  if (!value) return "Nunca usado";
  try {
    return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
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
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-subtle"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiado" : label}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-border bg-surface-subtle/70 p-3 pr-16 text-[11px] leading-relaxed text-text">
        <code>{code}</code>
      </pre>
      <div className="absolute right-2 top-2">
        <CopyButton value={code} />
      </div>
    </div>
  );
}

export default function ShortcutsPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newToken, setNewToken] = useState<{ label: string; token: string } | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { tokens?: Token[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "No se pudieron cargar los tokens.");
        return;
      }
      setTokens(json.tokens ?? []);
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (label: string) => {
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      token?: string;
      label?: string;
      error?: string;
    };
    if (!res.ok || !json.token) throw new Error(json.error ?? "No se pudo crear el token.");
    setCreateOpen(false);
    setNewToken({ label: json.label ?? label, token: json.token });
    await load();
  };

  const revoke = async (token: Token) => {
    await fetch(`/api/tokens?id=${encodeURIComponent(token.id)}`, { method: "DELETE" });
    setTokens((prev) => prev.filter((t) => t.id !== token.id));
  };

  const base = origin || "https://tu-app.vercel.app";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atajos y API"
        subtitle="Conecta el Centro de Control de iPhone o automatizaciones de Android con tu planificador."
        action={
          <>
            <Button variant="secondary" onClick={() => void load()} loading={loading}>
              <RefreshCw size={15} aria-hidden="true" /> Actualizar
            </Button>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={15} aria-hidden="true" /> Nuevo token
            </Button>
          </>
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

      {newToken ? (
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-2">
            Token creado · {newToken.label}
          </p>
          <p className="mt-1 text-[13px] text-text-muted">
            Cópialo ahora: por seguridad no volverá a mostrarse completo.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold text-text">
              {newToken.token}
            </code>
            <CopyButton value={newToken.token} />
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setNewToken(null)}>
              Lo guardé
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <KeyRound size={15} aria-hidden="true" className="text-accent" />
            Tokens de acceso
          </h2>
          <p className="text-[12px] text-text-muted">
            Cada token da acceso a la API de captura. Revócalos si pierdes un dispositivo.
          </p>
        </div>
        {loading && tokens.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-subtle">
              <span className="block h-full w-1/2 animate-pulse rounded-full brand-gradient" />
            </span>
          </div>
        ) : tokens.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            Aún no hay tokens. Crea uno para tu primer atajo.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {tokens.map((token) => (
              <li key={token.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Zap size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{token.label}</p>
                  <p className="truncate text-[11px] text-text-faint">
                    Creado {fmt(token.createdAt)} · {fmt(token.lastUsedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void revoke(token)}
                  className="text-absent hover:bg-absent-soft"
                >
                  <Trash2 size={13} aria-hidden="true" /> Revocar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Smartphone size={16} aria-hidden="true" className="text-accent" /> iPhone · Atajos en el
            Centro de Control
          </h2>
          <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-text-muted">
            <li>
              <span className="font-medium text-text">1.</span> Abre la app <span className="text-text">Atajos</span> y crea
              uno llamado “Captura rápida”.
            </li>
            <li>
              <span className="font-medium text-text">2.</span> Añade la acción <span className="text-text">Pedir entrada</span>{" "}
              (texto) para el título y otra para el detalle.
            </li>
            <li>
              <span className="font-medium text-text">3.</span> Añade <span className="text-text">Obtener contenido de URL</span>{" "}
              con el endpoint de abajo, método <span className="font-mono text-text">POST</span>.
            </li>
            <li>
              <span className="font-medium text-text">4.</span> En cabeceras agrega{" "}
              <span className="font-mono text-text">Authorization: Bearer TU_TOKEN</span>.
            </li>
            <li>
              <span className="font-medium text-text">5.</span> En iOS 18: mantén presionado el Centro de Control →{" "}
              <span className="text-text">Añadir control</span> → Atajos → tu atajo.
            </li>
          </ol>
          <p className="mt-3 rounded-lg bg-surface-subtle/60 px-2.5 py-2 text-[11px] leading-relaxed text-text-faint">
            También puedes usar “Preguntar a Siri” o el botón de acción. Para el Aula Virtual, crea
            un atajo programado que consulte el endpoint de hoy.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Smartphone size={16} aria-hidden="true" className="text-accent-2" /> Android ·
            Tasker / MacroDroid
          </h2>
          <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-text-muted">
            <li>
              <span className="font-medium text-text">1.</span> Instala{" "}
              <span className="text-text">MacroDroid</span> (más simple) o Tasker.
            </li>
            <li>
              <span className="font-medium text-text">2.</span> Crea una macro con disparador{" "}
              <span className="text-text">Botón de volumen / widget / hora</span>.
            </li>
            <li>
              <span className="font-medium text-text">3.</span> Acción{" "}
              <span className="text-text">Solicitud HTTP</span> → POST al endpoint.
            </li>
            <li>
              <span className="font-medium text-text">4.</span> Cabecera{" "}
              <span className="font-mono text-text">Authorization: Bearer TU_TOKEN</span> y cuerpo JSON.
            </li>
            <li>
              <span className="font-medium text-text">5.</span> Añade un widget de MacroDroid a la
              pantalla de inicio para capturar en un toque.
            </li>
          </ol>
          <p className="mt-3 rounded-lg bg-surface-subtle/60 px-2.5 py-2 text-[11px] leading-relaxed text-text-faint">
            Android sí permite notificaciones push de la PWA instalada desde Chrome. También puedes
            usar Google Keep/Calendar como disparador intermedio si prefieres.
          </p>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-text">Endpoints</h2>
          <p className="text-[12px] text-text-muted">
            Autenticación: <span className="font-mono text-text">Authorization: Bearer &lt;token&gt;</span>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-text">1) Captura rápida</p>
          <p className="text-[11px] text-text-faint">
            POST <span className="font-mono text-text">{base}/api/v1/capture</span>
          </p>
          <CodeBlock
            code={`curl -X POST "${base}/api/v1/capture" \\
  -H "Authorization: Bearer TU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "task",
    "title": "Entregar informe de redes",
    "body": "Subir al Aula Virtual antes de las 23:59",
    "course": "Redes",
    "dueDate": "2026-11-12",
    "dueTime": "23:59",
    "priority": "high"
  }'`}
          />
          <p className="text-[11px] text-text-faint">
            Tipos: <span className="font-mono">note · lesson · reminder · task · exam · project</span>.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-text">2) Resumen de hoy</p>
          <p className="text-[11px] text-text-faint">
            GET <span className="font-mono text-text">{base}/api/v1/today</span>
          </p>
          <CodeBlock
            code={`curl "${base}/api/v1/today" \\
  -H "Authorization: Bearer TU_TOKEN"`}
          />
          <p className="text-[11px] text-text-faint">
            Devuelve clases de hoy, tareas por vencer, próximas evaluaciones y eventos. Úsalo en un
            atajo para mostrarlos en una notificación o en un widget.
          </p>
        </div>
      </Card>

      <CreateTokenDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={create} />
    </div>
  );
}

function CreateTokenDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (label: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel("");
      setError(null);
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onCreate(label.trim() || "Atajos de iOS/Android");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nuevo token de API"
      description="Ponle un nombre para reconocerlo (por ejemplo “iPhone de Ana” o “Android”)."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="create-token-form" variant="primary" loading={loading}>
            Crear token
          </Button>
        </>
      }
    >
      <form id="create-token-form" onSubmit={submit}>
        <FieldShell label="Nombre" htmlFor="token-label">
          <Input
            id="token-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="iPhone de Ana"
          />
        </FieldShell>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
