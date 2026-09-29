import { create } from "zustand";
import { persist } from "zustand/middleware";

import { buildSeedData, emptyData } from "@/lib/seed";
import { uid } from "@/lib/utils";
import { mergeCanvasSync, upgradeCanvasCourseSections } from "@academic-planner/core";
import type {
  AppNotification,
  Assessment,
  AssessmentKind,
  AttendanceRecord,
  AttendanceStatus,
  Course,
  CourseColor,
  CourseSchedule,
  Grade,
  Material,
  NotionWorkspace,
  PersonalEvent,
  Profile,
  Professor,
  Classroom,
  CanvasSyncPayload,
  Semester,
  Task,
  TaskPriority,
  TaskStatus,
  ThemePreference,
  Weekday,
} from "@/types";

export interface CourseDraft {
  code: string;
  name: string;
  semesterId: string;
  professorId: string;
  classroomId: string;
  color: CourseColor;
  credits: number;
  notionUrl?: string | null;
  schedules: Array<{ weekday: Weekday; startTime: string; endTime: string }>;
}

interface AppStore {
  // --- datos ---
  initialized: boolean;
  profile: Profile;
  activeSemesterId: string;
  semesters: Semester[];
  professors: Professor[];
  classrooms: Classroom[];
  courses: Course[];
  schedules: CourseSchedule[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  assessments: Assessment[];
  grades: Grade[];
  notifications: AppNotification[];
  notionWorkspaces: NotionWorkspace[];
  materials: Material[];
  personalEvents: PersonalEvent[];
  theme: ThemePreference;

  // --- preferencias ---
  setTheme: (theme: ThemePreference) => void;
  setActiveSemester: (id: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  addProfessor: (name: string, title?: string, email?: string) => string;
  addClassroom: (name: string, building?: string) => string;
  deleteProfessor: (id: string) => void;
  deleteClassroom: (id: string) => void;

  // --- ciclo de datos ---
  resetData: () => void;
  clearData: () => void;
  /** Restaura (o fusiona) datos desde un archivo exportado o importado. */
  patchData: (fragment: Partial<AppStore>) => void;

  // --- cursos ---
  addCourse: (draft: CourseDraft) => string;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  setCourseSchedules: (
    courseId: string,
    schedules: Array<{ weekday: Weekday; startTime: string; endTime: string }>,
  ) => void;
  deleteCourse: (id: string) => void;
  updateNotionUrl: (courseId: string, url: string | null) => void;
  upsertWorkspace: (ws: Omit<NotionWorkspace, "id">) => void;

  // --- tareas ---
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;

  // --- evaluaciones y calificaciones ---
  addAssessment: (a: Omit<Assessment, "id" | "status">) => void;
  updateAssessment: (id: string, patch: Partial<Assessment>) => void;
  deleteAssessment: (id: string) => void;
  setGrade: (assessmentId: string, courseId: string, score: number, note?: string) => void;

  // --- asistencia ---
  respondAttendance: (id: string, status: "present" | "absent") => void;
  correctAttendance: (id: string, status: AttendanceStatus) => void;

  // --- materiales ---
  addMaterial: (m: Omit<Material, "id">) => void;
  deleteMaterial: (id: string) => void;

  // --- eventos personales ---
  addPersonalEvent: (e: Omit<PersonalEvent, "id">) => void;
  deletePersonalEvent: (id: string) => void;

  // --- notificaciones ---
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;

  // --- importación ---
  importCourses: (drafts: CourseDraft[]) => number;
  importPersonalEvents: (events: Array<Omit<PersonalEvent, "id">>) => void;
  importTasks: (tasks: Array<Omit<Task, "id" | "createdAt">>) => void;
  applyCanvasSync: (payload: CanvasSyncPayload) => void;
}

const empty = emptyData();

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      initialized: false,
      theme: "system" as ThemePreference,
      ...empty,

setTheme: (theme) => set({ theme }),
  setActiveSemester: (activeSemesterId) => set({ activeSemesterId }),
  updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

  addProfessor: (name, title = "", email = "") => {
    const id = uid("pr");
    set((s) => ({ professors: [...s.professors, { id, name, title, email }] }));
    return id;
  },
  addClassroom: (name, building = "") => {
    const id = uid("cl");
    set((s) => ({ classrooms: [...s.classrooms, { id, name, building }] }));
    return id;
  },
  deleteProfessor: (id) =>
    set((s) => ({
      professors: s.professors.filter((p) => p.id !== id),
      courses: s.courses.map((c) => (c.professorId === id ? { ...c, professorId: "" } : c)),
    })),
  deleteClassroom: (id) =>
    set((s) => ({
      classrooms: s.classrooms.filter((c) => c.id !== id),
      courses: s.courses.map((c) => (c.classroomId === id ? { ...c, classroomId: "" } : c)),
    })),

      resetData: () =>
        set((s) => ({ ...buildSeedData(), initialized: true, theme: s.theme })),
      clearData: () =>
        set((s) => ({
          ...empty,
          initialized: true,
          theme: s.theme,
        })),

      patchData: (fragment) =>
        set((s) => upgradeCanvasCourseSections({
            ...s,
            ...fragment,
            theme: fragment.theme ?? s.theme,
            initialized: true,
          })),

      addCourse: (draft) => {
        const courseId = uid("co");
        const course: Course = {
          id: courseId,
          semesterId: draft.semesterId,
          code: draft.code,
          name: draft.name,
          professorId: draft.professorId,
          classroomId: draft.classroomId,
          color: draft.color,
          credits: draft.credits,
          notionUrl: draft.notionUrl ?? null,
        };
        const schedules: CourseSchedule[] = draft.schedules.map((s) => ({
          id: uid("sch"),
          courseId,
          weekday: s.weekday,
          startTime: s.startTime,
          endTime: s.endTime,
        }));
        set((s) => ({ courses: [...s.courses, course], schedules: [...s.schedules, ...schedules] }));
        return courseId;
      },

      updateCourse: (id, patch) =>
        set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      setCourseSchedules: (courseId, schedules) =>
        set((s) => ({
          schedules: [
            ...s.schedules.filter((x) => x.courseId !== courseId),
            ...schedules.map((sl) => ({
              id: uid("sch"),
              courseId,
              weekday: sl.weekday,
              startTime: sl.startTime,
              endTime: sl.endTime,
            })),
          ],
        })),

      deleteCourse: (id) =>
        set((s) => ({
          courses: s.courses.filter((c) => c.id !== id),
          schedules: s.schedules.filter((x) => x.courseId !== id),
          attendance: s.attendance.filter((x) => x.courseId !== id),
          tasks: s.tasks.filter((x) => x.courseId !== id),
          assessments: s.assessments.filter((x) => x.courseId !== id),
          grades: s.grades.filter((x) => x.courseId !== id),
          notionWorkspaces: s.notionWorkspaces.filter((x) => x.courseId !== id),
          materials: s.materials.filter((x) => x.courseId !== id),
        })),

      updateNotionUrl: (courseId, url) =>
        set((s) => ({
          courses: s.courses.map((c) => (c.id === courseId ? { ...c, notionUrl: url } : c)),
          notionWorkspaces: url
            ? s.notionWorkspaces.some((w) => w.courseId === courseId)
              ? s.notionWorkspaces.map((w) =>
                  w.courseId === courseId ? { ...w, pageUrl: url } : w,
                )
              : [
                  ...s.notionWorkspaces,
                  {
                    id: uid("nw"),
                    courseId,
                    title: `Apuntes — ${s.courses.find((c) => c.id === courseId)?.name ?? ""}`.trim(),
                    pageUrl: url,
                    integration: "manual",
                    lastSyncedAt: null,
                  },
                ]
            : s.notionWorkspaces,
        })),

      upsertWorkspace: (ws) =>
        set((s) => {
          const exists = s.notionWorkspaces.some((w) => w.courseId === ws.courseId);
          if (exists) {
            return {
              notionWorkspaces: s.notionWorkspaces.map((w) =>
                w.courseId === ws.courseId ? { ...w, ...ws, id: w.id } : w,
              ),
            };
          }
          return { notionWorkspaces: [...s.notionWorkspaces, { ...ws, id: uid("nw") }] };
        }),

      addTask: (task) =>
        set((s) => ({
          tasks: [{ ...task, id: uid("task"), createdAt: new Date().toISOString() }, ...s.tasks],
        })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      setTaskStatus: (id, status) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addAssessment: (a) =>
        set((s) => ({
          assessments: [
            { ...a, id: uid("ass"), status: "scheduled" as const },
            ...s.assessments,
          ],
        })),
      updateAssessment: (id, patch) =>
        set((s) => ({
          assessments: s.assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      deleteAssessment: (id) =>
        set((s) => ({
          assessments: s.assessments.filter((a) => a.id !== id),
          grades: s.grades.filter((g) => g.assessmentId !== id),
        })),
      setGrade: (assessmentId, courseId, score, note = "") =>
        set((s) => {
          const existing = s.grades.find((g) => g.assessmentId === assessmentId);
          if (existing) {
            return {
              grades: s.grades.map((g) =>
                g.assessmentId === assessmentId ? { ...g, score, note } : g,
              ),
            };
          }
          return {
            grades: [...s.grades, { id: uid("gr"), assessmentId, courseId, score, note }],
            assessments: s.assessments.map((a) =>
              a.id === assessmentId ? { ...a, status: "graded" as const } : a,
            ),
          };
        }),

      respondAttendance: (id, status) =>
        set((s) => {
          const record = s.attendance.find((a) => a.id === id);
          if (!record) return {};
          const course = s.courses.find((c) => c.id === record.courseId);
          return {
            attendance: s.attendance.map((a) =>
              a.id === id
                ? { ...a, status, responseTime: new Date().toISOString() }
                : a,
            ),
            notifications: [
              {
                id: uid("not"),
                kind: "attendance_confirm",
                title: status === "present" ? "Asistencia registrada" : "Inasistencia registrada",
                body: `${course?.name ?? "Materia"} — ${status === "present" ? "confirmaste que asististe" : "marcaste que no asististe"}.`,
                createdAt: new Date().toISOString(),
                read: false,
                refId: id,
              },
              ...s.notifications,
            ],
          };
        }),

      correctAttendance: (id, status) =>
        set((s) => ({
          attendance: s.attendance.map((a) =>
            a.id === id
              ? { ...a, status, responseTime: a.responseTime ?? new Date().toISOString() }
              : a,
          ),
        })),

      addMaterial: (m) => set((s) => ({ materials: [{ ...m, id: uid("mat") }, ...s.materials] })),
      deleteMaterial: (id) =>
        set((s) => ({ materials: s.materials.filter((m) => m.id !== id) })),

      addPersonalEvent: (e) =>
        set((s) => ({ personalEvents: [{ ...e, id: uid("pe") }, ...s.personalEvents] })),
      deletePersonalEvent: (id) =>
        set((s) => ({ personalEvents: s.personalEvents.filter((e) => e.id !== id) })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
      deleteNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

      importCourses: (drafts) => {
        let created = 0;
        for (const draft of drafts) {
          get().addCourse(draft);
          created++;
        }
        return created;
      },
      importPersonalEvents: (events) => {
        set((s) => ({
          personalEvents: [
            ...s.personalEvents,
            ...events.map((e) => ({ ...e, id: uid("pe") })),
          ],
        }));
      },
      importTasks: (tasks) => {
        set((s) => ({
          tasks: [
            ...s.tasks,
            ...tasks.map((t) => ({
              ...t,
              id: uid("task"),
              createdAt: new Date().toISOString(),
            })),
          ],
        }));
      },
      applyCanvasSync: (payload) => {
        set((s) => mergeCanvasSync(s, payload));
      },
    }),
    {
      name: "academic-planner-store",
      version: 2,
      migrate: (persisted) => upgradeCanvasCourseSections(persisted as AppStore),
      partialize: (s) => ({
        initialized: s.initialized,
        profile: s.profile,
        activeSemesterId: s.activeSemesterId,
        semesters: s.semesters,
        professors: s.professors,
        classrooms: s.classrooms,
        courses: s.courses,
        schedules: s.schedules,
        attendance: s.attendance,
        tasks: s.tasks,
        assessments: s.assessments,
        grades: s.grades,
        notifications: s.notifications,
        notionWorkspaces: s.notionWorkspaces,
        materials: s.materials,
        personalEvents: s.personalEvents,
        theme: s.theme,
      }),
    },
  ),
);

/** Para que el store nunca arranque vacío sin semestre activo. */
export function ensureSeedData(): void {
  const { initialized } = useAppStore.getState();
  if (!initialized) {
    useAppStore.getState().resetData();
  }
}

export { emptyData };
export { buildSeedData };

export type { AppStore };
export type { AssessmentKind };
export type { TaskPriority, TaskStatus };

/** Estado serializable que se guarda tanto localmente como en Supabase. */
export function getPersistedPlannerState() {
  const s = useAppStore.getState();
  return {
    initialized: s.initialized,
    profile: s.profile,
    activeSemesterId: s.activeSemesterId,
    semesters: s.semesters,
    professors: s.professors,
    classrooms: s.classrooms,
    courses: s.courses,
    schedules: s.schedules,
    attendance: s.attendance,
    tasks: s.tasks,
    assessments: s.assessments,
    grades: s.grades,
    notifications: s.notifications,
    notionWorkspaces: s.notionWorkspaces,
    materials: s.materials,
    personalEvents: s.personalEvents,
    theme: s.theme,
  };
}
