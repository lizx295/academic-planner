"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, FileText } from "lucide-react";
import { academicDateKey, type DashboardItem } from "@academic-planner/core";

import { ActivityDetails, activityTitle } from "@/components/activities/ActivityDetails";
import { DashboardItemDetails } from "@/components/activities/DashboardItemDetails";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { findAcademicActivityForDashboard } from "@/lib/activity-detail";
import { resolveCanvasUrl } from "@/lib/external-url";
import { useAppStore } from "@/store/app";

function canvasDate(value: string): { date: string; time: string } {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: academicDateKey(), time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

function safeExternalUrl(value: string | null | undefined, canvas: boolean): string | null {
  if (canvas) return resolveCanvasUrl(value);
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function ActivityPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const courses = useAppStore((state) => state.courses);
  const tasks = useAppStore((state) => state.tasks);
  const assessments = useAppStore((state) => state.assessments);
  const dashboardItems = useAppStore((state) => state.dashboardItems);
  const announcements = useAppStore((state) => state.announcements);
  const materials = useAppStore((state) => state.materials);
  const moduleItems = useAppStore((state) => state.moduleItems);

  const directAcademic = tasks.find((item) => item.id === id) ?? assessments.find((item) => item.id === id) ?? null;
  const dashboardItem = dashboardItems.find((item) => item.id === id) ?? null;
  const academic = directAcademic ?? (dashboardItem
    ? findAcademicActivityForDashboard(dashboardItem, tasks, assessments)
    : null);
  const announcement = announcements.find((item) => item.id === id) ?? null;
  const material = materials.find((item) => item.id === id) ?? null;
  const moduleItem = moduleItems.find((item) => item.id === id) ?? null;

  const announcementDashboard: DashboardItem | null = announcement
    ? dashboardItems.find((item) => item.kind === "announcement" && item.externalId === announcement.externalId) ?? (() => {
        const when = canvasDate(announcement.postedAt);
        return {
          id: announcement.id,
          courseId: announcement.courseId,
          title: announcement.title,
          kind: "announcement",
          date: when.date,
          time: when.time,
          description: announcement.message,
          externalUrl: announcement.externalUrl,
          externalId: announcement.externalId,
          source: "canvas",
          completed: announcement.read,
          newActivity: !announcement.read,
        };
      })()
    : null;

  const genericItem = dashboardItem ?? announcementDashboard;
  const resource = material ?? moduleItem;
  const courseId = academic?.courseId ?? genericItem?.courseId ?? resource?.courseId ?? null;
  const course = courseId ? courses.find((item) => item.id === courseId) : null;
  const title = academic
    ? activityTitle(academic)
    : genericItem?.title ?? resource?.title ?? "Actividad no encontrada";
  const externalValue = academic?.externalUrl
    ?? genericItem?.externalUrl
    ?? (material ? material.url : moduleItem?.externalUrl)
    ?? null;
  const source = academic?.source ?? genericItem?.source ?? material?.source ?? (moduleItem ? "canvas" : "local");
  const externalUrl = safeExternalUrl(externalValue, source === "canvas");
  const found = Boolean(academic || genericItem || resource);

  if (!found) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al inicio
        </Link>
        <EmptyState
          icon={<FileText size={22} aria-hidden="true" />}
          title="Actividad no encontrada"
          description="El elemento pudo cambiar en Canvas. Sincroniza nuevamente e inténtalo otra vez."
          action={<Button variant="primary" onClick={() => window.history.back()}>Regresar</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        href={course ? `/courses/${course.id}` : "/"}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {course ? `Volver a ${course.name}` : "Volver al inicio"}
      </Link>

      <PageHeader
        title={title}
        subtitle={course?.name ?? "Agenda personal"}
        action={
          externalUrl ? (
            <a href={externalUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-accent px-3.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong">
              <ExternalLink size={15} aria-hidden="true" /> Abrir en Aula Virtual
            </a>
          ) : null
        }
      />

      {course ? (
        <Link href={`/courses/${course.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text transition-colors hover:bg-surface-subtle">
          <BookOpen size={17} className="text-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{course.name}</span>
          <span className="text-xs font-medium text-accent">Ver materia</span>
        </Link>
      ) : null}

      <Card className="p-5 sm:p-6">
        {academic ? <ActivityDetails activity={academic} /> : null}
        {!academic && genericItem ? <DashboardItemDetails item={genericItem} /> : null}
        {!academic && !genericItem && resource ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-subtle/35 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent"><FileText size={19} /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                  {"canvasType" in resource && resource.canvasType ? resource.canvasType : "Contenido del curso"}
                </p>
                <p className="mt-1 font-semibold text-text">{resource.title}</p>
              </div>
            </div>
            <section>
              <h2 className="text-base font-semibold text-text">Contenido</h2>
              <div className="mt-2 rounded-xl border border-border bg-surface-subtle/25 px-4 py-3.5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-text-muted">
                  {"description" in resource && resource.description?.trim()
                    ? resource.description
                    : "Este recurso no incluye una descripción adicional en Canvas."}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
