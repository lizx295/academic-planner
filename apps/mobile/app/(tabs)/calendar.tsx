import { Ionicons } from "@expo/vector-icons";
import { academicDateKey, courseColors } from "@academic-planner/core";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

type AgendaItem = {
  id: string;
  date: string;
  time: string | null;
  title: string;
  courseId: string | null;
  type: "Entrega" | "Evaluación" | "Personal";
  href: string | null;
  dedupeKey: string;
};

export default function CalendarScreen() {
  const router = useRouter();
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const courses = new Map(snapshot.courses.map((course) => [course.id, course]));
  const today = academicDateKey();

  const candidates: AgendaItem[] = [
    ...snapshot.tasks
      .filter((task) => task.status !== "completed" && task.dueDate >= today)
      .map((task) => ({
        id: task.id,
        date: task.dueDate,
        time: task.dueTime,
        title: task.title,
        courseId: task.courseId,
        type: "Entrega" as const,
        href: `/activity/task/${task.id}`,
        dedupeKey: task.source === "canvas" && task.externalId
          ? `canvas:${task.courseId ?? "none"}:${task.externalId}`
          : `task:${task.id}`,
      })),
    ...snapshot.assessments
      .filter((item) => item.status !== "graded" && item.date >= today)
      .map((item) => ({
        id: item.id,
        date: item.date,
        time: item.time,
        title: item.name,
        courseId: item.courseId,
        type: "Evaluación" as const,
        href: `/activity/assessment/${item.id}`,
        dedupeKey: item.source === "canvas" && item.externalId
          ? `canvas:${item.courseId}:${item.externalId}`
          : `assessment:${item.id}`,
      })),
    ...snapshot.personalEvents
      .filter((item) => item.date >= today)
      .map((item) => ({
        id: item.id,
        date: item.date,
        time: item.startTime,
        title: item.title,
        courseId: null,
        type: "Personal" as const,
        href: null,
        dedupeKey: `personal:${item.id}`,
      })),
  ];

  const unique = new Map<string, AgendaItem>();
  for (const item of candidates) {
    const previous = unique.get(item.dedupeKey);
    if (!previous || previous.type === "Evaluación") unique.set(item.dedupeKey, item);
  }
  const events = [...unique.values()]
    .sort((a, b) => `${a.date} ${a.time ?? "23:59"}`.localeCompare(`${b.date} ${b.time ?? "23:59"}`))
    .slice(0, 60);
  const groups = events.reduce<Map<string, AgendaItem[]>>((result, item) => {
    result.set(item.date, [...(result.get(item.date) ?? []), item]);
    return result;
  }, new Map());

  return (
    <Screen title="Agenda" subtitle="Entregas y evaluaciones ordenadas por día.">
      {[...groups.entries()].map(([dateValue, items]) => {
        const date = new Date(`${dateValue}T12:00:00`);
        const relative = dateValue === today ? "HOY" : dateValue === plusDays(today, 1) ? "MAÑANA" : null;
        return (
          <View key={dateValue} style={styles.group}>
            <View style={[styles.dateColumn, { borderColor: colors.border }]}>
              <Text style={[styles.weekday, { color: relative ? colors.accent : colors.textFaint }]}>{relative ?? date.toLocaleDateString("es-EC", { weekday: "short" }).toUpperCase()}</Text>
              <Text style={[styles.day, { color: colors.text }]}>{date.getDate()}</Text>
              <Text style={[styles.month, { color: colors.textMuted }]}>{date.toLocaleDateString("es-EC", { month: "short" }).toUpperCase()}</Text>
            </View>
            <View style={styles.items}>
              {items.map((event) => {
                const course = event.courseId ? courses.get(event.courseId) : undefined;
                const accent = course ? courseColors[course.color] : colors.textFaint;
                return (
                  <Pressable
                    key={`${event.type}-${event.id}`}
                    disabled={!event.href}
                    onPress={() => event.href && router.push(event.href as never)}
                    style={({ pressed }) => [styles.event, { borderColor: colors.border, opacity: pressed ? 0.62 : 1 }]}
                  >
                    <View style={[styles.marker, { backgroundColor: accent }]} />
                    <View style={styles.eventCopy}>
                      <View style={styles.metaRow}>
                        <Text style={[styles.type, { color: accent }]}>{event.type.toUpperCase()}</Text>
                        <Text style={[styles.time, { color: colors.textFaint }]}>{event.time ?? "Todo el día"}</Text>
                      </View>
                      <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
                      <Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>{course ? `${course.code} · ${course.name}` : "Evento personal"}</Text>
                    </View>
                    {event.href ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {events.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-clear-outline" size={28} color={colors.textFaint} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Agenda despejada</Text>
          <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>No hay próximas actividades sincronizadas.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function plusDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", alignItems: "stretch", gap: 14 },
  dateColumn: { width: 54, flexShrink: 0, borderRightWidth: 1, paddingTop: 4, paddingRight: 12, alignItems: "flex-end" },
  weekday: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  day: { marginTop: 2, fontSize: 24, lineHeight: 27, fontWeight: "700" },
  month: { marginTop: 1, fontSize: 9, fontWeight: "700" },
  items: { flex: 1 },
  event: { minHeight: 76, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
  marker: { width: 3, height: 34, borderRadius: 2 },
  eventCopy: { flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  type: { fontSize: 9, fontWeight: "800", letterSpacing: 0.65 },
  time: { fontSize: 10, fontWeight: "600" },
  title: { marginTop: 4, fontSize: 14, lineHeight: 19, fontWeight: "600" },
  meta: { marginTop: 3, fontSize: 11 },
  empty: { alignItems: "center", paddingVertical: 64 },
  emptyTitle: { marginTop: 13, fontSize: 16, fontWeight: "700" },
  emptyCopy: { marginTop: 5, fontSize: 13, textAlign: "center" },
});
