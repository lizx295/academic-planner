import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Course, Task } from "@academic-planner/core";

import { usePlannerTheme } from "@/theme";

export function TaskItem({ task, course, onToggle }: { task: Task; course?: Course; onToggle: () => void }) {
  const { colors } = usePlannerTheme();
  const completed = task.status === "completed";
  const due = new Date(`${task.dueDate}T12:00:00`);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const key = (date: Date) => date.toISOString().slice(0, 10);
  const dueLabel = task.dueDate === key(today) ? "Hoy" : task.dueDate === key(tomorrow) ? "Mañana" : due.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.check, { borderColor: completed ? colors.accent : colors.borderStrong, backgroundColor: completed ? colors.accent : "transparent" }]}>
        {completed ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text, textDecorationLine: completed ? "line-through" : "none" }]}>{task.title}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.textFaint }]}>{course?.code ?? "Personal"} · {dueLabel}{task.dueTime ? `, ${task.dueTime}` : ""}</Text>
      </View>
      {task.priority === "high" && !completed ? <View style={[styles.priority, { backgroundColor: colors.danger }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  meta: { marginTop: 2, fontSize: 12 },
  priority: { width: 7, height: 7, borderRadius: 4 },
});
