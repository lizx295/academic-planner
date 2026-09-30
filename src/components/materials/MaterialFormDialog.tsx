"use client";

import { useEffect, useState } from "react";

import { useAppStore } from "@/store/app";
import type { Course, MaterialKind } from "@/types";
import { MATERIAL_KIND_LABELS } from "@/lib/constants";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldShell } from "@/components/ui/Field";

const KINDS: MaterialKind[] = ["pdf", "slides", "link", "video", "doc"];

export interface MaterialFormDialogProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  defaultCourseId?: string;
}

export function MaterialFormDialog({
  open,
  onClose,
  courses,
  defaultCourseId,
}: MaterialFormDialogProps) {
  const addMaterial = useAppStore((s) => s.addMaterial);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<MaterialKind>("pdf");
  const [url, setUrl] = useState("");
  const [courseId, setCourseId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setTitle("");
      setKind("pdf");
      setUrl("");
      setCourseId(defaultCourseId ?? "");
      setErrors({});
    });
  }, [open, defaultCourseId]);

  function submit() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Escribe el título del material";
    if (!url.trim()) next.url = "Pega el enlace";
    else if (!/^https?:\/\/.+/.test(url.trim()))
      next.url = "El enlace debe empezar con http(s)://";
    if (!courseId) next.courseId = "Selecciona una materia";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    addMaterial({
      courseId,
      title: title.trim(),
      kind,
      url: url.trim(),
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Agregar material"
      description="Guardas un enlace a un PDF, video, diapositivas u otro recurso."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            Agregar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FieldShell label="Título" htmlFor="m-title" error={errors.title}>
          <Input
            id="m-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Semana 3 — apuntes de clase"
          />
        </FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Tipo" htmlFor="m-kind">
            <Select id="m-kind" value={kind} onChange={(e) => setKind(e.target.value as MaterialKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {MATERIAL_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </FieldShell>
          <FieldShell label="Materia" htmlFor="m-course" error={errors.courseId}>
            <Select
              id="m-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FieldShell>
        </div>
        <FieldShell label="Enlace" htmlFor="m-url" error={errors.url}>
          <Input
            id="m-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
          />
        </FieldShell>
        <p className="text-xs text-text-faint">
          Solo se guarda el enlace; el archivo permanece en su origen.
        </p>
      </div>
    </Dialog>
  );
}
