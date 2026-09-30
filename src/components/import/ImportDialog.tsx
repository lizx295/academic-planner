"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";

import { useAppStore } from "@/store/app";
import {
  detectSource,
  icsRange,
  parseICS,
  parseSeedJSON,
  parseTasksCSV,
  type ParsedImport,
} from "@/lib/importers";
import type { Course } from "@/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
}

export function ImportDialog({ open, onClose, courses }: ImportDialogProps) {
  const patchData = useAppStore((s) => s.patchData);
  const addPersonalEvents = useAppStore((s) => s.importPersonalEvents);
  const addTasks = useAppStore((s) => s.importTasks);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedImport | null>(null);
  const [reading, setReading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setFile(null);
      setResult(null);
      setDone(false);
    });
  }, [open]);

  async function onFileSelected(next: File | null) {
    if (!next) return;
    setFile(next);
    setResult(null);
    setDone(false);
    setReading(true);
    try {
      const text = await next.text();
      const source = detectSource(next.name);
      const byCode = new Map<string, Course>(
        courses
          .filter((c) => c.code)
          .map((c) => [c.code.toUpperCase(), c]),
      );
      if (source === "ics") {
        const range = icsRange();
        const parsed = parseICS(text, next.name, range.from, range.to);
        setResult({
          ...parsed,
          tasks: [],
          seed: {},
          counts: parsed.personalEvents.length
            ? { "Eventos (semanales)": parsed.personalEvents.length }
            : {},
        });
      } else if (source === "csv") {
        const parsed = parseTasksCSV(text, next.name, byCode);
        setResult({
          ...parsed,
          personalEvents: [],
          seed: {},
          counts: parsed.tasks.length ? { Tareas: parsed.tasks.length } : {},
        });
      } else {
        const parsed = parseSeedJSON(text, next.name);
        setResult(parsed);
      }
    } catch {
      setResult({
        source: detectSource(next.name),
        fileName: next.name,
        personalEvents: [],
        tasks: [],
        seed: {},
        counts: {},
        errors: ["No se pudo leer el archivo."],
      });
    } finally {
      setReading(false);
    }
  }

  function doImport() {
    if (!result) return;
    if (result.source === "ics" && result.personalEvents.length > 0) {
      addPersonalEvents(result.personalEvents);
    }
    if (result.source === "csv" && result.tasks.length > 0) {
      addTasks(result.tasks);
    }
    if (result.source === "json") {
      patchData(result.seed);
    }
    setDone(true);
  }

  const usable =
    result &&
    !result.errors.some((e) => e.length) &&
    (result.source !== "json"
      ? (result.personalEvents.length + result.tasks.length) > 0
      : Object.keys(result.seed).length > 0);

  const countsLabel =
    result && result.counts
      ? Object.entries(result.counts)
          .map(([k, v]) => `${v} ${k}`)
          .join(" · ")
      : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Importar datos"
      description="Archivos .ics (calendario), .csv (tareas) o .json exportado desde la app."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {done ? "Cerrar" : "Cancelar"}
          </Button>
          {!done ? (
            <Button variant="primary" onClick={doImport} disabled={!usable || reading}>
              Importar
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border-strong px-4 py-8 text-center transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {reading ? (
            <Loader2 size={22} className="animate-spin text-text-faint" aria-hidden="true" />
          ) : (
            <FileUp size={22} className="text-text-faint" aria-hidden="true" />
          )}
          <p className="text-sm font-medium text-text">
            {file ? file.name : "Toca para elegir un archivo"}
          </p>
          <p className="text-xs text-text-faint">
            Se importan eventos de clases, tareas o un respaldo completo.
          </p>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".ics,.csv,.json,text/calendar,text/csv,application/json"
          className="sr-only"
          onChange={(e) => {
            onFileSelected(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        {result ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              result.errors.length
                ? "border-absent/30 bg-absent-soft/20 text-absent"
                : "border-present/30 bg-present-soft/20 text-text"
            }`}
          >
            {result.errors.length > 0 ? (
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">No se pudo importar</p>
                  <ul className="mt-1 list-inside list-disc text-[13px]">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-present" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    Listo para importar: {countsLabel || "sin elementos"}
                  </p>
                  <p className="mt-0.5 text-[13px] text-text-muted">
                    El contenido se fusionará con tus datos actuales.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {done ? (
          <div className="flex items-center gap-2 rounded-2xl border border-present/30 bg-present-soft/20 px-4 py-3 text-sm text-text">
            <CheckCircle2 size={16} className="shrink-0 text-present" aria-hidden="true" />
            <span>Importación completada. Revisa tu calendario, tareas o materias.</span>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
