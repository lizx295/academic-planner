"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, CalendarClock, ClipboardList, MapPin, User } from "lucide-react";

import type { AttendanceStat } from "@/lib/selectors";
import { courseColorClasses } from "@/lib/colors";
import { WEEKDAY_SHORT } from "@/lib/constants";
import type { Classroom, Course, CourseSchedule, Professor } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";

interface CourseCardProps {
  course: Course;
  schedules: CourseSchedule[];
  professors: Professor[];
  classroom?: Classroom;
  attendance?: AttendanceStat;
  pendingTasks: number;
  nextAssessment?: string;
}

export function CourseCard({
  course,
  schedules,
  professors,
  classroom,
  attendance,
  pendingTasks,
  nextAssessment,
}: CourseCardProps) {
  const cls = courseColorClasses(course.color);
  const weekdays = schedules
    .map((s) => s.weekday)
    .sort((a, b) => [1, 2, 3, 4, 5, 6, 0].indexOf(a) - [1, 2, 3, 4, 5, 6, 0].indexOf(b));
  const occurrences = weekdays.map((w) => WEEKDAY_SHORT[w]).join(" · ");
  const professorById = new Map(professors.map((item) => [item.id, item]));
  const professor = professorById.get(course.professorId);
  const showSections = (course.sections?.length ?? 0) > 1;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="surface-card group relative block h-full overflow-hidden p-4 transition-colors duration-150 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1", cls.bar)}
      />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", cls.dot)} />
            <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
              {course.code}
            </p>
          </div>
          <h3 className="mt-1 break-words pr-1 text-[15px] font-semibold leading-snug tracking-tight text-text">
            {course.name}
          </h3>
        </div>
        <ArrowUpRight
          size={18}
          className="mt-0.5 shrink-0 text-text-faint transition-colors duration-150 group-hover:text-text"
          aria-hidden="true"
        />
      </div>

      {showSections ? (
        <div className="mt-4 grid grid-cols-2 gap-2 pl-2">
          {course.sections?.map((section) => {
            const sectionProfessors = section.professorIds
              .map((id) => professorById.get(id))
              .filter((item): item is Professor => Boolean(item));
            return (
              <div key={section.id} className="min-w-0 rounded-xl border border-border bg-surface-subtle/60 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">{section.label}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">
                  {sectionProfessors.length > 0
                    ? sectionProfessors.map((item) => `${item.title ? `${item.title} ` : ""}${item.name}`).join(", ")
                    : "Docente no informado"}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 space-y-1.5 pl-2 text-[13px] text-text-muted">
        {!showSections && professor ? (
          <p className="flex items-center gap-2">
            <User size={14} className="shrink-0 text-text-faint" aria-hidden="true" />
            <span className="truncate">
              {professor.title ? `${professor.title} ` : ""}
              {professor.name}
            </span>
          </p>
        ) : !showSections ? (
          <p className="flex items-center gap-2">
            <User size={14} className="shrink-0 text-text-faint" aria-hidden="true" />
            <span>Sin profesor asignado</span>
          </p>
        ) : null}
        {occurrences ? (
          <p className="flex items-center gap-2">
            <CalendarClock size={14} className="shrink-0 text-text-faint" aria-hidden="true" />
            <span className="truncate">{occurrences}</span>
          </p>
        ) : null}
        {classroom ? (
          <p className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0 text-text-faint" aria-hidden="true" />
            <span className="truncate">{classroom.name}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_100px] items-center gap-2 pl-2">
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-text-muted">
            <ClipboardList size={14} className="text-text-faint" aria-hidden="true" />
            {pendingTasks > 0 ? `${pendingTasks} tarea${pendingTasks === 1 ? "" : "s"}` : "Sin tareas"}
          </span>
          {nextAssessment ? <Badge tone="accent">{nextAssessment}</Badge> : null}
        </div>
        {attendance && attendance.total > 0 ? (
          <div className="flex w-[100px] shrink-0 items-center gap-1.5">
            <Progress
              value={attendance.percent ?? 0}
              tone={attendance.percent === null || attendance.percent >= 80 ? "success" : "warning"}
              className="h-1.5"
            />
            <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-text-muted">
              {attendance.percent ?? "–"}%
            </span>
          </div>
        ) : <span aria-hidden="true" />}
      </div>
    </Link>
  );
}

/** Icono de "materia" para estados vacíos. */
export function CourseBugIcon() {
  return <BookOpen size={40} strokeWidth={1.4} aria-hidden="true" />;
}
