import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

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

export function NotificationManager() {
  const router = useRouter();
  const tasks = usePlannerStore((state) => state.snapshot.tasks);
  const courses = usePlannerStore((state) => state.snapshot.courses);
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

  return null;
}
