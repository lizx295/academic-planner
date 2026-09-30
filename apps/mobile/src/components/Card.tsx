import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { usePlannerTheme } from "@/theme";

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors } = usePlannerTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const { colors } = usePlannerTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionText, { color: colors.text }]}>{children}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  sectionText: { fontSize: 15, fontWeight: "700", letterSpacing: -0.25 },
});
