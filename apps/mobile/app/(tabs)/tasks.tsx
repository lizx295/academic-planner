import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { TaskItem } from "@/components/TaskItem";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function TasksScreen() {
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const toggleTask = usePlannerStore((state) => state.toggleTask);
  const courseById = new Map(snapshot.courses.map((course) => [course.id, course]));
  const pending = snapshot.tasks.filter((task) => task.status !== "completed").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completed = snapshot.tasks.filter((task) => task.status === "completed");
  return (
    <Screen title="Tareas" subtitle="Organiza entregas y trabajo pendiente." action={<StatusPill label={`${pending.length} pendientes`} tone={pending.length ? "warning" : "success"} />}>
      <Text style={[styles.section, { color: colors.text }]}>Pendientes</Text>
      <Card>
        {pending.map((task) => <TaskItem key={task.id} task={task} course={task.courseId ? courseById.get(task.courseId) : undefined} onToggle={() => toggleTask(task.id)} />)}
        {pending.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Todo está al día.</Text> : null}
      </Card>
      {completed.length ? <Text style={[styles.section, { color: colors.text }]}>Completadas</Text> : null}
      {completed.length ? <Card>{completed.slice(0, 6).map((task) => <TaskItem key={task.id} task={task} course={task.courseId ? courseById.get(task.courseId) : undefined} onToggle={() => toggleTask(task.id)} />)}</Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 2, fontSize: 15, fontWeight: "700" },
  empty: { textAlign: "center", paddingVertical: 18, fontSize: 13 },
});
