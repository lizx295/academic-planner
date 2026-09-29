import { StyleSheet, Text, View } from "react-native";
import { usePlannerTheme } from "@/theme";

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const { colors } = usePlannerTheme();
  const palette = tone === "success"
    ? { color: colors.present, backgroundColor: colors.presentSoft }
    : tone === "warning"
      ? { color: colors.warning, backgroundColor: colors.warningSoft }
      : tone === "danger"
        ? { color: colors.danger, backgroundColor: colors.dangerSoft }
        : { color: colors.textMuted, backgroundColor: colors.surfaceSubtle };
  return (
    <View style={[styles.pill, { backgroundColor: palette.backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: palette.color }]} />
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: "700" },
});
