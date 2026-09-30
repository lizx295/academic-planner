import { Ionicons } from "@expo/vector-icons";
import { courseColors } from "@academic-planner/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const course = snapshot.courses.find((item) => item.id === id);
  if (!course) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Materia no encontrada</Text></View>;
  const accent = courseColors[course.color];
  const professors = new Map(snapshot.professors.map((item) => [item.id, item]));
  const tasks = snapshot.tasks.filter((item) => item.courseId === course.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const assessments = snapshot.assessments.filter((item) => item.courseId === course.id).sort((a, b) => a.date.localeCompare(b.date));
  const modules = snapshot.modules.filter((item) => item.courseId === course.id).sort((a, b) => a.position - b.position);
  const materials = snapshot.materials.filter((item) => item.courseId === course.id);
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 36, paddingHorizontal: Math.max(20, (width - 760) / 2) }]}>
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Materias</Text></Pressable>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={[styles.code, { color: accent }]}>{course.code}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{course.name}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>{course.source === "canvas" ? "Canvas · solo lectura" : "Materia local"}{course.credits ? ` · ${course.credits} créditos` : ""}</Text>
      {course.sections?.length ? <View style={styles.sections}>{course.sections.map((section) => <View key={section.id} style={[styles.sectionChip, { borderColor: colors.border }]}><Text style={[styles.sectionLabel, { color: colors.accent }]}>{section.label.toUpperCase()}</Text><Text style={[styles.sectionMeta, { color: colors.textMuted }]}>{section.professorIds.map((professorId) => professors.get(professorId)?.name).filter(Boolean).join(", ") || "Docente no informado"}</Text></View>)}</View> : null}

      <Section title="Próximas actividades" count={tasks.filter((item) => item.status !== "completed").length}>
        {tasks.slice(0, 6).map((task) => <Pressable key={task.id} onPress={() => router.push(`/activity/task/${task.id}` as never)} style={[styles.row, { borderColor: colors.border }]}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>{task.title}</Text><Text style={[styles.rowMeta, { color: colors.textFaint }]}>{task.dueDate}{task.dueTime ? ` · ${task.dueTime}` : ""}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.textFaint} /></Pressable>)}
        {tasks.length === 0 ? <Text style={[styles.empty, { color: colors.textFaint }]}>No hay actividades.</Text> : null}
      </Section>

      <Section title="Evaluaciones" count={assessments.length}>
        {assessments.slice(0, 6).map((item) => <Pressable key={item.id} onPress={() => router.push(`/activity/assessment/${item.id}` as never)} style={[styles.row, { borderColor: colors.border }]}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>{item.name}</Text><Text style={[styles.rowMeta, { color: colors.textFaint }]}>{item.date}{item.weight ? ` · ${Number(item.weight.toFixed(2))}%` : ""}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.textFaint} /></Pressable>)}
      </Section>

      <Section title="Módulos" count={modules.length}>
        {modules.map((module) => { const items = snapshot.moduleItems.filter((item) => item.moduleId === module.id).sort((a, b) => a.position - b.position); return <View key={module.id} style={styles.module}><View style={styles.moduleHeader}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{module.name}</Text><Text style={[styles.rowMeta, { color: colors.textFaint }]}>{items.filter((item) => item.completed).length}/{items.length || module.itemsCount} completados</Text></View><Text style={[styles.state, { color: module.state === "completed" ? colors.present : colors.accent }]}>{module.state === "completed" ? "LISTO" : "ABIERTO"}</Text></View>{items.map((item) => <Pressable disabled={!item.externalUrl || item.locked} onPress={() => item.externalUrl && void Linking.openURL(item.externalUrl)} key={item.id} style={[styles.item, { borderColor: colors.border }]}><Ionicons name={item.completed ? "checkmark-circle" : item.locked ? "lock-closed-outline" : "document-text-outline"} size={17} color={item.completed ? colors.present : colors.textFaint} /><Text numberOfLines={2} style={[styles.itemText, { color: item.locked ? colors.textFaint : colors.text }]}>{item.title}</Text></Pressable>)}</View>; })}
        {modules.length === 0 ? <Text style={[styles.empty, { color: colors.textFaint }]}>Canvas no devolvió módulos visibles.</Text> : null}
      </Section>

      <Section title="Materiales" count={materials.length}>
        {materials.slice(0, 12).map((item) => <Pressable key={item.id} onPress={() => void Linking.openURL(item.url)} style={[styles.row, { borderColor: colors.border }]}><Ionicons name="document-outline" size={17} color={colors.textFaint} /><Text numberOfLines={1} style={[styles.itemText, { color: colors.text }]}>{item.title}</Text><Ionicons name="open-outline" size={15} color={colors.accent} /></Pressable>)}
      </Section>
    </ScrollView>
  );

  function Section({ title: sectionTitle, count, children }: { title: string; count: number; children: ReactNode }) {
    return <View style={styles.block}><View style={styles.blockTitle}><Text style={[styles.blockHeading, { color: colors.text }]}>{sectionTitle}</Text><Text style={[styles.count, { color: colors.textFaint }]}>{count}</Text></View><View>{children}</View></View>;
  }
}

const styles = StyleSheet.create({
  content: {}, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { minHeight: 44, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8 }, backText: { fontSize: 14, fontWeight: "600" },
  accent: { marginTop: 22, width: 34, height: 4, borderRadius: 2 }, code: { marginTop: 14, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { marginTop: 7, fontSize: 29, lineHeight: 35, fontWeight: "700", letterSpacing: -0.9 }, meta: { marginTop: 9, fontSize: 13 },
  sections: { marginTop: 18, flexDirection: "row", gap: 8 }, sectionChip: { flex: 1, borderTopWidth: 1, paddingTop: 10 }, sectionLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 }, sectionMeta: { marginTop: 5, fontSize: 11, lineHeight: 16 },
  block: { marginTop: 30 }, blockTitle: { marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, blockHeading: { fontSize: 18, fontWeight: "700", letterSpacing: -0.35 }, count: { fontSize: 12, fontWeight: "700" },
  row: { minHeight: 54, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, rowTitle: { fontSize: 14, fontWeight: "600" }, rowMeta: { marginTop: 3, fontSize: 11 }, empty: { paddingVertical: 16, fontSize: 13 },
  module: { marginBottom: 18 }, moduleHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }, state: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 }, item: { minHeight: 46, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 8 }, itemText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
