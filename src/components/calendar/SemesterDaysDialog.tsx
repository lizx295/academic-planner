"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldShell, Input, Select } from "@/components/ui/Field";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/utils";
import type { SemesterDayKind } from "@/types";

const KIND_OPTIONS: Array<{ value: SemesterDayKind; label: string; className: string }> = [
  { value: "holiday", label: "Feriado", className: "bg-absent-soft text-absent" },
  { value: "no_class", label: "Sin clases", className: "bg-pending-soft text-pending" },
  { value: "exam_period", label: "Período de exámenes", className: "bg-accent-soft text-accent" },
  { value: "special", label: "Día especial", className: "bg-accent-2-soft text-accent-2" },
];

function labelFor(kind: SemesterDayKind): string {
  return KIND_OPTIONS.find((k) => k.value === kind)?.label ?? kind;
}

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function SemesterDaysDialog({
  open,
  onClose,
  semesterId,
}: {
  open: boolean;
  onClose: () => void;
  semesterId: string;
}) {
  const semesterDays = useAppStore((s) => s.semesterDays);
  const addSemesterDay = useAppStore((s) => s.addSemesterDay);
  const deleteSemesterDay = useAppStore((s) => s.deleteSemesterDay);

  const [date, setDate] = useState(todayISO());
  const [kind, setKind] = useState<SemesterDayKind>("holiday");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(
    () =>
      semesterDays
        .filter((d) => d.semesterId === semesterId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [semesterDays, semesterId],
  );

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!label.trim()) {
      setError("Escribe un nombre, por ejemplo “Feriado de Guayaquil”.");
      return;
    }
    if (!date) {
      setError("Elige una fecha.");
      return;
    }
    if (!semesterId) {
      setError("Primero elige un semestre activo.");
      return;
    }
    addSemesterDay({ semesterId, date, kind, label: label.trim() });
    setLabel("");
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Días especiales del semestre"
      description="Feriados, suspensiones de clases y períodos de exámenes. Se muestran en el calendario y no generan clases."
      size="md"
    >
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <FieldShell label="Fecha" htmlFor="sd-date">
          <Input
            id="sd-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FieldShell>
        <FieldShell label="Nombre" htmlFor="sd-label">
          <Input
            id="sd-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Feriado de Guayaquil"
          />
        </FieldShell>
        <div className="grid gap-2 sm:col-span-1">
          <FieldShell label="Tipo" htmlFor="sd-kind">
            <Select
              id="sd-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as SemesterDayKind)}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FieldShell>
        </div>
        <div className="sm:col-span-3 sm:flex sm:justify-end">
          <Button type="submit" variant="primary" size="sm">
            <Plus size={13} aria-hidden="true" /> Agregar día
          </Button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-2 rounded-xl bg-absent-soft px-3 py-2 text-[12px] text-absent">
          {error}
        </p>
      ) : null}

      <div className="mt-4 border-t border-border pt-3">
        {days.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong px-3 py-5 text-center text-[13px] text-text-muted">
            Aún no hay días especiales en este semestre.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {days.map((day) => {
              const meta = KIND_OPTIONS.find((k) => k.value === day.kind);
              return (
                <li
                  key={day.id}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-subtle/40 px-3 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-text-muted">
                    <CalendarOff size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-text">{day.label}</p>
                    <p className="text-[11px] text-text-faint">
                      {format(parseISO(day.date), "EEEE d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      meta?.className ?? "bg-surface-subtle text-text-muted",
                    )}
                  >
                    {labelFor(day.kind)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSemesterDay(day.id)}
                    aria-label={`Eliminar ${day.label}`}
                    className="rounded-md p-1 text-text-faint transition-colors hover:bg-absent-soft hover:text-absent"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
