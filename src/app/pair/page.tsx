"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Link2, QrCode, ShieldCheck, Smartphone } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input, FieldShell } from "@/components/ui/Field";

interface Preview {
  email: string;
  name: string;
  expiresAt: string;
}

function deviceName(): string {
  if (typeof navigator === "undefined") return "Dispositivo vinculado";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Navegador";
}

function PairScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const lookup = useCallback(
    async (value: string) => {
      const clean = value.trim().toUpperCase();
      if (!clean) return;
      setChecking(true);
      setError(null);
      try {
        const res = await fetch(`/api/pair?code=${encodeURIComponent(clean)}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as Preview & { error?: string };
        if (!res.ok) {
          setPreview(null);
          setError(json.error ?? "El código no es válido o ya expiró.");
          return;
        }
        setPreview(json);
      } catch {
        setError("No hay conexión con el servidor.");
      } finally {
        setChecking(false);
      }
    },
    [],
  );

  useEffect(() => {
    const fromUrl = params.get("code");
    if (fromUrl) void lookup(fromUrl);
  }, [params, lookup]);

  const claim = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError("Escribe el código que aparece en tu laptop.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pair/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: clean, deviceName: deviceName() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "No se pudo vincular este dispositivo.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-[-10%] h-80 w-80 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-[-8%] h-96 w-96 rounded-full bg-accent-2/25 blur-3xl"
      />

      <div className="relative w-full max-w-md rounded-[26px] glass-strong p-7 shadow-2xl shadow-black/10 sm:p-9">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="text-accent">
            <Logo size={26} />
          </span>
          <p className="text-[15px] font-semibold tracking-tight text-text">Academic Planner</p>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
          <Link2 size={12} aria-hidden="true" />
          Vincular dispositivo
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
          Conecta tu teléfono
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
          En tu laptop abre <span className="font-medium text-text">Dispositivos → Vincular</span>.
          Escanea el QR o escribe el código de 6 caracteres.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (preview) void claim();
            else void lookup(code);
          }}
        >
          <FieldShell label="Código de vinculación" htmlFor="pair-code">
            <Input
              id="pair-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setPreview(null);
                setError(null);
              }}
              placeholder="ABC123"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={6}
              className="text-center text-lg font-semibold tracking-[0.4em]"
            />
          </FieldShell>

          {preview ? (
            <div className="rounded-xl border border-border bg-accent-2-soft/70 px-3 py-3 text-[13px] leading-relaxed text-text-muted">
              <p className="flex items-center gap-1.5 font-semibold text-text">
                <ShieldCheck size={15} aria-hidden="true" className="text-accent-2" />
                Código válido
              </p>
              <p className="mt-1">
                Este dispositivo se vinculará a <span className="font-medium text-text">{preview.email}</span>.
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            loading={loading || checking}
            className="w-full justify-center"
            disabled={!code.trim()}
          >
            {preview ? "Vincular este dispositivo" : "Comprobar código"}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-border bg-surface-subtle/60 p-3 text-[12px] leading-relaxed text-text-faint">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-text-muted">
            <QrCode size={13} aria-hidden="true" /> ¿Cómo obtengo el código?
          </p>
          <p>
            En la laptop: <span className="text-text-muted">Dispositivos</span>. El código dura 10
            minutos y solo se puede usar una vez.
          </p>
          <p className="mt-2 flex items-center gap-1.5">
            <Smartphone size={12} aria-hidden="true" />
            También puedes entrar con tu correo y contraseña habitual.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PairPage() {
  return (
    <Suspense fallback={null}>
      <PairScreen />
    </Suspense>
  );
}
