import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center py-12 text-center">
      <div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle text-text-muted"><SearchX size={22} /></span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-text-faint">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">Esta página no existe</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">El enlace pudo cambiar o el contenido ya no está disponible.</p>
        <Link href="/" className="mt-7 inline-flex h-9 items-center gap-2 rounded-[10px] bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-strong">
          <ArrowLeft size={15} /> Volver al inicio
        </Link>
      </div>
    </section>
  );
}
