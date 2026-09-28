"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { useAppStore } from "@/store/app";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, FieldShell } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";

const INTEGRATION_OPTIONS: Array<{ value: "manual" | "api"; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "api", label: "API" },
];

export interface WorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  courseId?: string;
  courseName?: string;
  workspace?: { title: string; pageUrl: string; integration: "manual" | "api" } | null;
}

export function WorkspaceDialog({
  open,
  onClose,
  courseId,
  courseName,
  workspace,
}: WorkspaceDialogProps) {
  const updateNotionUrl = useAppStore((s) => s.updateNotionUrl);
  const upsertWorkspace = useAppStore((s) => s.upsertWorkspace);

  const [title, setTitle] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [integration, setIntegration] = useState<"manual" | "api">("manual");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setTitle(workspace?.title ?? "");
    setPageUrl(workspace?.pageUrl ?? "");
    setIntegration(workspace?.integration ?? "manual");
    setErrors({});
  }, [open, workspace]);

  function submit() {
    const next: Record<string, string> = {};
    const url = pageUrl.trim();
    if (!url) next.pageUrl = "Pega el enlace de la página";
    else if (!/^https?:\/\/.+/.test(url)) next.pageUrl = "El enlace debe empezar con http(s)://";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (courseId) updateNotionUrl(courseId, url);
    upsertWorkspace({
      courseId: courseId ?? "",
      title: title.trim() || `Apuntes — ${courseName ?? ""}`.trim(),
      pageUrl: url,
      integration,
      lastSyncedAt: null,
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={workspace ? "Editar workspace" : "Conectar página de Notion"}
      description={
        integration === "api"
          ? "La sincronización por API estará disponible más adelante."
          : "Guarda el enlace a tu página de apuntes y ábrela desde la app."
      }
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            Guardar enlace
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FieldShell label="Integración" htmlFor="ws-int">
          <Segmented
            options={INTEGRATION_OPTIONS}
            value={integration}
            onChange={setIntegration}
            ariaLabel="Tipo de integración"
          />
        </FieldShell>
        <FieldShell label="Título" htmlFor="ws-title">
          <Input
            id="ws-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={courseName ? `Apuntes — ${courseName}` : "Apuntes de la materia"}
          />
        </FieldShell>
        <FieldShell label="Enlace" htmlFor="ws-url" error={errors.pageUrl}>
          <Input
            id="ws-url"
            type="url"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="https://notion.so/..."
          />
        </FieldShell>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-[13px] leading-relaxed text-text-muted">
          <ExternalLink size={15} className="mt-0.5 shrink-0 text-text-faint" aria-hidden="true" />
          <span>
            En versión 1 el enlace se guarda en tu navegador; la sincronización automática con la
            API de Notion es una integración futura.
          </span>
        </div>
      </div>
    </Dialog>
  );
}