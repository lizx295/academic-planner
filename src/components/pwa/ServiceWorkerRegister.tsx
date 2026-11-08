"use client";

import { useEffect } from "react";

/** Registra el service worker y prepara el soporte de notificaciones push. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (cancelled) return;
        // Busca actualizaciones sin bloquear la interfaz.
        registration.update().catch(() => undefined);
      } catch (error) {
        console.warn("[pwa] no se pudo registrar el service worker", error);
      }
    };

    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
