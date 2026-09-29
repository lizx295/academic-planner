import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { courseColors } from "@academic-planner/core";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function CoursesScreen() {
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const professors = new Map(snapshot.professors.map((item) => [item.id, item]));
  return (
    <Screen title="Materias" subtitle="Tu carga académica del periodo actual.">
      {snapshot.courses.map((course) => {
        const professor = professors.get(course.professorId);
        const pending = snapshot.tasks.filter((task) => task.courseId === course.id && task.status !== "completed").length;
        const accent = courseColors[course.color];
        return (
          <Card key={course.id} style={styles.courseCard}>
            <View style={[styles.bar, { backgroundColor: accent }]} />
            <View style={styles.courseHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.code, { color: accent }]}>{course.code}</Text>
                <Text style={[styles.name, { color: colors.text }]}>{course.name}</Text>
              </View>
              <View style={[styles.arrow, { backgroundColor: colors.surfaceSubtle }]}><Ionicons name="arrow-up-outline" size={17} color={colors.textFaint} style={{ transform: [{ rotate: "45deg" }] }} /></View>
            </View>
            <View style={styles.metaRow}><Ionicons name="person-outline" size={14} color={colors.textFaint} /><Text style={[styles.meta, { color: colors.textMuted }]}>{professor ? `${professor.title} ${professor.name}`.trim() : "Sin profesor asignado"}</Text></View>
            <View style={styles.footer}>
              <View style={styles.metaRow}><Ionicons name="checkbox-outline" size={14} color={colors.textFaint} /><Text style={[styles.meta, { color: colors.textMuted }]}>{pending ? `${pending} tarea${pending === 1 ? "" : "s"}` : "Sin tareas"}</Text></View>
              {course.source === "canvas" ? <Text style={[styles.source, { color: colors.accent, backgroundColor: colors.accentSoft }]}>CANVAS</Text> : null}
            </View>
          </Card>
        );
      })}
      {snapshot.courses.length === 0 ? <Card><Text style={[styles.empty, { color: colors.textMuted }]}>Sin materias. Sincroniza Canvas desde Más.</Text></Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  courseCard: { position: "relative", overflow: "hidden", paddingLeft: 20 },
  bar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  courseHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  code: { fontSize: 11, fontWeight: "800", letterSpacing: 0.7 },
  name: { marginTop: 4, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  arrow: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  metaRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  meta: { fontSize: 12 },
  footer: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  source: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: "800" },
  empty: { textAlign: "center", paddingVertical: 18, fontSize: 13 },
});
