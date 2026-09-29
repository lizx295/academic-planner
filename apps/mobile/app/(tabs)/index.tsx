import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { TaskItem } from "@/components/TaskItem";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function DashboardScreen() {
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const cloudStatus = usePlannerStore((state) => state.cloudStatus);
  const toggleTask = usePlannerStore((state) => state.toggleTask);
  const pending = snapshot.tasks.filter((task) => task.status !== "completed");
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = pending.filter((task) => task.dueDate === today).length;
  const upcoming = [...snapshot.assessments].filter((item) => item.status !== "graded").sort((a, b) => a.date.localeCompare(b.date))[0];
  const courseById = new Map(snapshot.courses.map((course) => [course.id, course]));
  const firstName = snapshot.profile.name.split(" ")[0] || "Estudiante";
  return (
    <Screen
      title={`Hola, ${firstName}`}
      subtitle="Este es tu panorama académico de hoy."
      action={<StatusPill label={cloudStatus === "synced" ? "En la nube" : cloudStatus === "error" ? "Sin conexión" : "Local"} tone={cloudStatus === "synced" ? "success" : cloudStatus === "error" ? "danger" : "neutral"} />}
    >
      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: colors.accentSoft }]}><Ionicons name="book-outline" size={18} color={colors.accent} /></View>
          <Text style={[styles.statValue, { color: colors.text }]}>{snapshot.courses.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Materias activas</Text>
        </Card>
        <Card style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: colors.warningSoft }]}><Ionicons name="time-outline" size={18} color={colors.warning} /></View>
          <Text style={[styles.statValue, { color: colors.text }]}>{dueToday}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Vencen hoy</Text>
        </Card>
      </View>

      {upcoming ? (
        <Card>
          <SectionTitle>Próxima evaluación</SectionTitle>
          <View style={styles.assessment}>
            <View style={[styles.dateBox, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.dateDay, { color: colors.accent }]}>{new Date(`${upcoming.date}T12:00:00`).getDate()}</Text>
              <Text style={[styles.dateMonth, { color: colors.accent }]}>{new Date(`${upcoming.date}T12:00:00`).toLocaleDateString("es-EC", { month: "short" }).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.assessmentTitle, { color: colors.text }]}>{upcoming.name}</Text>
              <Text style={[styles.assessmentMeta, { color: colors.textMuted }]}>{courseById.get(upcoming.courseId)?.name ?? "Materia"}{upcoming.time ? ` · ${upcoming.time}` : ""}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionTitle action={<Text style={{ color: colors.textFaint, fontSize: 12 }}>{pending.length} pendientes</Text>}>Tareas próximas</SectionTitle>
      <Card>
        {pending.slice(0, 4).map((task) => <TaskItem key={task.id} task={task} course={task.courseId ? courseById.get(task.courseId) : undefined} onToggle={() => toggleTask(task.id)} />)}
        {pending.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>No tienes tareas pendientes.</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, minHeight: 146 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { marginTop: 14, fontSize: 28, fontWeight: "700", letterSpacing: -0.8 },
  statLabel: { marginTop: 2, fontSize: 12 },
  assessment: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 13 },
  dateBox: { width: 54, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 21, lineHeight: 23, fontWeight: "800" },
  dateMonth: { fontSize: 9, marginTop: 2, fontWeight: "800" },
  assessmentTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  assessmentMeta: { marginTop: 4, fontSize: 12 },
  empty: { textAlign: "center", paddingVertical: 18, fontSize: 13 },
});
