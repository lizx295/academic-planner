import { useRouter } from "expo-router";
import { academicDateKey } from "@academic-planner/core";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { TaskItem } from "@/components/TaskItem";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function TasksScreen() {
  const router = useRouter();
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const toggleTask = usePlannerStore((state) => state.toggleTask);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "overdue">("all");
  const courseById = new Map(snapshot.courses.map((course) => [course.id, course]));
  const today = academicDateKey();
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const week = academicDateKey(endOfWeek);
  const pending = snapshot.tasks.filter((task) => task.status !== "completed")
    .filter((task) => filter === "all" || (filter === "today" && task.dueDate === today) || (filter === "week" && task.dueDate >= today && task.dueDate <= week) || (filter === "overdue" && task.dueDate < today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completed = snapshot.tasks.filter((task) => task.status === "completed");
  return (
    <Screen title="Tareas" subtitle="Organiza entregas y trabajo pendiente." action={<StatusPill label={`${pending.length} pendientes`} tone={pending.length ? "warning" : "success"} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {([['all', 'Todas'], ['today', 'Hoy'], ['week', '7 días'], ['overdue', 'Atrasadas']] as const).map(([id, label]) => (
          <Pressable key={id} onPress={() => setFilter(id)} style={[styles.filter, { borderColor: filter === id ? colors.accent : colors.border, backgroundColor: filter === id ? colors.accentSoft : colors.surface }]}>
            <Text style={[styles.filterText, { color: filter === id ? colors.accent : colors.textMuted }]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[styles.section, { color: colors.text }]}>Pendientes</Text>
      <Card>
        {pending.map((task) => <TaskItem key={task.id} task={task} course={task.courseId ? courseById.get(task.courseId) : undefined} onToggle={() => toggleTask(task.id)} onOpen={() => router.push(`/activity/task/${task.id}` as never)} />)}
        {pending.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Todo está al día.</Text> : null}
      </Card>
      {completed.length && filter === "all" ? <Text style={[styles.section, { color: colors.text }]}>Completadas</Text> : null}
      {completed.length && filter === "all" ? <Card>{completed.slice(0, 6).map((task) => <TaskItem key={task.id} task={task} course={task.courseId ? courseById.get(task.courseId) : undefined} onToggle={() => toggleTask(task.id)} onOpen={() => router.push(`/activity/task/${task.id}` as never)} />)}</Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 2, fontSize: 15, fontWeight: "700" },
  empty: { textAlign: "center", paddingVertical: 18, fontSize: 13 },
  filters: { gap: 8 },
  filter: { minHeight: 36, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 12, fontWeight: "700" },
});
