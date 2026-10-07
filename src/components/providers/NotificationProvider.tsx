"use client";

import { useEffect } from "react";

import type { AppNotification, NotificationKind } from "@/types";
import { useAppStore } from "@/store/app";

function notificationDate(date: string, time: string | null): Date {
  return new Date(`${date}T${time ?? "23:59"}:00`);
}

function isQuietHour(start: string, end: string): boolean {
  const current = new Date().toTimeString().slice(0, 5);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

async function showBrowserNotification(notification: AppNotification) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (registration) {
    await registration.showNotification(notification.title, {
      body: notification.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: notification.eventKey ?? notification.id,
      data: { url: notification.href ?? "/notifications" },
    });
  } else {
    new Notification(notification.title, { body: notification.body, icon: "/icon.svg", tag: notification.eventKey ?? notification.id });
  }
}

function createNotification(kind: NotificationKind, eventKey: string, title: string, body: string, href: string, refId: string): AppNotification {
  return {
    id: `auto-${eventKey}`,
    eventKey,
    kind,
    title,
    body,
    href,
    refId,
    source: "canvas",
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const tasks = useAppStore((state) => state.tasks);
  const assessments = useAppStore((state) => state.assessments);
  const grades = useAppStore((state) => state.grades);
  const courses = useAppStore((state) => state.courses);
  const announcements = useAppStore((state) => state.announcements);
  const conversations = useAppStore((state) => state.conversations);
  const dashboardItems = useAppStore((state) => state.dashboardItems);
  const preferences = useAppStore((state) => state.notificationPreferences);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!preferences.enabled) return;
    const coursesById = new Map(courses.map((course) => [course.id, course]));
    const generated: AppNotification[] = [];

    if (preferences.announcements) {
      for (const item of announcements.filter((entry) => !entry.read).slice(0, 20)) {
        generated.push(createNotification(
          "announcement",
          `announcement:${item.externalId}`,
          item.title,
          `${coursesById.get(item.courseId)?.code ?? "Canvas"} · ${item.authorName || "Nuevo anuncio"}`,
          "/inbox?tab=announcements",
          item.id,
        ));
      }
    }
    if (preferences.messages) {
      for (const item of conversations.filter((entry) => !entry.read).slice(0, 20)) {
        generated.push(createNotification("message", `message:${item.externalId}:${item.lastMessageAt}`, item.subject || "Nuevo mensaje", item.preview, "/inbox", item.id));
      }
    }
    for (const item of dashboardItems.filter((entry) => entry.newActivity)) {
      if (item.kind === "discussion" && preferences.discussions) {
        const course = item.courseId ? coursesById.get(item.courseId) : null;
        generated.push(createNotification(
          "discussion",
          `discussion:${item.externalId}:${item.date}`,
          "Actividad nueva en un foro",
          `${item.title}${course ? ` · ${course.code}` : ""}`,
          item.externalUrl ?? "/",
          item.id,
        ));
      } else if (["page", "material", "module"].includes(item.kind) && preferences.contentUpdates) {
        const course = item.courseId ? coursesById.get(item.courseId) : null;
        generated.push(createNotification(
          item.kind === "module" ? "module_unlocked" : "content_published",
          `content:${item.kind}:${item.externalId}:${item.date}`,
          item.kind === "module" ? "Módulo disponible" : "Nuevo contenido del curso",
          `${item.title}${course ? ` · ${course.code}` : ""}`,
          item.externalUrl ?? "/",
          item.id,
        ));
      }
    }
    if (preferences.deadlines) {
      const now = Date.now();
      for (const task of tasks.filter((item) => item.status !== "completed")) {
        const due = notificationDate(task.dueDate, task.dueTime).getTime();
        const hours = (due - now) / 3_600_000;
        for (const lead of preferences.leadHours) {
          if (hours > lead || hours <= Math.max(0, lead - 1)) continue;
          const course = task.courseId ? coursesById.get(task.courseId) : null;
          generated.push(createNotification(
            "task_due",
            `deadline:${task.externalId ?? task.id}:${lead}`,
            lead >= 24 ? "Entrega mañana" : "Entrega próxima",
            `${task.title}${course ? ` · ${course.code}` : ""}`,
            `/tasks?activity=${encodeURIComponent(task.id)}`,
            task.id,
          ));
        }
      }
    }
    if (preferences.grades) {
      const recentThreshold = Date.now() - 7 * 24 * 3_600_000;
      const gradeByAssessment = new Map(grades.map((grade) => [grade.assessmentId, grade]));
      for (const assessment of assessments.filter((item) => item.source === "canvas" && item.gradedAt && new Date(item.gradedAt).getTime() >= recentThreshold)) {
        const grade = gradeByAssessment.get(assessment.id);
        const course = coursesById.get(assessment.courseId);
        generated.push(createNotification(
          "grade_posted",
          `grade:${assessment.externalId ?? assessment.id}:${assessment.gradedAt}`,
          "Calificación publicada",
          `${assessment.name}${grade ? ` · ${Number(grade.score.toFixed(2))}` : ""}${course ? ` · ${course.code}` : ""}`,
          `/courses/${assessment.courseId}`,
          assessment.id,
        ));
      }
    }

    const quiet = isQuietHour(preferences.quietStart, preferences.quietEnd);
    const knownEventKeys = new Set(useAppStore.getState().notifications.map((item) => item.eventKey).filter(Boolean));
    for (const notification of generated) {
      if (notification.eventKey && knownEventKeys.has(notification.eventKey)) continue;
      addNotification(notification);
      if (notification.eventKey) knownEventKeys.add(notification.eventKey);
      if (preferences.browser && !quiet) void showBrowserNotification(notification);
    }
  }, [tasks, assessments, grades, courses, announcements, conversations, dashboardItems, preferences, addNotification]);

  return children;
}

export async function requestBrowserNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

export async function sendTestBrowserNotification(): Promise<boolean> {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  await showBrowserNotification({
    id: "notification-test",
    kind: "system",
    title: "Notificaciones activas",
    body: "Academic Planner puede enviarte recordatorios y novedades de Canvas.",
    createdAt: new Date().toISOString(),
    read: false,
    refId: null,
    href: "/notifications",
    eventKey: "notification-test",
  });
  return true;
}
