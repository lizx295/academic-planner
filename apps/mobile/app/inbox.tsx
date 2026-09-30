import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function InboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = usePlannerTheme();
  const [mode, setMode] = useState<"messages" | "announcements">("messages");
  const snapshot = usePlannerStore((state) => state.snapshot);
  const markAnnouncementRead = usePlannerStore((state) => state.markAnnouncementRead);
  const markConversationRead = usePlannerStore((state) => state.markConversationRead);
  const courses = new Map(snapshot.courses.map((course) => [course.id, course]));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32, paddingHorizontal: Math.max(20, (width - 760) / 2) }]}>
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Volver</Text></Pressable>
      <Text style={[styles.title, { color: colors.text }]}>Bandeja</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Mensajes y anuncios sincronizados desde Canvas.</Text>
      <View style={[styles.switcher, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}> 
        {([['messages', 'Mensajes'], ['announcements', 'Anuncios']] as const).map(([id, label]) => <Pressable key={id} onPress={() => setMode(id)} style={[styles.switch, mode === id && { backgroundColor: colors.surface }]}><Text style={[styles.switchText, { color: mode === id ? colors.text : colors.textMuted }]}>{label}</Text></Pressable>)}
      </View>

      <View style={[styles.list, { borderTopColor: colors.border }]}> 
        {mode === "messages" ? snapshot.conversations.map((item) => (
          <Pressable key={item.id} onPress={() => { markConversationRead(item.id); if (item.externalUrl) void Linking.openURL(item.externalUrl); }} style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.heading}><Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>{item.subject || "Mensaje de Canvas"}</Text>{!item.read ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : null}</View>
            <Text style={[styles.author, { color: colors.textFaint }]}>{item.participantNames.join(", ") || "Canvas"}</Text>
            <Text numberOfLines={3} style={[styles.body, { color: colors.textMuted }]}>{item.preview}</Text>
            <Text style={[styles.date, { color: colors.textFaint }]}>{new Date(item.lastMessageAt).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" })}</Text>
          </Pressable>
        )) : snapshot.announcements.map((item) => (
          <Pressable key={item.id} onPress={() => { markAnnouncementRead(item.id); if (item.externalUrl) void Linking.openURL(item.externalUrl); }} style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.heading}><Text numberOfLines={2} style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>{!item.read ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : null}</View>
            <Text style={[styles.author, { color: colors.textFaint }]}>{courses.get(item.courseId)?.code ?? "Canvas"} · {item.authorName}</Text>
            <Text numberOfLines={4} style={[styles.body, { color: colors.textMuted }]}>{plainText(item.message)}</Text>
            <Text style={[styles.date, { color: colors.textFaint }]}>{new Date(item.postedAt).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" })}</Text>
          </Pressable>
        ))}
        {((mode === "messages" && snapshot.conversations.length === 0) || (mode === "announcements" && snapshot.announcements.length === 0)) ? <Text style={[styles.empty, { color: colors.textMuted }]}>No hay contenido sincronizado en esta sección.</Text> : null}
      </View>
    </ScrollView>
  );
}

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const styles = StyleSheet.create({
  content: {},
  back: { minHeight: 44, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { fontSize: 14, fontWeight: "600" },
  title: { marginTop: 24, fontSize: 29, fontWeight: "700", letterSpacing: -0.9 },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  switcher: { marginTop: 22, height: 42, borderRadius: 10, borderWidth: 1, flexDirection: "row", padding: 3 },
  switch: { flex: 1, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  switchText: { fontSize: 12, fontWeight: "700" },
  list: { marginTop: 20, borderTopWidth: 1 },
  row: { borderBottomWidth: 1, paddingVertical: 16 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  author: { marginTop: 4, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.45 },
  body: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  date: { marginTop: 8, fontSize: 10 },
  empty: { paddingVertical: 46, textAlign: "center", fontSize: 13 },
});
