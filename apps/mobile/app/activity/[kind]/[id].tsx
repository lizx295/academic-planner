import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function ActivityDetailScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: "task" | "assessment"; id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const activity = kind === "assessment" ? snapshot.assessments.find((item) => item.id === id) : snapshot.tasks.find((item) => item.id === id);
  const course = activity?.courseId ? snapshot.courses.find((item) => item.id === activity.courseId) : null;

  if (!activity) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={[styles.title, { color: colors.text }]}>Actividad no encontrada</Text><Pressable onPress={() => router.back()}><Text style={[styles.link, { color: colors.accent }]}>Volver</Text></Pressable></View>;
  }
  const title = "title" in activity ? activity.title : activity.name;
  const date = "dueDate" in activity ? activity.dueDate : activity.date;
  const time = "dueTime" in activity ? activity.dueTime : activity.time;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32, paddingHorizontal: Math.max(20, (width - 760) / 2) }]}>
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Volver</Text></Pressable>
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{course?.code ?? "PERSONAL"} · {activity.source === "canvas" ? "CANVAS · SOLO LECTURA" : "PLANIFICADOR"}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.due, { color: colors.textMuted }]}>{new Date(`${date}T12:00:00`).toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{time ? ` · ${time}` : ""}</Text>
      </View>

      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <View style={styles.stats}>
        {activity.pointsPossible != null ? <Stat label="Puntos" value={String(activity.pointsPossible)} /> : null}
        {activity.questionCount != null ? <Stat label="Preguntas" value={String(activity.questionCount)} /> : null}
        {activity.timeLimitMinutes != null ? <Stat label="Tiempo" value={`${activity.timeLimitMinutes} min`} /> : null}
        {activity.allowedAttempts != null ? <Stat label="Intentos" value={activity.allowedAttempts < 0 ? "Ilimitados" : String(activity.allowedAttempts)} /> : null}
      </View>

      {(activity.submissionState || activity.submittedAt || activity.missing || activity.late) ? (
        <Section title="Tu entrega">
          <Text style={[styles.body, { color: colors.textMuted }]}>{activity.missing ? "No entregada" : activity.submissionState?.replaceAll("_", " ") || "Registrada"}{activity.submittedAt ? ` · ${new Date(activity.submittedAt).toLocaleString("es-EC")}` : ""}{activity.late ? " · Entrega tardía" : ""}</Text>
        </Section>
      ) : null}

      <Section title="Instrucciones">
        <Text selectable style={[styles.body, { color: activity.description ? colors.textMuted : colors.textFaint }]}>{activity.description?.trim() || "No hay una descripción disponible. Sincroniza Canvas nuevamente si la actividad se descargó antes de esta actualización."}</Text>
      </Section>

      {activity.attachments?.length ? <Section title="Archivos entregados">{activity.attachments.map((file) => <Pressable key={file.id} onPress={() => void Linking.openURL(file.url)} style={[styles.file, { borderColor: colors.border }]}><Ionicons name="document-outline" size={17} color={colors.textFaint} /><Text numberOfLines={1} style={[styles.fileText, { color: colors.text }]}>{file.name}</Text><Ionicons name="open-outline" size={15} color={colors.accent} /></Pressable>)}</Section> : null}

      {activity.feedback?.length ? <Section title="Comentarios">{activity.feedback.map((comment) => <View key={comment.id} style={[styles.comment, { borderColor: colors.border }]}><Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.author}</Text><Text style={[styles.body, { color: colors.textMuted }]}>{comment.comment}</Text></View>)}</Section> : null}

      {activity.externalUrl ? <Pressable onPress={() => void Linking.openURL(activity.externalUrl!)} style={[styles.primary, { backgroundColor: colors.accent }]}><Text style={[styles.primaryText, { color: colors.onAccent }]}>Abrir en Aula Virtual</Text><Ionicons name="open-outline" size={16} color={colors.onAccent} /></Pressable> : null}
    </ScrollView>
  );

  function Stat({ label, value }: { label: string; value: string }) {
    return <View style={styles.stat}><Text style={[styles.statLabel, { color: colors.textFaint }]}>{label.toUpperCase()}</Text><Text style={[styles.statValue, { color: colors.text }]}>{value}</Text></View>;
  }
  function Section({ title: sectionTitle, children }: { title: string; children: ReactNode }) {
    return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.text }]}>{sectionTitle}</Text><View style={styles.sectionBody}>{children}</View></View>;
  }
}

const styles = StyleSheet.create({
  content: {},
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  back: { minHeight: 44, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { fontSize: 14, fontWeight: "600" },
  heading: { marginTop: 24 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },
  title: { marginTop: 8, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.8 },
  due: { marginTop: 10, fontSize: 13, lineHeight: 19 },
  rule: { height: 1, marginVertical: 22 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 22 },
  stat: { minWidth: 72 },
  statLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  statValue: { marginTop: 4, fontSize: 16, fontWeight: "700" },
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  sectionBody: { marginTop: 10, gap: 9 },
  body: { fontSize: 14, lineHeight: 23 },
  file: { minHeight: 48, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  fileText: { flex: 1, fontSize: 13, fontWeight: "600" },
  comment: { borderLeftWidth: 2, paddingLeft: 12, paddingVertical: 3, gap: 5 },
  commentAuthor: { fontSize: 12, fontWeight: "700" },
  primary: { marginTop: 30, minHeight: 48, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { fontSize: 14, fontWeight: "700" },
  link: { marginTop: 14, fontSize: 14, fontWeight: "700" },
});
