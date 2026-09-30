import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  href: string | null;
  onRead: () => void;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const markNotificationRead = usePlannerStore((state) => state.markNotificationRead);
  const markAnnouncementRead = usePlannerStore((state) => state.markAnnouncementRead);
  const markConversationRead = usePlannerStore((state) => state.markConversationRead);
  const courseById = new Map(snapshot.courses.map((course) => [course.id, course]));

  const rows: NotificationRow[] = [
    ...snapshot.notifications.map((item) => ({
      id: `notification:${item.id}`,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt,
      read: item.read,
      icon: iconForKind(item.kind),
      href: item.href ?? null,
      onRead: () => markNotificationRead(item.id),
    })),
    ...snapshot.announcements.map((item) => ({
      id: `announcement:${item.id}`,
      title: item.title,
      body: `${courseById.get(item.courseId)?.code ?? "Canvas"} · ${plainText(item.message)}`,
      createdAt: item.postedAt,
      read: item.read,
      icon: "megaphone-outline" as const,
      href: item.externalUrl,
      onRead: () => markAnnouncementRead(item.id),
    })),
    ...snapshot.conversations.map((item) => ({
      id: `conversation:${item.id}`,
      title: item.subject || "Mensaje de Canvas",
      body: item.preview,
      createdAt: item.lastMessageAt,
      read: item.read,
      icon: "chatbubble-ellipses-outline" as const,
      href: "/inbox",
      onRead: () => markConversationRead(item.id),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function open(item: NotificationRow) {
    item.onRead();
    if (item.href?.startsWith("/")) router.push(item.href as never);
    else if (item.href) void Linking.openURL(item.href);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32, paddingHorizontal: Math.max(20, (width - 760) / 2) }]}>
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Volver</Text></Pressable>
      <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Avisos de Canvas y recordatorios de tu agenda.</Text>
      <View style={[styles.list, { borderTopColor: colors.border }]}> 
        {rows.map((item) => (
          <Pressable key={item.id} onPress={() => open(item)} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.65 : 1 }]}>
            <View style={[styles.icon, { backgroundColor: item.read ? colors.surfaceSubtle : colors.accentSoft }]}><Ionicons name={item.icon} size={18} color={item.read ? colors.textFaint : colors.accent} /></View>
            <View style={styles.copy}>
              <View style={styles.rowTitleLine}><Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>{!item.read ? <View style={[styles.unread, { backgroundColor: colors.accent }]} /> : null}</View>
              <Text numberOfLines={2} style={[styles.body, { color: colors.textMuted }]}>{item.body}</Text>
              <Text style={[styles.date, { color: colors.textFaint }]}>{new Date(item.createdAt).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" })}</Text>
            </View>
          </Pressable>
        ))}
        {rows.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Todavía no hay notificaciones.</Text> : null}
      </View>
    </ScrollView>
  );
}

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function iconForKind(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === "task_due" || kind === "due_changed") return "time-outline";
  if (kind === "grade_posted") return "stats-chart-outline";
  if (kind === "message") return "chatbubble-ellipses-outline";
  if (kind === "announcement") return "megaphone-outline";
  return "notifications-outline";
}

const styles = StyleSheet.create({
  content: {},
  back: { minHeight: 44, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { fontSize: 14, fontWeight: "600" },
  title: { marginTop: 24, fontSize: 29, fontWeight: "700", letterSpacing: -0.9 },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  list: { marginTop: 24, borderTopWidth: 1 },
  row: { minHeight: 92, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 14 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  unread: { width: 7, height: 7, borderRadius: 4 },
  body: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  date: { marginTop: 5, fontSize: 10 },
  empty: { paddingVertical: 46, textAlign: "center", fontSize: 13 },
});
