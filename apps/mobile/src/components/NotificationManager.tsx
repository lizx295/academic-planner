import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { usePlannerStore } from "@/store/planner";

export async function enableMobileNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("academic", {
      name: "Agenda académica",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: "#4f43e8",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const result = current.granted ? current : await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function sendTestMobileNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await enableMobileNotifications();
  if (!granted) return false;
  const Notifications = await import("expo-notifications");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Notificaciones activas",
      body: "Academic Planner puede avisarte sobre Canvas y tus próximas entregas.",
      data: { href: "/notifications" },
    },
    trigger: null,
  });
  return true;
}

function isQuietHour(start: string, end: string): boolean {
  const current = new Date().toTimeString().slice(0, 5);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

export function NotificationManager() {
  const router = useRouter();
  const tasks = usePlannerStore((state) => state.snapshot.tasks);
  const courses = usePlannerStore((state) => state.snapshot.courses);
  const announcements = usePlannerStore((state) => state.snapshot.announcements);
  const conversations = usePlannerStore((state) => state.snapshot.conversations);
  const dashboardItems = usePlannerStore((state) => state.snapshot.dashboardItems);
  const preferences = usePlannerStore((state) => state.snapshot.notificationPreferences);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let cleanup: (() => void) | undefined;
    let active = true;
    void import("expo-notifications").then((Notifications) => {
      if (!active) return;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
      });
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const href = response.notification.request.content.data?.href;
        if (typeof href === "string") router.push(href as never);
      });
      cleanup = () => subscription.remove();
    });
    return () => { active = false; cleanup?.(); };
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web" || !preferences.enabled || !preferences.mobile || !preferences.deadlines) return;
    let active = true;
    async function schedule() {
      const Notifications = await import("expo-notifications");
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted || !active) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      const courseById = new Map(courses.map((course) => [course.id, course]));
      const now = Date.now();
      let scheduled = 0;
      for (const task of tasks.filter((item) => item.status !== "completed")) {
        const due = new Date(`${task.dueDate}T${task.dueTime ?? "23:59"}:00`).getTime();
        for (const lead of preferences.leadHours) {
          const date = new Date(due - lead * 3_600_000);
          if (date.getTime() <= now || scheduled >= 60) continue;
          await Notifications.scheduleNotificationAsync({
            content: {
              title: lead >= 24 ? "Entrega mañana" : "Entrega próxima",
              body: `${task.title}${task.courseId ? ` · ${courseById.get(task.courseId)?.code ?? "Materia"}` : ""}`,
              data: { href: `/activity/task/${task.id}` },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: "academic" },
          });
          scheduled += 1;
        }
      }
    }
    void schedule();
    return () => { active = false; };
  }, [tasks, courses, preferences]);

  useEffect(() => {
    if (Platform.OS === "web" || !preferences.enabled || !preferences.mobile || isQuietHour(preferences.quietStart, preferences.quietEnd)) return;
    let active = true;
    async function notifyUpdates() {
      const Notifications = await import("expo-notifications");
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted || !active) return;
      const stored = await AsyncStorage.getItem("academic-planner-notified-events");
      const seen = new Set<string>(stored ? JSON.parse(stored) as string[] : []);
      const courseById = new Map(courses.map((course) => [course.id, course]));
      const events: Array<{ key: string; title: string; body: string; href: string }> = [];
      if (preferences.announcements) {
        for (const item of announcements.filter((entry) => !entry.read)) events.push({
          key: `announcement:${item.externalId}`,
          title: item.title,
          body: `${courseById.get(item.courseId)?.code ?? "Canvas"} · Nuevo anuncio`,
          href: "/inbox",
        });
      }
      if (preferences.messages) {
        for (const item of conversations.filter((entry) => !entry.read)) events.push({
          key: `message:${item.externalId}:${item.lastMessageAt}`,
          title: item.subject || "Nuevo mensaje",
          body: item.preview,
          href: "/inbox",
        });
      }
      for (const item of dashboardItems.filter((entry) => entry.newActivity)) {
        const course = item.courseId ? courseById.get(item.courseId) : null;
        if (item.kind === "discussion" && preferences.discussions) events.push({
          key: `discussion:${item.externalId}:${item.date}`,
          title: "Actividad nueva en un foro",
          body: `${item.title}${course ? ` · ${course.code}` : ""}`,
          href: item.externalUrl ?? "/notifications",
        });
        if (["page", "material", "module"].includes(item.kind) && preferences.contentUpdates) events.push({
          key: `content:${item.kind}:${item.externalId}:${item.date}`,
          title: item.kind === "module" ? "Módulo disponible" : "Nuevo contenido del curso",
          body: `${item.title}${course ? ` · ${course.code}` : ""}`,
          href: item.externalUrl ?? "/notifications",
        });
      }
      for (const event of events.slice(0, 20)) {
        if (seen.has(event.key) || !active) continue;
        await Notifications.scheduleNotificationAsync({
          content: { title: event.title, body: event.body, data: { href: event.href } },
          trigger: null,
        });
        seen.add(event.key);
      }
      await AsyncStorage.setItem("academic-planner-notified-events", JSON.stringify([...seen].slice(-500)));
    }
    void notifyUpdates();
    return () => { active = false; };
  }, [announcements, conversations, dashboardItems, courses, preferences]);

  return null;
}
