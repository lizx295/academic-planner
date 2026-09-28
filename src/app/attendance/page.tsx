"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Check, ChevronRight, UserCheck, X } from "lucide-react";

import { useSemesterData } from "@/hooks/useSemesterData";
import { useAppStore } from "@/store/app";
import {
  attendanceByCourse,
  attendanceStats,
  pendingList,
  warningsFor,
} from "@/lib/attendance";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttendanceRow } from "@/components/attendance/AttendanceRow";
import { AttendanceCorrectionDialog } from "@/components/attendance/AttendanceCorrectionDialog";

export default function AttendancePage() {
  const {
    activeAttendance,
    activeCourses,
    courses,
    schedules,
    classrooms,
    professors,
  } = useSemesterData();
  const coursesById = useMemo(
    () => new Map(activeCourses.map((c) => [c.id, c])),
    [activeCourses],
  );
  const respondAttendance = useAppStore((s) => s.respondAttendance);
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);

  const stats = useMemo(() => attendanceStats(activeAttendance), [activeAttendance]);
  const pending = useMemo(
    () =>
      pendingList(activeAttendance, courses, schedules, classrooms, professors),
    [activeAttendance, courses, schedules, classrooms, professors],
  );
  const byCourse = useMemo(
    () => attendanceByCourse(activeAttendance),
    [activeAttendance],
  );
  const warnings = useMemo(
    () => warningsFor(byCourse, activeCourses.map((c) => c.id)),
    [byCourse, activeCourses],
  );

  const recent = useMemo(
    () =>
      [...activeAttendance].sort((a, b) => b.date.localeCompare(a.date)),
    [activeAttendance],
  );

  const percent = stats.percent;
  const tone =
    percent === null ? "accent" : percent >= 80 ? "success" : percent >= 60 ? "warning" : "danger";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Asistencia"
        subtitle={
          stats.total > 0
            ? `${stats.present} presentes · ${stats.absent} ausentes · ${stats.excused} justificadas`
            : "Registra tu asistencia para ver estadísticas"
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">Asistencia general del semestre</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {stats.pending > 0
                ? `${stats.pending} clases pendientes de confirmar`
                : "Todas las clases registradas están confirmadas"}
            </p>
          </div>
          <span className="text-3xl font-semibold tabular-nums text-text">
            {percent === null ? "—" : `${percent}%`}
          </span>
        </div>
        <Progress value={percent ?? 0} tone={tone} className="mt-4 h-2.5" />
      </Card>

      {pending.length > 0 ? (
        <Card className="border-pending/25 bg-pending-soft/20">
          <CardHeader
            className="px-4 pt-4"
            title={
              <span className="flex items-center gap-2">
                <UserCheck size={16} className="text-pending" aria-hidden="true" />
                Clases por confirmar
              </span>
            }
            description="Indica si asististe a la clase para llevar tu récord."
          />
          <div className="mt-2 space-y-1.5 p-3">
            {pending.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {p.courseCode} · {p.courseName}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {format(parseISO(p.date), "EEE d MMM", { locale: es })} ·{" "}
                    {p.scheduleStart} – {p.scheduleEnd}
                    {p.classroomName !== "—" ? ` · ${p.classroomName}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="No asistí"
                    className="text-absent hover:bg-absent-soft hover:text-absent"
                    onClick={() => respondAttendance(p.id, "absent")}
                  >
                    <X size={14} /> No asistí
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => respondAttendance(p.id, "present")}>
                    <Check size={14} /> Asistí
                  </Button>
                </div>
              </div>
            ))}
            {pending.length > 8 ? (
              <p className="px-1 pt-1 text-xs text-text-muted">
                +{pending.length - 8} clases anteriores sin confirmar
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {warnings.length > 0 ? (
        <Card className="p-4">
          <CardHeader
            title="Materias por debajo del objetivo"
            description="Tu asistencia en estas materias está por debajo del 85 %."
          />
          <div className="mt-3 space-y-2">
            {warnings.map((w) => {
              const course = coursesById.get(w.courseId);
              if (!course) return null;
              return (
                <a
                  key={w.courseId}
                  href={`/courses/${course.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-surface-subtle"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-pending" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                    {course.name}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      w.level === "critical" ? "text-absent" : "text-pending",
                    )}
                  >
                    {w.percent}%
                  </span>
                  <Badge tone={w.level === "critical" ? "danger" : "warning"}>
                    {w.level === "critical" ? "Crítico" : "Alerta"}
                  </Badge>
                  <ChevronRight size={16} className="text-text-faint" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="px-4 pt-4">
          <CardHeader
            title="Historial completo"
            description="Corrige el estado de una sesión si cometiste un error."
          />
        </div>
        <div className="mt-2 mb-1 divide-y divide-border pb-1">
          {recent.length === 0 ? (
            <EmptyState
              icon={<CalendarClock size={22} aria-hidden="true" />}
              title="Sin registros"
              description="Las clases que terminan se agregarán aquí para que confirmes tu asistencia."
            />
          ) : (
            recent.map((rec) => (
              <AttendanceRow
                key={rec.id}
                record={rec}
                course={coursesById.get(rec.courseId)}
                onCorrect={() => setCorrecting(rec)}
              />
            ))
          )}
        </div>
      </Card>

      <AttendanceCorrectionDialog record={correcting} onClose={() => setCorrecting(null)} />
    </div>
  );
}