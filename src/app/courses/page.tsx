"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { BookOpen, Plus } from "lucide-react";

import { useSemesterData } from "@/hooks/useSemesterData";
import { useAppStore } from "@/store/app";
import {
  attendanceForCourse,
  courseClassroom,
  courseProfessor,
  courseSchedules,
  tasksForCourse,
} from "@/lib/selectors";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseFormDialog } from "@/components/courses/CourseFormDialog";

export default function CoursesPage() {
  const {
    courses,
    activeCourses,
    professors,
    classrooms,
    schedules,
    attendance,
    tasks,
    assessments,
  } = useSemesterData();
  const semester = useSemesterData().semester;
  const [open, setOpen] = useState(false);

  const extras = useMemo(() => {
    return Object.fromEntries(
      activeCourses.map((course) => {
        const upcoming = assessments
          .filter((a) => a.courseId === course.id && a.status !== "graded")
          .sort((a, b) => a.date.localeCompare(b.date))[0];
        return [
          course.id,
          {
            attendance: attendanceForCourse(attendance, course.id),
            pendingTasks: tasksForCourse(tasks, course.id, ["pending", "in_progress"]).length,
            nextAssessment: upcoming
              ? format(parseISO(upcoming.date), "d MMM", { locale: es })
              : undefined,
          },
        ];
      }),
    );
  }, [activeCourses, assessments, attendance, tasks]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Materias"
subtitle={
            semester
              ? `${semester.label} · ${semester.startsAt.slice(0, 4)}`
              : "Organiza tus materias del semestre"
          }
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Nueva materia
          </Button>
        }
      />

      {activeCourses.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} aria-hidden="true" />}
          title="Todavía no tienes materias"
          description="Crea tu primera materia o importa tus datos desde un archivo en Configuración."
          action={
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus size={16} /> Crear materia
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              schedules={courseSchedules(schedules, course.id)}
              professor={courseProfessor(professors, course.professorId)}
              classroom={courseClassroom(classrooms, course.classroomId)}
              attendance={extras[course.id]?.attendance}
              pendingTasks={extras[course.id]?.pendingTasks ?? 0}
              nextAssessment={extras[course.id]?.nextAssessment}
            />
          ))}
        </div>
      )}

      {courses.length > activeCourses.length ? (
        <p className="text-center text-[13px] text-text-faint">
          {courses.length - activeCourses.length} materias de otros semestres ocultas
        </p>
      ) : null}
      <CourseFormDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}