"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRange, Plus, School } from "lucide-react";

import { useSemesterData } from "@/hooks/useSemesterData";
import { useAppStore } from "@/store/app";
import { attachCourseName } from "@/lib/selectors";
import type { Assessment } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssessmentRow } from "@/components/assessments/AssessmentRow";
import { AssessmentFormDialog } from "@/components/assessments/AssessmentFormDialog";

export default function AssessmentsPage() {
  const { activeAssessments, activeCourses, courses, grades } = useSemesterData();
  const deleteAssessment = useAppStore((s) => s.deleteAssessment);

  const [form, setForm] = useState<{ open: boolean; assessment: Assessment | null }>({
    open: false,
    assessment: null,
  });

  const withCourse = useMemo(
    () => attachCourseName(activeAssessments, courses),
    [activeAssessments, courses],
  );

  const upcoming = useMemo(
    () =>
      withCourse
        .filter((a) => a.status !== "graded")
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99")),
    [withCourse],
  );

  const graded = useMemo(
    () =>
      withCourse
        .filter((a) => a.status === "graded")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [withCourse],
  );

  const scored = useMemo(() => {
    const byCourse = new Map<string, { weightedScore: number; weight: number }>();
    let count = 0;
    for (const a of graded) {
      const g = grades.find((x) => x.assessmentId === a.id);
      if (!g || a.weight <= 0) continue;
      const current = byCourse.get(a.courseId) ?? { weightedScore: 0, weight: 0 };
      current.weightedScore += g.score * a.weight;
      current.weight += a.weight;
      byCourse.set(a.courseId, current);
      count += 1;
    }
    const courseAverages = [...byCourse.values()].map((item) => item.weightedScore / item.weight);
    const weighted = courseAverages.reduce((sum, value) => sum + value, 0) / (courseAverages.length || 1);
    const coverage = activeCourses.length > 0
      ? [...byCourse.values()].reduce((sum, item) => sum + Math.min(100, item.weight), 0) / activeCourses.length
      : 0;
    return {
      count,
      courseCount: courseAverages.length,
      weightedPercent: courseAverages.length ? Math.round(weighted * 10) / 10 : null,
      gradedWeight: Math.round(coverage * 10) / 10,
    };
  }, [graded, grades, activeCourses.length]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Evaluaciones"
        subtitle={`${upcoming.length} próximas · ${graded.length} calificadas`}
        action={
          <Button variant="primary" onClick={() => setForm({ open: true, assessment: null })}>
            <Plus size={16} /> Nueva evaluación
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text">Promedio global</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {scored.count > 0
                  ? `${scored.count} ${scored.count === 1 ? "nota" : "notas"} en ${scored.courseCount} ${scored.courseCount === 1 ? "materia" : "materias"} · ${scored.gradedWeight}% cubierto`
                  : "Aún no hay calificaciones"}
              </p>
            </div>
            <span className="text-2xl font-semibold tabular-nums text-accent">
              {scored.weightedPercent === null ? "—" : scored.weightedPercent}
            </span>
          </div>
        </Card>
        <Card className="p-4">
          <CardHeader
            title="Próxima fecha"
            description={
              upcoming[0]
                ? `${upcoming[0].name} · ${format(parseISO(upcoming[0].date), "EEE d MMM", { locale: es })}`
                : "No hay evaluaciones programadas"
            }
            action={
              upcoming[0] ? (
                <span className="text-sm font-semibold text-text">
                  {Number(upcoming[0].weight.toFixed(2))}%
                </span>
              ) : null
            }
          />
        </Card>
      </div>

      {upcoming.length === 0 && graded.length === 0 ? (
        <EmptyState
          icon={<CalendarRange size={22} aria-hidden="true" />}
          title="Sin evaluaciones"
          description="Programa parciales, proyectos y entregas. Luego calificaciónalas para ver tu promedio."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setForm({ open: true, assessment: null })}
            >
              <Plus size={14} /> Nueva evaluación
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 ? (
            <Card className="overflow-hidden">
              <CardHeader
                className="px-4 pt-3.5"
                title="Próximas"
                description={`${upcoming.length} evaluaciones arriba`}
              />
              <div className="mt-1 mb-1 divide-y divide-border">
                {upcoming.map((a) => (
                  <AssessmentRow
                    key={a.id}
                    assessment={a}
                    courseColor={a.courseColor}
                    gradeScore={grades.find((g) => g.assessmentId === a.id)?.score}
                    onEdit={a.source === "canvas" ? undefined : () => setForm({ open: true, assessment: a })}
                    onDelete={a.source === "canvas" ? undefined : () => deleteAssessment(a.id)}
                  />
                ))}
              </div>
              <div className="px-3 pb-3">
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setForm({ open: true, assessment: null })}
                >
                  <Plus size={14} /> Nueva evaluación
                </Button>
              </div>
            </Card>
          ) : null}

          {graded.length > 0 ? (
            <Card className="overflow-hidden">
              <CardHeader
                className="px-4 pt-3.5"
                title={
                  <span className="flex items-center gap-2">
                    <School size={15} className="text-text-faint" aria-hidden="true" />
                    Calificadas
                  </span>
                }
                description={`${scored.gradedWeight}% promedio del semestre registrado`}
              />
              <div className="mx-4 mt-3">
                <Progress value={scored.gradedWeight} tone="accent" className="h-1.5" />
              </div>
              <div className="mt-2 mb-1 divide-y divide-border pb-1">
                {graded.map((a) => (
                  <AssessmentRow
                    key={a.id}
                    assessment={a}
                    courseColor={a.courseColor}
                    gradeScore={grades.find((g) => g.assessmentId === a.id)?.score}
                    onEdit={a.source === "canvas" ? undefined : () => setForm({ open: true, assessment: a })}
                    onDelete={a.source === "canvas" ? undefined : () => deleteAssessment(a.id)}
                  />
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      )}

      <AssessmentFormDialog
        open={form.open}
        onClose={() => setForm({ open: false, assessment: null })}
        courses={activeCourses}
        assessment={form.assessment}
      />
    </div>
  );
}
