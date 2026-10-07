import { Ionicons } from "@expo/vector-icons";
import { academicDateKey, type DashboardItem } from "@academic-planner/core";
import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { TaskItem } from "@/components/TaskItem";
import { usePlannerStore } from "@/store/planner";
import { useMobileAuth } from "@/store/auth";
import { usePlannerTheme } from "@/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const accountName = useMobileAuth((state) => state.name);
  const cloudStatus = usePlannerStore((state) => state.cloudStatus);
  const toggleTask = usePlannerStore((state) => state.toggleTask);
  const pending = snapshot.tasks.filter((task) => task.status !== "completed");
  const today = academicDateKey();
  const dueToday = pending.filter((task) => task.dueDate === today).length;
  const upcoming = [...snapshot.assessments].filter((item) => item.status !== "graded").sort((a, b) => a.date.localeCompare(b.date))[0];
  const courseById = new Map(snapshot.courses.map((course) => [course.id, course]));
  const firstName = (accountName || snapshot.profile.name).split(" ")[0] || "Estudiante";
  const boardSource: DashboardItem[] = [...snapshot.dashboardItems];
  const boardKnown = new Set(boardSource.map((item) => `${item.courseId ?? "none"}:${item.externalId}`));
  for (const task of snapshot.tasks) {
    const key = `${task.courseId ?? "none"}:${task.externalId ?? task.id}`;
    if (boardKnown.has(key)) continue;
    boardKnown.add(key);
    boardSource.push({ id: `board-task-${task.id}`, courseId: task.courseId, title: task.title, kind: "assignment", date: task.dueDate, time: task.dueTime, description: task.description, externalUrl: task.externalUrl ?? `/activity/task/${task.id}`, externalId: task.externalId ?? task.id, source: "canvas", completed: task.status === "completed", newActivity: false, pointsPossible: task.pointsPossible ?? null });
  }
  for (const assessment of snapshot.assessments) {
    const key = `${assessment.courseId}:${assessment.externalId ?? assessment.id}`;
    if (boardKnown.has(key)) continue;
    boardKnown.add(key);
    boardSource.push({ id: `board-assessment-${assessment.id}`, courseId: assessment.courseId, title: assessment.name, kind: assessment.kind === "quiz" || assessment.kind === "exam" ? "quiz" : "assignment", date: assessment.date, time: assessment.time, description: assessment.description ?? "", externalUrl: assessment.externalUrl ?? `/activity/assessment/${assessment.id}`, externalId: assessment.externalId ?? assessment.id, source: "canvas", completed: assessment.status === "graded", newActivity: false, pointsPossible: assessment.pointsPossible ?? null });
  }
  const boardEnd = new Date(`${today}T12:00:00`);
  boardEnd.setDate(boardEnd.getDate() + 6);
  const boardItems = boardSource
    .filter((item) => item.date >= today && item.date <= academicDateKey(boardEnd))
    .sort((a, b) => `${a.date}T${a.time ?? "23:59"}`.localeCompare(`${b.date}T${b.time ?? "23:59"}`))
    .slice(0, 12);
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

      <SectionTitle action={<Text style={{ color: colors.textFaint, fontSize: 12 }}>{boardItems.length} próximos</Text>}>Tablero</SectionTitle>
      <Card style={styles.board}>
        {boardItems.map((item, index) => {
          const course = item.courseId ? courseById.get(item.courseId) : undefined;
          const icon = item.kind === "announcement" ? "megaphone-outline"
            : item.kind === "discussion" ? "chatbubbles-outline"
              : item.kind === "page" ? "document-text-outline"
                : item.kind === "material" || item.kind === "module" ? "folder-open-outline"
                  : "checkbox-outline";
          return (
            <Pressable
              key={item.id}
              disabled={!item.externalUrl}
              onPress={() => item.externalUrl && (item.externalUrl.startsWith("http") ? void Linking.openURL(item.externalUrl) : router.push(item.externalUrl as never))}
              style={[styles.boardRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={[styles.boardIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name={icon} size={17} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.boardTitleRow}><Text numberOfLines={1} style={[styles.boardTitle, { color: colors.text }]}>{item.title}</Text>{item.newActivity ? <Text style={[styles.newBadge, { color: colors.accent }]}>NUEVO</Text> : null}</View>
                <Text numberOfLines={1} style={[styles.boardMeta, { color: colors.textMuted }]}>{course?.name ?? "Canvas"} · {item.kind === "discussion" ? "Foro" : item.kind === "announcement" ? "Anuncio" : item.kind === "page" ? "Página" : item.kind === "material" ? "Material" : item.kind === "quiz" ? "Evaluación" : item.kind === "assignment" ? "Tarea" : item.kind === "module" ? "Módulo" : "Actividad"}</Text>
              </View>
              <View style={styles.boardDate}><Text style={[styles.boardDay, { color: colors.text }]}>{item.date === today ? "Hoy" : new Date(`${item.date}T12:00:00`).toLocaleDateString("es-EC", { day: "numeric", month: "short" })}</Text><Text style={[styles.boardTime, { color: colors.textFaint }]}>{item.time ?? "Todo el día"}</Text></View>
            </Pressable>
          );
        })}
        {boardItems.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Nada planificado. Sincroniza Canvas para cargar anuncios, foros y contenido.</Text> : null}
      </Card>

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
        {pending.slice(0, 4).map((task) => <TaskItem key={task.id} task={task} course={task.courseId ? courseById.get(task.courseId) : undefined} onToggle={() => toggleTask(task.id)} onOpen={() => router.push(`/activity/task/${task.id}` as never)} />)}
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
  board: { paddingVertical: 0, paddingHorizontal: 0, overflow: "hidden" },
  boardRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 11 },
  boardIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  boardTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  boardTitle: { flexShrink: 1, fontSize: 14, fontWeight: "700" },
  newBadge: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  boardMeta: { marginTop: 3, fontSize: 11 },
  boardDate: { alignItems: "flex-end" },
  boardDay: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  boardTime: { marginTop: 3, fontSize: 10 },
});
