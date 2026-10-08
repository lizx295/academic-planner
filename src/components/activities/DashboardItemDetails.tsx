"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  BellRing,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Gauge,
  MessageSquareText,
  NotebookTabs,
} from "lucide-react";
import type { DashboardItem, DashboardItemKind } from "@academic-planner/core";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { resolveCanvasUrl } from "@/lib/external-url";

const KIND_META: Record<DashboardItemKind, { label: string; icon: typeof BellRing }> = {
  assignment: { label: "Tarea", icon: ClipboardList },
  quiz: { label: "Evaluación", icon: NotebookTabs },
  announcement: { label: "Anuncio", icon: BellRing },
  discussion: { label: "Foro", icon: MessageSquareText },
  page: { label: "Página", icon: FileText },
  material: { label: "Material", icon: FolderOpen },
  calendar_event: { label: "Evento", icon: CalendarDays },
  planner_note: { label: "Nota", icon: ClipboardList },
  module: { label: "Módulo", icon: FolderOpen },
  other: { label: "Actividad", icon: CalendarDays },
};

function dateCopy(item: DashboardItem): { eyebrow: string; date: string; time: string } {
  const parsed = parseISO(`${item.date}T12:00:00`);
  const due = item.kind === "assignment" || item.kind === "quiz";
  return {
    eyebrow: due ? "Fecha de entrega" : item.kind === "announcement" ? "Publicado" : "Fecha del contenido",
    date: format(parsed, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }),
    time: item.time ? `${item.time}` : "Todo el día",
  };
}

function TextWithLinks({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-text-muted">
      {parts.map((part, index) => {
        if (!/^https?:\/\//i.test(part)) return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>;
        const trailing = part.match(/[),.;:!?]+$/)?.[0] ?? "";
        const url = trailing ? part.slice(0, -trailing.length) : part;
        return (
          <span key={`${index}-${url}`}>
            <a href={url} target="_blank" rel="noreferrer" className="font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
              {url}
            </a>
            {trailing}
          </span>
        );
      })}
    </p>
  );
}

export function DashboardItemDetailsDialog({
  item,
  courseName,
  onClose,
}: {
  item: DashboardItem | null;
  courseName?: string;
  onClose: () => void;
}) {
  if (!item) return null;
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const date = dateCopy(item);
  const externalUrl = resolveCanvasUrl(item.externalUrl);

  return (
    <Dialog
      open
      onClose={onClose}
      title={item.title}
      description={courseName ?? "Agenda personal"}
      size="lg"
      footer={
        <>
          {externalUrl ? (
            <a href={externalUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-strong">
              <ExternalLink size={14} aria-hidden="true" />
              Abrir en Aula Virtual
            </a>
          ) : null}
          <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-accent/30 bg-accent-soft/45 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent shadow-sm">
              <CalendarClock size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{date.eyebrow}</p>
              <p className="mt-1 text-lg font-semibold capitalize leading-tight text-text">{date.date}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-text">{date.time}</p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent"><Icon size={12} aria-hidden="true" /> {meta.label}</Badge>
          <Badge tone={item.completed ? "success" : "neutral"}>
            <CheckCircle2 size={12} aria-hidden="true" />
            {item.completed ? "Completado" : "Pendiente"}
          </Badge>
          {item.pointsPossible != null ? (
            <Badge tone="neutral"><Gauge size={12} aria-hidden="true" /> {item.pointsPossible} puntos</Badge>
          ) : null}
          {item.newActivity ? <Badge tone="warning">Contenido nuevo</Badge> : null}
        </div>

        <section>
          <h3 className="flex items-center gap-2 text-base font-semibold text-text">
            <FileText size={16} className="text-text-faint" aria-hidden="true" />
            Contenido
          </h3>
          <div className="mt-2 rounded-xl border border-border bg-surface-subtle/25 px-4 py-3.5">
            {item.description.trim() ? (
              <TextWithLinks text={item.description.trim()} />
            ) : (
              <p className="text-sm leading-relaxed text-text-faint">
                Canvas no publicó una descripción para este elemento. Puedes abrirlo en Aula Virtual para consultar cualquier recurso adicional.
              </p>
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
