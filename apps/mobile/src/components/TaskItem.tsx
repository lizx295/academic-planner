import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { academicDateKey, type Course, type Task } from "@academic-planner/core";

import { usePlannerTheme } from "@/theme";

export function TaskItem({ task, course, onToggle, onOpen }: { task: Task; course?: Course; onToggle: () => void; onOpen: () => void }) {
  const { colors } = usePlannerTheme();
  const completed = task.status === "completed";
  const due = new Date(`${task.dueDate}T12:00:00`);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const dueLabel = task.dueDate === academicDateKey(today) ? "Hoy" : task.dueDate === academicDateKey(tomorrow) ? "Mañana" : due.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <Pressable onPress={(event) => { event.stopPropagation(); onToggle(); }} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: completed }} style={[styles.check, { borderColor: completed ? colors.accent : colors.borderStrong, backgroundColor: completed ? colors.accent : "transparent" }]}>
        {completed ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
      </Pressable>
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
