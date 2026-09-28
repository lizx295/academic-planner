"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, UserCheck } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { useSemesterData } from "@/hooks/useSemesterData";
import { attendanceStats, warningsFor } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export function AttendanceMini() {
  const { activeAttendance, activeCourses } = useSemesterData();
  const stats = attendanceStats(activeAttendance);
  const snaps = new Map<string, ReturnType<typeof attendanceStats>>();
  const byCourse = new Map<string, typeof activeAttendance>();
  for (const r of activeAttendance) {
    const list = byCourse.get(r.courseId) ?? [];
    list.push(r);
    byCourse.set(r.courseId, list);
  }
  for (const [id, list] of byCourse) snaps.set(id, attendanceStats(list));

  const warnings = warningsFor(snaps, activeCourses.map((c) => c.id));
  const percent = stats.percent ?? 0;

  return (
    <Card className="fade-up">
      <CardHeader
        title="Asistencia"
        description="Resumen general del semestre."
        action={
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
            aria-label="Ver asistencia"
          >
            Ver más
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-accent-soft">
          <span className="text-sm font-semibold tabular text-accent">{percent}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <Progress value={percent} tone={percent < 75 ? "danger" : percent < 85 ? "warning" : "success"} large />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-text-muted">
            <span className="tabular">{stats.present} asistidas</span>
            <span className="tabular">{stats.absent} faltas</span>
            <span className="tabular">{stats.excused} justificadas</span>
            {stats.pending > 0 ? <span className="tabular">{stats.pending} por confirmar</span> : null}
          </div>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="mt-4 space-y-2">
          {warnings.map((w) => {
            const course = activeCourses.find((c) => c.id === w.courseId);
            return (
              <Link
                key={w.courseId}
                href={`/courses/${w.courseId}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[13px] transition-colors hover:bg-surface-subtle",
                  w.level === "critical"
                    ? "border-absent/30 bg-absent-soft/40 text-absent"
                    : "border-pending/30 bg-pending-soft/40 text-pending",
                )}
              >
                <CircleAlert size={16} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-text">
                  {course?.name ?? "Materia"}
                </span>
                <span className="font-semibold tabular">{w.percent}%</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-present-soft/50 px-3 py-2 text-[13px] text-present">
          <UserCheck size={15} aria-hidden="true" />
          Tu asistencia está al día.
        </div>
      )}
    </Card>
  );
}