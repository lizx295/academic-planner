import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function RootLayout() {
  const initialize = usePlannerStore((state) => state.initialize);
  const { dark, colors } = usePlannerTheme();
  useEffect(() => { void initialize(); }, [initialize]);
  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </SafeAreaProvider>
  );
}
