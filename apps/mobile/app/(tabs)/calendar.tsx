import { StyleSheet, Text, View } from "react-native";
import { courseColors } from "@academic-planner/core";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function CalendarScreen() {
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const courses = new Map(snapshot.courses.map((course) => [course.id, course]));
  const events = [
    ...snapshot.tasks.filter((task) => task.status !== "completed").map((task) => ({ id: task.id, date: task.dueDate, time: task.dueTime, title: task.title, courseId: task.courseId, type: "Entrega" })),
    ...snapshot.assessments.filter((item) => item.status !== "graded").map((item) => ({ id: item.id, date: item.date, time: item.time, title: item.name, courseId: item.courseId, type: "Evaluación" })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  return (
    <Screen title="Calendario" subtitle="Próximas entregas y evaluaciones.">
      {events.map((event) => {
        const course = event.courseId ? courses.get(event.courseId) : undefined;
        const date = new Date(`${event.date}T12:00:00`);
        const accent = course ? courseColors[course.color] : colors.textFaint;
        return (
          <Card key={`${event.type}-${event.id}`} style={styles.event}>
            <View style={[styles.date, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.day, { color: colors.text }]}>{date.getDate()}</Text>
              <Text style={[styles.month, { color: colors.textFaint }]}>{date.toLocaleDateString("es-EC", { month: "short" }).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.type, { color: accent }]}>{event.type.toUpperCase()}</Text>
              <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{course?.code ?? "Personal"}{event.time ? ` · ${event.time}` : ""}</Text>
            </View>
          </Card>
        );
      })}
      {events.length === 0 ? <Card><Text style={[styles.empty, { color: colors.textMuted }]}>No hay próximos eventos.</Text></Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  event: { flexDirection: "row", alignItems: "center", gap: 13 },
  date: { width: 52, height: 57, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  day: { fontSize: 20, lineHeight: 22, fontWeight: "800" },
  month: { marginTop: 2, fontSize: 9, fontWeight: "800" },
  type: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  title: { marginTop: 3, fontSize: 14, lineHeight: 19, fontWeight: "700" },
  meta: { marginTop: 3, fontSize: 11 },
  empty: { textAlign: "center", paddingVertical: 18, fontSize: 13 },
});
