"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Share, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (installed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-present-soft/50 px-3 py-2.5 text-[13px] font-medium text-present">
        <CheckCircle2 size={16} aria-hidden="true" />
        La app ya está instalada en este dispositivo.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-subtle/50 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Smartphone size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text">Instala la app en tu teléfono</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">
            {ios ? (
              <>
                En Safari toca <Share size={11} className="inline" aria-hidden="true" /> Compartir →{" "}
                <span className="font-medium text-text">Añadir a pantalla de inicio</span>. Ábrela
                desde el ícono para recibir notificaciones push.
              </>
            ) : (
              <>
                En Chrome abre el menú ⋮ y elige{" "}
                <span className="font-medium text-text">Instalar aplicación</span>. También puedes
                usar el botón de aquí abajo.
              </>
            )}
          </p>
        </div>
      </div>

      {deferred ? (
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void install()}>
          <Download size={13} aria-hidden="true" /> Instalar aplicación
        </Button>
      ) : null}
    </div>
  );
}
