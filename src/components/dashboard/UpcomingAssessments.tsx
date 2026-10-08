"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { academicDateKey } from "@academic-planner/core";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSemesterData } from "@/hooks/useSemesterData";
import { attachCourseName } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { courseColorClasses } from "@/lib/colors";
import { activityHref } from "@/lib/activity-detail";

export function UpcomingAssessments() {
  const { activeAssessments, courses } = useSemesterData();
  const today = academicDateKey();

  const upcoming = attachCourseName(activeAssessments, courses)
    .filter((a) => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <Card className="fade-up p-5 sm:p-6">
      <CardHeader
        title="Próximas evaluaciones"
        description="Ordenadas por fecha."
        action={
          <Link
            href="/assessments"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
            aria-label="Ver todas las evaluaciones"
          >
            Ver todas
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />
      <div className="mt-4">
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={22} aria-hidden="true" />}
            title="Sin evaluaciones próximas"
            description="Recibirás recordatorios cuando haya fechas programadas."
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => {
              const diff = differenceInCalendarDays(new Date(`${a.date}T00:00:00`), new Date());
              const color = courseColorClasses(a.courseColor);
              return (
                <li key={a.id}>
                  <Link
                    href={activityHref(a.id)}
                    className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-surface-subtle"
                  >
                    <span aria-hidden="true" className={cn("h-8 w-1 rounded-full", color.bar)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">{a.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-text-muted">{a.courseName}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[12px] tabular text-text-faint">
                        {format(new Date(`${a.date}T00:00:00`), "d MMM", { locale: es })}
                      </span>
                      <Badge tone={diff <= 7 ? "warning" : "neutral"}>
                        {diff === 0 ? "Hoy" : diff === 1 ? "Mañana" : `en ${diff} d`}
                      </Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
