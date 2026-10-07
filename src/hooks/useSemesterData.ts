"use client";

import { useMemo } from "react";

import { useAppStore } from "@/store/app";

/**
 * Expone los datos del semestre activo con derivaciones memoizadas.
 * Las suscripciones apuntan a arreglos estables del store para evitar
 * re-renders innecesarios.
 */
export function useSemesterData() {
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);
  const profile = useAppStore((s) => s.profile);
  const professors = useAppStore((s) => s.professors);
  const classrooms = useAppStore((s) => s.classrooms);
  const courses = useAppStore((s) => s.courses);
  const schedules = useAppStore((s) => s.schedules);
  const attendance = useAppStore((s) => s.attendance);
  const tasks = useAppStore((s) => s.tasks);
  const assessments = useAppStore((s) => s.assessments);
  const grades = useAppStore((s) => s.grades);
  const notionWorkspaces = useAppStore((s) => s.notionWorkspaces);
  const materials = useAppStore((s) => s.materials);
  const personalEvents = useAppStore((s) => s.personalEvents);
  const dashboardItems = useAppStore((s) => s.dashboardItems);

  const semester = useMemo(
    () => useAppStore.getState().semesters.find((s) => s.id === activeSemesterId),
    [activeSemesterId],
  );

  const activeCourses = useMemo(
    () => courses.filter((c) => c.semesterId === activeSemesterId),
    [courses, activeSemesterId],
  );

  const activeCourseIds = useMemo(() => new Set(activeCourses.map((c) => c.id)), [activeCourses]);

  const activeSchedules = useMemo(
    () => schedules.filter((s) => activeCourseIds.has(s.courseId)),
    [schedules, activeCourseIds],
  );

  const activeAttendance = useMemo(
    () => attendance.filter((a) => activeCourseIds.has(a.courseId)),
    [attendance, activeCourseIds],
  );

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.courseId || activeCourseIds.has(t.courseId)),
    [tasks, activeCourseIds],
  );

  const activeAssessments = useMemo(
    () => assessments.filter((a) => activeCourseIds.has(a.courseId)),
    [assessments, activeCourseIds],
  );

  const activeMaterials = useMemo(
    () => materials.filter((m) => activeCourseIds.has(m.courseId)),
    [materials, activeCourseIds],
  );

  const activeWorkspaces = useMemo(
    () => notionWorkspaces.filter((w) => activeCourseIds.has(w.courseId)),
    [notionWorkspaces, activeCourseIds],
  );

  const activeDashboardItems = useMemo(
    () => dashboardItems.filter((item) => !item.courseId || activeCourseIds.has(item.courseId)),
    [dashboardItems, activeCourseIds],
  );

  return {
    activeSemesterId,
    semester,
    profile,
    professors,
    classrooms,
    courses,
    activeCourses,
    schedules,
    activeSchedules,
    attendance,
    activeAttendance,
    tasks,
    activeTasks,
    assessments,
    activeAssessments,
    grades,
    notionWorkspaces,
    activeWorkspaces,
    materials,
    activeMaterials,
    personalEvents,
    dashboardItems,
    activeDashboardItems,
  };
}
