import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { courseColors } from "@academic-planner/core";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function CoursesScreen() {
  const router = useRouter();
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const professors = new Map(snapshot.professors.map((item) => [item.id, item]));
  return (
    <Screen title="Materias" subtitle="Tu carga académica del periodo actual.">
      {snapshot.courses.map((course) => {
        const professor = professors.get(course.professorId);
        const showSections = (course.sections?.length ?? 0) > 1;
        const pending = snapshot.tasks.filter((task) => task.courseId === course.id && task.status !== "completed").length;
        const accent = courseColors[course.color];
        return (
          <Pressable key={course.id} onPress={() => router.push(`/course/${course.id}` as never)}>
          <Card style={styles.courseCard}>
            <View style={[styles.bar, { backgroundColor: accent }]} />
            <View style={styles.courseHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.code, { color: accent }]}>{course.code}</Text>
                <Text style={[styles.name, { color: colors.text }]}>{course.name}</Text>
              </View>
              <View style={[styles.arrow, { backgroundColor: colors.surfaceSubtle }]}><Ionicons name="arrow-up-outline" size={17} color={colors.textFaint} style={{ transform: [{ rotate: "45deg" }] }} /></View>
            </View>
            {showSections ? (
              <View style={styles.sections}>
                {course.sections?.map((section) => {
                  const names = section.professorIds
                    .map((id) => professors.get(id))
                    .filter(Boolean)
                    .map((item) => `${item?.title ? `${item.title} ` : ""}${item?.name ?? ""}`);
                  return (
                    <View key={section.id} style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.sectionLabel, { color: colors.accent }]}>{section.label.toUpperCase()}</Text>
                      <Text numberOfLines={2} style={[styles.sectionText, { color: colors.textMuted }]}>{names.length ? names.join(", ") : "Docente no informado"}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.metaRow, styles.professorRow]}><Ionicons name="person-outline" size={14} color={colors.textFaint} /><Text numberOfLines={1} style={[styles.meta, styles.flexText, { color: colors.textMuted }]}>{professor ? `${professor.title} ${professor.name}`.trim() : "Sin profesor asignado"}</Text></View>
            )}
            <View style={styles.footer}>
              <View style={styles.metaRow}><Ionicons name="checkbox-outline" size={14} color={colors.textFaint} /><Text style={[styles.meta, { color: colors.textMuted }]}>{pending ? `${pending} tarea${pending === 1 ? "" : "s"}` : "Sin tareas"}</Text></View>
              {course.source === "canvas" ? <Text style={[styles.source, { color: colors.accent, backgroundColor: colors.accentSoft }]}>CANVAS</Text> : null}
            </View>
          </Card>
          </Pressable>
        );
      })}
      {snapshot.courses.length === 0 ? <Card><Text style={[styles.empty, { color: colors.textMuted }]}>Sin materias. Sincroniza Canvas desde Más.</Text></Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  courseCard: { position: "relative", overflow: "hidden", paddingLeft: 20, paddingRight: 16 },
  bar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  courseHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  code: { fontSize: 11, fontWeight: "800", letterSpacing: 0.7 },
  name: { marginTop: 4, fontSize: 16, lineHeight: 21, fontWeight: "700", flexShrink: 1 },
  arrow: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  professorRow: { marginTop: 12 },
  meta: { fontSize: 12 },
  flexText: { flex: 1 },
  sections: { marginTop: 12, flexDirection: "row", gap: 8 },
  section: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 },
  sectionLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  sectionText: { marginTop: 4, fontSize: 11, lineHeight: 15 },
  footer: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  source: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: "800" },
  empty: { textAlign: "center", paddingVertical: 18, fontSize: 13 },
});
