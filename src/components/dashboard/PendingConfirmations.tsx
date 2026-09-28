"use client";

import Link from "next/link";
import { ArrowRight, UserCheck } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { useSemesterData } from "@/hooks/useSemesterData";
import { pendingList } from "@/lib/attendance";

/** Si hay clases que terminaron sin confirmar, invita a confirmar. */
export function PendingConfirmations() {
  const { activeAttendance, courses, schedules, classrooms, professors } = useSemesterData();
  const pending = pendingList(
    activeAttendance,
    courses,
    schedules,
    classrooms,
    professors,
  );

  if (pending.length === 0) return null;

  const latest = pending[0];

  return (
    <Card className="fade-up flex flex-wrap items-center justify-between gap-4 border-pending/25 bg-pending-soft/30 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pending-soft text-pending">
          <UserCheck size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">
            {pending.length === 1
              ? "Tienes una clase por confirmar"
              : `Tienes ${pending.length} clases por confirmar`}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-pending">
            {latest.courseName} · {latest.scheduleStart} – {latest.scheduleEnd}
          </p>
        </div>
      </div>
      <Link
        href="/attendance"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-pending px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        Confirmar ahora
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </Card>
  );
}