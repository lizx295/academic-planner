"use client";

import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

export function ErrorState({
  title = "No pudimos mostrar esta sección",
  description = "Ocurrió un error inesperado. Tus datos guardados no se eliminaron.",
  digest,
  onRetry,
}: {
  title?: string;
  description?: string;
  digest?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  return (
    <section className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center py-12 text-center">
      <div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-absent-soft text-absent">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-text-faint">Error de aplicación</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-muted">{description}</p>
        {digest ? <p className="mt-3 font-mono text-[11px] text-text-faint">Referencia: {digest}</p> : null}
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {onRetry ? (
            <Button variant="primary" onClick={onRetry}><RefreshCcw size={15} /> Reintentar</Button>
          ) : null}
          <Button onClick={() => router.push("/")}><ArrowLeft size={15} /> Volver al inicio</Button>
        </div>
      </div>
    </section>
  );
}
