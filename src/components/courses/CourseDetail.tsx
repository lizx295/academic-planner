"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  User,
  CircleCheck,
  ListTree,
  Lock,
} from "lucide-react";

import { useAppStore } from "@/store/app";
import {
  assessmentsForCourse,
  attendanceForCourse,
  courseClassroom,
  courseProfessor,
  courseSchedules,
  tasksForCourse,
  weightedGrade,
} from "@/lib/selectors";
import { courseColorClasses } from "@/lib/colors";
import { WEEKDAY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, Assessment, CourseColor, Task } from "@/types";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseFormDialog } from "@/components/courses/CourseFormDialog";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { AssessmentRow } from "@/components/assessments/AssessmentRow";
import { AssessmentFormDialog } from "@/components/assessments/AssessmentFormDialog";
import { ActivityDetailsDialog, type AcademicActivity } from "@/components/activities/ActivityDetails";
import { AttendanceRow } from "@/components/attendance/AttendanceRow";
import { AttendanceCorrectionDialog } from "@/components/attendance/AttendanceCorrectionDialog";
import { MaterialFormDialog } from "@/components/materials/MaterialFormDialog";
import { WorkspaceDialog } from "@/components/notes/WorkspaceDialog";

type Tab =
  | "resumen"
  | "horario"
  | "asistencia"
  | "tareas"
  | "evaluaciones"
  | "calificaciones"
  | "contenidos"
  | "materiales"
  | "workspace";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "horario", label: "Horario" },
  { id: "asistencia", label: "Asistencia" },
  { id: "tareas", label: "Tareas" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "calificaciones", label: "Calificaciones" },
  { id: "contenidos", label: "Módulos" },
  { id: "materiales", label: "Materiales" },
  { id: "workspace", label: "Workspace" },
];

const MATERIAL_ICON = {
  pdf: FileText,
  slides: FileText,
  link: Link2,
  video: CalendarClock,
  doc: FileText,
};

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id ?? "";

  const courses = useAppStore((s) => s.courses);
  const schedules = useAppStore((s) => s.schedules);
  const attendance = useAppStore((s) => s.attendance);
  const tasks = useAppStore((s) => s.tasks);
  const assessments = useAppStore((s) => s.assessments);
  const grades = useAppStore((s) => s.grades);
  const professors = useAppStore((s) => s.professors);
  const classrooms = useAppStore((s) => s.classrooms);
  const semesters = useAppStore((s) => s.semesters);
  const materials = useAppStore((s) => s.materials);
  const modules = useAppStore((s) => s.modules);
  const moduleItems = useAppStore((s) => s.moduleItems);
  const notionWorkspaces = useAppStore((s) => s.notionWorkspaces);
  const deleteCourse = useAppStore((s) => s.deleteCourse);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const deleteAssessment = useAppStore((s) => s.deleteAssessment);
  const deleteMaterial = useAppStore((s) => s.deleteMaterial);

  const course = courses.find((c) => c.id === courseId);

  const [tab, setTab] = useState<Tab>("resumen");
  const [formOpen, setFormOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });
  const [assessmentForm, setAssessmentForm] = useState<{
    open: boolean;
    assessment: Assessment | null;
  }>({ open: false, assessment: null });
  const [detailsFor, setDetailsFor] = useState<AcademicActivity | null>(null);
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const courseSched = useMemo(
    () => (course ? courseSchedules(schedules, course.id) : []),
    [schedules, course],
  );
  const courseAtt = useMemo(
    () => (course ? attendanceForCourse(attendance, course.id) : null),
    [attendance, course],
  );
  const courseTasks = useMemo(
    () => (course ? tasksForCourse(tasks, course.id) : []),
    [tasks, course],
  );
  const openTasks = useMemo(
    () => courseTasks.filter((t) => t.status !== "completed"),
    [courseTasks],
  );
  const courseAssessments = useMemo(
    () => (course ? assessmentsForCourse(assessments, course.id) : []),
    [assessments, course],
  );
  const gradingGroups = useMemo(() => {
    const groups = new Map<string, { name: string; weight: number }>();
    for (const assessment of courseAssessments) {
      if (!assessment.gradingGroupName || assessment.gradingGroupWeight == null) continue;
      const key = `${assessment.gradingGroupName}:${assessment.gradingGroupWeight}`;
      groups.set(key, { name: assessment.gradingGroupName, weight: assessment.gradingGroupWeight });
    }
    return [...groups.values()].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
  }, [courseAssessments]);
  const gradedInfo = useMemo(
    () => (course ? weightedGrade(assessments, grades, course.id) : null),
    [assessments, grades, course],
  );
  const courseMaterials = useMemo(
    () => materials.filter((m) => m.courseId === courseId).sort((a, b) => (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? "") || a.title.localeCompare(b.title)),
    [materials, courseId],
  );
  const courseModules = useMemo(
    () => modules.filter((item) => item.courseId === courseId).sort((a, b) => a.position - b.position),
    [modules, courseId],
  );
  const itemsByModule = useMemo(() => {
    const grouped = new Map<string, typeof moduleItems>();
    for (const item of moduleItems.filter((entry) => entry.courseId === courseId)) {
      grouped.set(item.moduleId, [...(grouped.get(item.moduleId) ?? []), item]);
    }
    for (const items of grouped.values()) items.sort((a, b) => a.position - b.position);
    return grouped;
  }, [moduleItems, courseId]);
  const workspace = useMemo(
    () => notionWorkspaces.find((w) => w.courseId === courseId),
    [notionWorkspaces, courseId],
  );

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Volver a materias
        </Link>
        <EmptyState
          icon={<BookOpen size={22} aria-hidden="true" />}
          title="Materia no encontrada"
          description="Es posible que haya sido eliminada o que el enlace no sea válido."
          action={
            <Button variant="primary" onClick={() => router.push("/courses")}>
              Ir a materias
            </Button>
          }
        />
      </div>
    );
  }

  const cls = courseColorClasses(course.color);
  const professor = courseProfessor(professors, course.professorId);
  const professorById = new Map(professors.map((item) => [item.id, item]));
  const classroom = courseClassroom(classrooms, course.classroomId);
  const semester = semesters.find((s) => s.id === course.semesterId);
  const nextAssessment = courseAssessments
    .filter((a) => a.status !== "graded")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const attPercent = courseAtt?.percent;
  const attTone =
    attPercent === null || attPercent === undefined
      ? "accent"
      : attPercent >= 80
        ? "success"
        : attPercent >= 60
          ? "warning"
          : "danger";
  const gradedDown = courseAssessments.filter((a) => a.status === "graded");
  const totalGradedWeight = gradedDown.reduce((acc, a) => acc + a.weight, 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Materias
        </Link>
      </div>

      <div className="surface-card relative overflow-hidden p-5">
        <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5", cls.bar)} />
        <div className="flex flex-wrap items-start justify-between gap-3 pl-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", cls.dot)} />
              <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
                {course.code} · {semester?.label ?? "Semestre"}
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
              {course.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
              {professor ? (
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-text-faint" aria-hidden="true" />
                  {professor.title ? `${professor.title} ` : ""}
                  {professor.name}
                </span>
              ) : null}
              {classroom ? (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-text-faint" aria-hidden="true" />
                  {classroom.name}
                  {classroom.building ? ` · ${classroom.building}` : ""}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-text-faint" aria-hidden="true" />
                {course.credits} {course.credits === 1 ? "crédito" : "créditos"}
              </span>
            </div>
            {(course.sections?.length ?? 0) > 1 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {course.sections?.map((section) => {
                  const names = section.professorIds
                    .map((id) => professorById.get(id))
                    .filter(Boolean)
                    .map((item) => `${item?.title ? `${item.title} ` : ""}${item?.name ?? ""}`);
                  return (
                    <div key={section.id} className="min-w-0 rounded-xl border border-border bg-surface-subtle/60 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{section.label}</p>
                        {section.externalUrl ? (
                          <a
                            href={section.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-text-faint transition-colors hover:text-accent"
                            aria-label={`Abrir ${section.label} en Canvas`}
                          >
                            <ExternalLink size={13} />
                          </a>
                        ) : null}
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-text-muted">
                        {names.length > 0 ? names.join(", ") : "Docente no informado"}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          {course.source !== "canvas" ? <div className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Pencil size={14} /> Editar
            </Button>
            <IconButton
              aria-label="Eliminar materia"
              variant="ghost"
              className="text-absent hover:bg-absent-soft"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} />
            </IconButton>
          </div> : null}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Secciones de la materia"
        className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`tab-${t.id}`}
            id={`tab-btn-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150",
              tab === t.id
                ? "border-accent text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`tab-${tab}`} aria-labelledby={`tab-btn-${tab}`}>
        {tab === "resumen" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="grid grid-cols-2 gap-3 p-4">
              <StatChip
                label="Asistencia"
                value={attPercent === null || attPercent === undefined ? "—" : `${attPercent}%`}
                hint={`${courseAtt?.present ?? 0} de ${courseAtt?.total ?? 0} clases`}
              />
              <StatChip
                label="Tareas abiertas"
                value={String(openTasks.length)}
                hint={openTasks.length === 0 ? "Todo listo" : "Sin completar"}
              />
              <StatChip
                label="Promedio"
                value={gradedInfo?.average !== null && gradedInfo?.average !== undefined ? String(gradedInfo.average) : "—"}
                hint={gradedInfo ? `${totalGradedWeight}% calificado` : "Sin notas"}
              />
              <StatChip
                label="Materiales"
                value={String(courseMaterials.length)}
                hint="Enlace a recursos"
              />
            </Card>

            <Card className="p-4">
              <CardHeader
                title="Próxima evaluación"
                description={
                  nextAssessment
                    ? `${nextAssessment.name} · ${format(parseISO(nextAssessment.date), "EEE d MMM", { locale: es })}`
                    : "No hay evaluaciones agendadas"
                }
                action={
                  nextAssessment ? <Badge tone="accent">{nextAssessment.weight}%</Badge> : null
                }
              />
              {nextAssessment ? (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-subtle px-3 py-2 text-sm">
                  <span className="text-text-muted">Calificar antes del</span>
                  <span className="font-medium text-text">{nextAssessment.time ?? "Todo el día"}</span>
                </div>
              ) : null}
            </Card>

            <Card className="p-4">
              <CardHeader
                title="Acceso rápido"
                description="Páginas de apuntes y recursos de la materia"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => setWorkspaceOpen(true)}>
                  <ExternalLink size={14} /> Notion
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setMaterialOpen(true)}>
                  <Plus size={14} /> Material
                </Button>
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "horario" ? (
          <Card className="divide-y divide-border">
            {courseSched.length === 0 ? (
              <EmptyState
                icon={<CalendarClock size={22} aria-hidden="true" />}
                title="Sin horario"
                description="Agrega bloques de horario semanal al editar la materia."
              />
            ) : (
              courseSched.map((slot) => (
                <div key={slot.id} className="flex items-center gap-3 px-4 py-3">
                  <span aria-hidden="true" className={cn("h-9 w-1 rounded-full", cls.bar)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{WEEKDAY_LABELS[slot.weekday]}</p>
                    <p className="text-xs text-text-muted">
                      {slot.startTime} – {slot.endTime}
                    </p>
                  </div>
                  {classroom ? (
                    <span className="flex items-center gap-1.5 text-sm text-text-muted">
                      <MapPin size={14} className="text-text-faint" aria-hidden="true" />
                      {classroom.name}
                    </span>
                  ) : null}
                  <span className="hidden text-xs text-text-faint sm:block">{course.code}</span>
                </div>
              ))
            )}
          </Card>
        ) : null}

        {tab === "asistencia" ? (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">Asistencia general</p>
                  <p className="text-xs text-text-muted">
                    {courseAtt?.present ?? 0} presentes · {courseAtt?.absent ?? 0} ausentes ·{" "}
                    {courseAtt?.excused ?? 0} justificadas
                    {courseAtt && courseAtt.pending > 0
                      ? ` · ${courseAtt.pending} sin responder`
                      : ""}
                  </p>
                </div>
                <span className="text-2xl font-semibold tabular-nums text-accent">
                  {attPercent === null || attPercent === undefined ? "—" : `${attPercent}%`}
                </span>
              </div>
              <Progress value={attPercent ?? 0} tone={attTone} className="mt-4 h-2" />
              <p className="mt-2 text-xs text-text-faint">
                {attPercent === null || attPercent === undefined
                  ? "Registra tus asistencias para ver la estadística."
                  : attPercent >= 80
                    ? "Estás por encima del 80 % de asistencia."
                    : attPercent >= 60
                      ? "Estás cerca del límite: procura no faltar más."
                      : "Alerta: tu asistencia está por debajo del 60 %."}
              </p>
            </Card>
            <Card>
              <div className="px-4 pt-3">
                <p className="text-sm font-semibold tracking-tight text-text">
                  Registro de clases
                </p>
              </div>
              <div className="mt-1 divide-y divide-border pb-1">
                {courseAttRecords(attendance, courseId).map((rec) => (
                  <AttendanceRow
                    key={rec.id}
                    record={rec}
                    course={course}
                    onCorrect={() => setCorrecting(rec)}
                  />
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "tareas" ? (
          <Card className="divide-y divide-border">
            {courseTasks.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={22} aria-hidden="true" />}
                title="Sin tareas"
                description="Crea tareas y se agruparán por materia en la página Tareas."
                action={
                  <Button variant="primary" size="sm" onClick={() => setTaskForm({ open: true, task: null })}>
                    <Plus size={14} /> Nueva tarea
                  </Button>
                }
              />
            ) : (
              <>
                {courseTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    course={course}
                    onOpen={() => setDetailsFor(t)}
                    canEdit={t.source !== "canvas"}
                    onEdit={t.source === "canvas" ? undefined : () => setTaskForm({ open: true, task: t })}
                    onDelete={t.source === "canvas" ? undefined : () => deleteTask(t.id)}
                  />
                ))}
                <div className="px-3 py-3">
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => setTaskForm({ open: true, task: null })}
                  >
                    <Plus size={14} /> Nueva tarea
                  </Button>
                </div>
              </>
            )}
          </Card>
        ) : null}

        {tab === "evaluaciones" ? (
          <Card className="divide-y divide-border">
            {courseAssessments.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={22} aria-hidden="true" />}
                title="Sin evaluaciones"
                description="Programa parciales, proyectos y entregas con su peso en la nota."
                action={
                  <Button variant="primary" size="sm" onClick={() => setAssessmentForm({ open: true, assessment: null })}>
                    <Plus size={14} /> Nueva evaluación
                  </Button>
                }
              />
            ) : (
              <>
                {courseAssessments.map((a) => (
                  <AssessmentRow
                    key={a.id}
                    assessment={a}
                    courseColor={course.color}
                    gradeScore={grades.find((g) => g.assessmentId === a.id)?.score}
                    onOpen={() => setDetailsFor(a)}
                    onEdit={a.source === "canvas" ? undefined : () => setAssessmentForm({ open: true, assessment: a })}
                    onDelete={a.source === "canvas" ? undefined : () => deleteAssessment(a.id)}
                  />
                ))}
                <div className="px-3 py-3">
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => setAssessmentForm({ open: true, assessment: null })}
                  >
                    <Plus size={14} /> Nueva evaluación
                  </Button>
                </div>
              </>
            )}
          </Card>
        ) : null}

        {tab === "calificaciones" ? (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Promedio ponderado</p>
                  <p className="text-xs text-text-muted">
                    {totalGradedWeight}% de la nota del semestre calificada
                  </p>
                </div>
                <span className="text-3xl font-semibold tabular-nums text-text">
                  {gradedInfo?.average !== null && gradedInfo?.average !== undefined
                    ? gradedInfo.average
                    : "—"}
                </span>
              </div>
              <Progress value={totalGradedWeight} tone="accent" className="mt-4 h-2" />
              <p className="mt-2 text-xs text-text-faint">
                {totalGradedWeight < 100
                  ? `Faltan ${100 - totalGradedWeight} puntos de calificación por registrar.`
                  : "Calificaciones completas para el semestre."}
              </p>
            </Card>
            {gradingGroups.length > 0 ? (
              <Card className="p-4">
                <CardHeader
                  title="Ponderaciones de Canvas"
                  description="Categorías configuradas por el docente para calcular la nota final."
                />
                <div className="mt-4 space-y-3">
                  {gradingGroups.map((group) => (
                    <div key={`${group.name}-${group.weight}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate font-medium text-text">{group.name}</span>
                        <span className="shrink-0 tabular-nums text-text-muted">
                          {Number(group.weight.toFixed(2))}%
                        </span>
                      </div>
                      <Progress value={group.weight} tone="accent" className="h-1.5" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : course.source === "canvas" && courseAssessments.length > 0 ? (
              <Card className="p-4">
                <CardHeader
                  title="Ponderaciones pendientes"
                  description="Estas evaluaciones se guardaron antes de descargar las categorías de Canvas. Sincroniza nuevamente para obtenerlas."
                  action={
                    <Link
                      href="/settings"
                      className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-accent hover:bg-accent-soft"
                    >
                      Sincronizar Canvas
                    </Link>
                  }
                />
              </Card>
            ) : null}
            <Card className="divide-y divide-border">
              {gradedDown.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={22} aria-hidden="true" />}
                  title="Aún no hay calificaciones"
                  description="Las calificaciones aparecerán aquí cuando sean publicadas y sincronizadas desde Canvas."
                />
              ) : (
                gradedDown.map((a) => {
                  const g = grades.find((x) => x.assessmentId === a.id);
                  const score = g?.score ?? 0;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle"
                      onClick={() => setDetailsFor(a)}
                    >
                      <progress
                        value={score}
                        max={100}
                        className="h-2 w-16 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-surface-subtle [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-present"
                      >
                        {score}
                      </progress>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{a.name}</p>
                        <p className="text-xs text-text-muted">
                          Peso efectivo {Number(a.weight.toFixed(2))}%
                          {a.gradingGroupName
                            ? ` · ${a.gradingGroupName}${a.gradingGroupWeight != null ? ` ${Number(a.gradingGroupWeight.toFixed(2))}%` : ""}`
                            : ""}
                        </p>
                      </div>
                      <span className="text-lg font-semibold tabular-nums text-text">{score}</span>
                    </button>
                  );
                })
              )}
            </Card>
          </div>
        ) : null}

        {tab === "materiales" ? (
          <Card className="divide-y divide-border">
            {courseMaterials.length === 0 ? (
              <EmptyState
                icon={<FileText size={22} aria-hidden="true" />}
                title="Sin materiales"
                description="Agrega enlaces a PDFs, videos y recursos de la materia."
                action={
                  <Button variant="primary" size="sm" onClick={() => setMaterialOpen(true)}>
                    <Plus size={14} /> Agregar material
                  </Button>
                }
              />
            ) : (
              <>
                {courseMaterials.map((m) => {
                  const Icon = MATERIAL_ICON[m.kind];
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-subtle text-text-faint">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium text-text">{m.title}</p>
                          {m.canvasType ? <Badge tone="neutral">{m.canvasType === "discussion" ? "Foro" : m.canvasType === "page" ? "Página" : m.canvasType === "file" ? "Archivo" : "Enlace"}</Badge> : null}
                        </div>
                        {m.description ? <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-muted">{m.description}</p> : null}
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block truncate text-xs text-text-faint hover:text-accent"
                        >
                          {m.url}
                        </a>
                      </div>
                      {m.source !== "canvas" ? <IconButton
                        aria-label="Eliminar material"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteMaterial(m.id)}
                      >
                        <Trash2 size={14} />
                      </IconButton> : null}
                    </div>
                  );
                })}
                <div className="px-3 py-3">
                  <Button variant="subtle" size="sm" onClick={() => setMaterialOpen(true)}>
                    <Plus size={14} /> Agregar material
                  </Button>
                </div>
              </>
            )}
          </Card>
        ) : null}

        {tab === "contenidos" ? (
          <div className="space-y-4">
            {courseModules.length === 0 ? (
              <EmptyState icon={<ListTree size={22} />} title="Sin módulos visibles" description="Canvas no devolvió módulos publicados para esta materia." />
            ) : courseModules.map((module) => {
              const items = itemsByModule.get(module.id) ?? [];
              const completed = items.filter((item) => item.completed).length;
              return (
                <Card key={module.id} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                    <div>
                      <p className="font-semibold text-text">{module.name}</p>
                      <p className="mt-1 text-xs text-text-faint">{completed} de {items.length || module.itemsCount} elementos completados{module.requireSequentialProgress ? " · orden obligatorio" : ""}</p>
                    </div>
                    <Badge tone={module.state === "completed" ? "success" : module.state === "locked" ? "neutral" : "accent"}>{module.state === "completed" ? "Completado" : module.state === "locked" ? "Bloqueado" : "Disponible"}</Badge>
                  </div>
                  <ol className="divide-y divide-border">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.completed ? "bg-present-soft text-present" : "bg-surface-subtle text-text-faint"}`}>
                          {item.locked ? <Lock size={14} /> : item.completed ? <CircleCheck size={15} /> : <FileText size={14} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">{item.title}</p>
                          <p className="text-xs text-text-faint">{item.kind}{item.required ? " · requerido" : ""}</p>
                        </div>
                        {item.externalUrl && !item.locked ? <a href={item.externalUrl} target="_blank" rel="noreferrer" className="text-text-faint hover:text-accent" aria-label={`Abrir ${item.title} en Canvas`}><ExternalLink size={15} /></a> : null}
                      </li>
                    ))}
                  </ol>
                </Card>
              );
            })}
          </div>
        ) : null}

        {tab === "workspace" ? (
          <WorkspaceSection
            courseName={course.name}
            courseColor={course.color}
            workspace={workspace}
            onEdit={() => setWorkspaceOpen(true)}
            onConnect={() => setWorkspaceOpen(true)}
          />
        ) : null}
      </div>

      <CourseFormDialog open={formOpen} onClose={() => setFormOpen(false)} course={course} />
      <TaskFormDialog
        open={taskForm.open}
        onClose={() => setTaskForm({ open: false, task: null })}
        courses={courses}
        task={taskForm.task}
      />
      <AssessmentFormDialog
        open={assessmentForm.open}
        onClose={() => setAssessmentForm({ open: false, assessment: null })}
        courses={courses}
        assessment={assessmentForm.assessment}
        defaultCourseId={course.id}
      />
      <ActivityDetailsDialog
        activity={detailsFor}
        courseName={course.name}
        onClose={() => setDetailsFor(null)}
      />
      <AttendanceCorrectionDialog
        record={correcting}
        course={course}
        onClose={() => setCorrecting(null)}
      />
      <MaterialFormDialog open={materialOpen} onClose={() => setMaterialOpen(false)} courses={courses} defaultCourseId={course.id} />
      <WorkspaceDialog
        open={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        courseId={course.id}
        courseName={course.name}
        workspace={workspace}
      />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar materia"
        description={`Se eliminarán "${course.name}" junto con su horario, asistencia, tareas, evaluaciones, calificaciones y materiales. Esta acción no se puede deshacer.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteCourse(course.id);
                router.push("/courses");
              }}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          ¿Seguro que quieres eliminar <span className="font-medium text-text">{course.name}</span>?
        </p>
      </Dialog>
    </div>
  );
}

function StatChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-surface-subtle px-3 py-2.5">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-text">{value}</p>
      {hint ? <p className="text-[11px] text-text-faint">{hint}</p> : null}
    </div>
  );
}

function courseAttRecords(records: AttendanceRecord[], courseId: string): AttendanceRecord[] {
  return records
    .filter((r) => r.courseId === courseId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function WorkspaceSection({
  courseName,
  courseColor,
  workspace,
  onEdit,
  onConnect,
}: {
  courseName: string;
  courseColor: CourseColor;
  workspace?: { title: string; pageUrl: string; integration: "manual" | "api" } | null;
  onEdit: () => void;
  onConnect: () => void;
}) {
  const cls = courseColorClasses(courseColor);
  if (!workspace) {
    return (
      <Card className="p-4">
        <CardHeader
          title="Workspace de Notion"
          description="Guarda el enlace a tu página de apuntes de esta materia y ábrela con un toque."
        />
        <div className="mt-4">
          <Button variant="primary" onClick={onConnect}>
            <ExternalLink size={14} /> Conectar página
          </Button>
        </div>
        <p className="mt-3 text-xs text-text-faint">
          La sincronización automática de contenido con la API de Notion es una integración en
          desarrollo; por ahora el enlace se guarda de forma local.
        </p>
      </Card>
    );
  }
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", cls.soft, cls.text)}>
            <ExternalLink size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-text">{workspace.title}</p>
            <Badge tone={workspace.integration === "api" ? "info" : "neutral"} className="mt-1">
              {workspace.integration === "api" ? "API" : "Manual"}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Editar
          </Button>
          <a
            href={workspace.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-on-accent transition-opacity hover:opacity-90"
          >
            Abrir <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-[13px] leading-relaxed text-text-muted">
        <Clock size={15} className="mt-0.5 shrink-0 text-text-faint" aria-hidden="true" />
        <span>
          Este workspace está vinculado a <span className="font-medium text-text">{courseName}</span>{" "}
          (enlace guardado localmente).
        </span>
      </div>
    </Card>
  );
}
