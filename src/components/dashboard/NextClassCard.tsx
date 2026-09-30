"use client";

import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useSemesterData } from "@/hooks/useSemesterData";
import { useNow } from "@/hooks/useTheme";
import { fmtCountdown } from "@/lib/format";
import {
  courseClassroom,
  courseProfessor,
} from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { courseColorClasses } from "@/lib/colors";

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function NextClassCard() {
  const { activeSchedules, courses, professors, classrooms } = useSemesterData();
  const now = useNow();

  const today = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const sessions = activeSchedules
    .filter((s) => s.weekday === today)
    .map((s) => ({ schedule: s, startMin: toMin(s.startTime), endMin: toMin(s.endTime) }))
    .sort((a, b) => a.startMin - b.startMin);

  const next =
    sessions.find((s) => s.startMin <= nowMin && s.endMin > nowMin) ??
    sessions.find((s) => s.startMin > nowMin) ??
    null;

  if (!next) {
    const nextWeekday = (() => {
      for (let i = 1; i <= 7; i++) {
        const target = (today + i) % 7;
        const found = activeSchedules.find((s) => s.weekday === target);
        if (found) return found;
      }
      return null;
    })();
    return (
      <Card className="fade-up flex min-h-[188px] flex-col justify-center p-6">
        {nextWeekday ? (
          <>
            <p className="text-sm font-medium text-text-muted">Sin más clases hoy</p>
            <p className="mt-1 text-sm text-text">
              Tu próxima clase es {nextWeekday.startTime} del curso{" "}
              {courses.find((c) => c.id === nextWeekday.courseId)?.name}.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-text-muted">Sin clases el día de hoy</p>
            <p className="mt-1 text-sm text-text">Disfruta el descanso o adelanta tareas.</p>
          </>
        )}
      </Card>
    );
  }

  const { schedule } = next;
  const course = courses.find((c) => c.id === schedule.courseId);
  if (!course) return null;
  const color = courseColorClasses(course.color);
  const professor = courseProfessor(professors, course.professorId);
  const classroom = courseClassroom(classrooms, course.classroomId);
  const ongoing = next.startMin <= nowMin;

  return (
    <Card
      className={cn(
        "fade-up relative overflow-hidden p-0",
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", color.bar)} />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">
            {ongoing ? "Clase en curso" : "Próxima clase"}
          </p>
          <Badge tone={ongoing ? "accent" : "warning"} dot>
            {ongoing
              ? `Termina en ${fmtCountdown(new Date(toDate2(schedule.endTime)))}`
              : `Comienza en ${fmtCountdown(new Date(toDate2(schedule.startTime)))}`}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", color.dot)} />
              <h2 className="truncate text-lg font-semibold tracking-tight text-text sm:text-xl">
                {course.name}
              </h2>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {professor ? `${professor.title} ${professor.name}` : "Sin profesor asignado"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-text-muted">
              <span className="inline-flex items-center gap-1.5 tabular">
                <Clock size={15} aria-hidden="true" />
                {schedule.startTime} – {schedule.endTime}
              </span>
              {classroom ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={15} aria-hidden="true" />
                  {classroom.name} · {classroom.building}
                </span>
              ) : null}
            </div>
          </div>

          <Link
            href={`/courses/${course.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft"
          >
            Abrir materia
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function toDate2(time: string): string {
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m || 0, 0, 0);
  return d.toISOString();
}
