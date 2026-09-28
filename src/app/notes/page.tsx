"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  FileText,
  LinkIcon,
  Notebook,
  Plus,
  Video,
} from "lucide-react";

import { useSemesterData } from "@/hooks/useSemesterData";
import { courseColorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { CourseColor } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkspaceDialog } from "@/components/notes/WorkspaceDialog";

export default function NotesPage() {
  const { activeCourses, activeWorkspaces, materials } = useSemesterData();
  const [dialog, setDialog] = useState<{ open: boolean; courseId?: string; courseName?: string }>({
    open: false,
  });

  const byCourse = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of materials) counts.set(m.courseId, (counts.get(m.courseId) ?? 0) + 1);
    return counts;
  }, [materials]);
  const wsByCourse = useMemo(() => {
    const map = new Map<string, (typeof activeWorkspaces)[number]>();
    for (const w of activeWorkspaces) map.set(w.courseId, w);
    return map;
  }, [activeWorkspaces]);

  if (activeCourses.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <PageHeader title="Workspace y Notion" subtitle="Apuntes y página de cada materia" />
        <EmptyState
          icon={<Notebook size={22} aria-hidden="true" />}
          title="Crea tus materias primero"
          description="Cuando agregues materias podrás vincular la página de apuntes de cada una."
          action={
            <Link href="/courses" passHref>
              <Button variant="primary" size="sm">
                Ir a materias
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Workspace y Notion"
        subtitle="Vincula la página de apuntes de cada materia y accede a sus recursos."
      />

      <Card className="flex flex-wrap items-center gap-3 border-border bg-surface-subtle p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Notebook size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">Integración de Notion</p>
          <p className="text-[13px] leading-relaxed text-text-muted">
            Actualmente guardas el enlace a tu página manualmente y la abres desde la app. La
            sincronización automática por API se agregará en una versión futura.
          </p>
        </div>
        <Badge tone="info">Sincronización futura</Badge>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {activeCourses.map((course) => {
          const cls = courseColorClasses(course.color);
          const ws = wsByCourse.get(course.id);
          const materialCount = byCourse.get(course.id) ?? 0;
          return (
            <Card
              key={course.id}
              className="relative overflow-hidden p-4 transition-colors hover:bg-surface-subtle"
            >
              <span
                aria-hidden="true"
                className={cn("absolute inset-y-0 left-0 w-1", cls.bar)}
              />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
                    {course.code}
                  </p>
                  <p className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-text">
                    {course.name}
                  </p>
                </div>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", cls.soft, cls.text)}>
                  <BookOpen size={16} aria-hidden="true" />
                </span>
              </div>

              <div className="mt-3 space-y-2 pl-2">
                {ws ? (
                  <a
                    href={ws.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-text transition-colors hover:border-accent hover:text-accent"
                  >
                    <LinkIcon size={14} className="shrink-0 text-text-faint" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{ws.title || ws.pageUrl}</span>
                    <ExternalLink size={14} className="shrink-0 text-text-faint" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="rounded-[10px] border border-dashed border-border-strong px-3 py-2 text-[13px] text-text-faint">
                    Sin página vinculada
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                    <FileText size={13} className="text-text-faint" aria-hidden="true" />
                    {materialCount > 0 ? `${materialCount} material${materialCount === 1 ? "" : "es"}` : "Sin materiales"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDialog({ open: true, courseId: course.id, courseName: course.name })
                      }
                    >
                      {ws ? "Editar" : "Vincular"}
                    </Button>
                    <Link
                      href={`/courses/${course.id}?tab=workspace`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg text-[13px] font-medium text-text-muted transition-colors hover:text-accent"
                    >
                      Ver <ExternalLink size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed border-border-strong p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-subtle text-text-faint">
            <Video size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">¿Muchos materiales?</p>
            <p className="text-[13px] text-text-muted">
              Los enlaces de cada materia se guardan en la sección Materiales.
            </p>
          </div>
        </div>
        <Link
          href="/courses"
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border px-3 text-sm font-medium text-text transition-colors hover:bg-surface-subtle"
        >
          <Plus size={15} aria-hidden="true" /> Ver materias
        </Link>
      </Card>

      <WorkspaceDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        courseId={dialog.courseId}
        courseName={dialog.courseName}
        workspace={dialog.courseId ? wsByCourse.get(dialog.courseId) : null}
      />
    </div>
  );
}