"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Check, Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Permission = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function PushToggle() {
  const [permission, setPermission] = useState<Permission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as Permission);

    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(existing));
      } catch {
        /* aún sin permiso o sin service worker activo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (!supported()) throw new Error("Este navegador no admite notificaciones push.");

      const permission = await Notification.requestPermission();
      setPermission(permission as Permission);
      if (permission !== "granted") {
        throw new Error("Activa las notificaciones para este sitio en los ajustes del navegador.");
      }

      const keyRes = await fetch("/api/push", { cache: "no-store" });
      const keyJson = (await keyRes.json().catch(() => ({}))) as {
        publicKey?: string;
        error?: string;
      };
      if (!keyRes.ok || !keyJson.publicKey) {
        throw new Error(keyJson.error ?? "No se pudo preparar el canal de notificaciones.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
        }));

      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "No se pudo guardar la suscripción.");
      }
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron activar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(`/api/push?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron desactivar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }, []);

  const statusText =
    permission === "unsupported"
      ? "Este navegador no admite push. En iPhone instala la app en la pantalla de inicio (iOS 16.4+)."
      : permission === "denied"
        ? "Las notificaciones están bloqueadas. Habilítalas en los ajustes del navegador."
        : subscribed
          ? "Recibirás recordatorios de tareas, evaluaciones y clases."
          : "Activa los avisos para no perder entregas ni evaluaciones.";

  return (
    <div className="rounded-xl border border-border bg-surface-subtle/50 p-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            subscribed ? "bg-accent-2-soft text-accent-2" : "bg-surface text-text-muted",
          )}
        >
          {subscribed ? (
            <BellRing size={17} aria-hidden="true" />
          ) : (
            <BellOff size={17} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text">
            Notificaciones push {subscribed ? "activas" : "desactivadas"}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">{statusText}</p>
        </div>
      </div>

      {permission !== "unsupported" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {subscribed ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-present-soft px-2 py-0.5 text-[11px] font-semibold text-present">
                <Check size={11} aria-hidden="true" /> Activadas
              </span>
              <Button variant="ghost" size="sm" loading={busy} onClick={() => void unsubscribe()}>
                Desactivar
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              disabled={permission === "denied"}
              onClick={() => void subscribe()}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <BellRing size={13} />}
              Activar notificaciones
            </Button>
          )}
          <a
            href="/connect"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
          >
            <Smartphone size={11} aria-hidden="true" /> Instalar en el teléfono
          </a>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 rounded-lg bg-absent-soft px-2.5 py-2 text-[12px] text-absent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
