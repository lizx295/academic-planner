import { useEffect } from "react";
import { Stack, useRouter, useSegments, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { usePlannerStore } from "@/store/planner";
import { useMobileAuth } from "@/store/auth";
import { usePlannerTheme } from "@/theme";
import { NotificationManager } from "@/components/NotificationManager";

export default function RootLayout() {
  const initialize = usePlannerStore((state) => state.initialize);
  const initializeAuth = useMobileAuth((state) => state.initialize);
  const authReady = useMobileAuth((state) => state.ready);
  const authStatus = useMobileAuth((state) => state.status);
  const router = useRouter();
  const segments = useSegments();
  const { dark, colors } = usePlannerTheme();
  useEffect(() => { void initializeAuth(); }, [initializeAuth]);
  useEffect(() => {
    if (!authReady) return;
    const inLogin = String(segments[0]) === "login";
    if (authStatus === "guest" && !inLogin) router.replace("/login" as never);
    else if ((authStatus === "local" || authStatus === "authenticated") && inLogin) router.replace("/");
  }, [authReady, authStatus, router, segments]);
  useEffect(() => {
    if (authStatus === "local" || authStatus === "authenticated") void initialize();
  }, [authStatus, initialize]);
  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? "light" : "dark"} />
      <NotificationManager />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { colors } = usePlannerTheme();
  return (
    <SafeAreaProvider>
      <View style={[errorStyles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="auto" />
        <View style={[errorStyles.icon, { backgroundColor: colors.dangerSoft }]}><Text style={[errorStyles.iconText, { color: colors.danger }]}>!</Text></View>
        <Text style={[errorStyles.title, { color: colors.text }]}>No pudimos abrir la aplicación</Text>
        <Text style={[errorStyles.message, { color: colors.textMuted }]}>{error.message || "Ocurrió un error inesperado. Tus datos locales siguen guardados."}</Text>
        <Pressable onPress={retry} style={[errorStyles.button, { backgroundColor: colors.accent }]}><Text style={[errorStyles.buttonText, { color: colors.onAccent }]}>Reintentar</Text></Pressable>
      </View>
    </SafeAreaProvider>
  );
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 24, fontWeight: "800" },
  title: { marginTop: 20, fontSize: 23, fontWeight: "700", textAlign: "center" },
  message: { marginTop: 10, maxWidth: 420, fontSize: 14, lineHeight: 21, textAlign: "center" },
  button: { marginTop: 24, minHeight: 46, borderRadius: 11, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 14, fontWeight: "700" },
});
