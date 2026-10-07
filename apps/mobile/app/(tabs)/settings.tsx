import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { Card, SectionTitle } from "@/components/Card";
import { enableMobileNotifications, sendTestMobileNotification } from "@/components/NotificationManager";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { useMobileAuth } from "@/store/auth";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = usePlannerTheme();
  const auth = useMobileAuth();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const cloudStatus = usePlannerStore((state) => state.cloudStatus);
  const cloudMessage = usePlannerStore((state) => state.cloudMessage);
  const canvasConnected = usePlannerStore((state) => state.canvasConnected);
  const syncCanvas = usePlannerStore((state) => state.syncCanvas);
  const forgetCanvas = usePlannerStore((state) => state.forgetCanvas);
  const updateNotificationPreferences = usePlannerStore((state) => state.updateNotificationPreferences);
  const [token, setToken] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function onSync() {
    setSyncing(true);
    try {
      const counts = await syncCanvas(token || undefined);
      setToken("");
      Alert.alert("Sincronización completada", `${counts.courses} materias, ${counts.tasks} tareas y ${counts.grades} notas actualizadas.`);
    } catch (error) {
      Alert.alert("No se pudo sincronizar", error instanceof Error ? error.message : "Revisa la configuración.");
    } finally {
      setSyncing(false);
    }
  }

  async function onForget() {
    try {
      await forgetCanvas();
      Alert.alert("Token eliminado", "El token cifrado se eliminó de Supabase.");
    } catch (error) {
      Alert.alert("No se pudo eliminar", error instanceof Error ? error.message : "Inténtalo otra vez.");
    }
  }

  async function toggleNotifications(enabled: boolean) {
    try {
      if (!enabled) {
        await updateNotificationPreferences({ mobile: false });
        return;
      }
      if (Platform.OS === "web") {
        Alert.alert("Disponible en la app nativa", "En Expo Web, activa las notificaciones desde la aplicación web principal.");
        return;
      }
      const granted = await enableMobileNotifications();
      if (!granted) {
        Alert.alert("Permiso no concedido", "Puedes habilitarlo después desde los ajustes del dispositivo.");
        return;
      }
      await updateNotificationPreferences({ enabled: true, mobile: true });
      Alert.alert("Notificaciones activadas", "Se programarán avisos antes de tus próximas entregas.");
    } catch (error) {
      Alert.alert("No se pudo actualizar", error instanceof Error ? error.message : "Inténtalo de nuevo.");
    }
  }

  const cloudLabel = cloudStatus === "synced" ? "Sincronizado" : cloudStatus === "connecting" ? "Conectando" : cloudStatus === "error" ? "Error" : "Solo local";
  return (
    <Screen title="Más" subtitle="Perfil, nube e integraciones.">
      <Card>
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{(snapshot.profile.name || "E").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{snapshot.profile.name || "Estudiante"}</Text>
            <Text style={[styles.program, { color: colors.textMuted }]}>{snapshot.profile.program || "Programa no configurado"}</Text>
            <Text style={[styles.university, { color: colors.textFaint }]}>{snapshot.profile.university || "Universidad"}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle action={<StatusPill label={auth.status === "authenticated" ? "Con nube" : "Local"} tone={auth.status === "authenticated" ? "success" : "neutral"} />}>Cuenta</SectionTitle>
        <Text style={[styles.accountName, { color: colors.text }]}>{auth.name || snapshot.profile.name || "Estudiante"}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>{auth.email || "Sin correo configurado"}</Text>
        <Text style={[styles.hint, { color: colors.textFaint }]}>{auth.status === "authenticated" ? "La sesión está vinculada a Supabase y puede sincronizarse entre dispositivos." : "La sesión y los datos permanecen en este dispositivo."}</Text>
        <Pressable onPress={() => { void auth.signOut(); }} style={[styles.secondaryButton, { borderColor: colors.borderStrong }]}><Ionicons name="log-out-outline" size={16} color={colors.textMuted} /><Text style={[styles.secondaryText, { color: colors.textMuted }]}>Cerrar sesión</Text></Pressable>
      </Card>

      <Card>
        <SectionTitle>Comunicación</SectionTitle>
        <Pressable onPress={() => router.push("/notifications" as never)} style={[styles.linkRow, { borderBottomColor: colors.border }]}><Ionicons name="notifications-outline" size={19} color={colors.accent} /><View style={styles.linkCopy}><Text style={[styles.linkTitle, { color: colors.text }]}>Notificaciones</Text><Text style={[styles.linkMeta, { color: colors.textMuted }]}>Recordatorios y avisos recientes</Text></View><Ionicons name="chevron-forward" size={17} color={colors.textFaint} /></Pressable>
        <Pressable onPress={() => router.push("/inbox" as never)} style={[styles.linkRow, { borderBottomColor: colors.border }]}><Ionicons name="mail-outline" size={19} color={colors.accent} /><View style={styles.linkCopy}><Text style={[styles.linkTitle, { color: colors.text }]}>Bandeja Canvas</Text><Text style={[styles.linkMeta, { color: colors.textMuted }]}>{snapshot.conversations.filter((item) => !item.read).length + snapshot.announcements.filter((item) => !item.read).length} sin leer</Text></View><Ionicons name="chevron-forward" size={17} color={colors.textFaint} /></Pressable>
        <View style={styles.toggleRow}><View style={styles.linkCopy}><Text style={[styles.linkTitle, { color: colors.text }]}>Avisos en este dispositivo</Text><Text style={[styles.linkMeta, { color: colors.textMuted }]}>24 y 2 horas antes de cada entrega</Text></View><Switch value={snapshot.notificationPreferences.mobile} onValueChange={(value) => { void toggleNotifications(value); }} trackColor={{ false: colors.borderStrong, true: colors.accentSoft }} thumbColor={snapshot.notificationPreferences.mobile ? colors.accent : colors.textFaint} /></View>
        {([
          ["announcements", "Anuncios", "Comunicados nuevos de tus materias"],
          ["messages", "Mensajes", "Conversaciones de Canvas sin leer"],
          ["discussions", "Foros", "Respuestas y actividad nueva"],
          ["contentUpdates", "Contenido", "Páginas, archivos y módulos nuevos"],
          ["deadlines", "Entregas", "Recordatorios antes del vencimiento"],
        ] as const).map(([key, label, description]) => (
          <View key={key} style={[styles.preferenceRow, { borderTopColor: colors.border }]}>
            <View style={styles.linkCopy}><Text style={[styles.linkTitle, { color: colors.text }]}>{label}</Text><Text style={[styles.linkMeta, { color: colors.textMuted }]}>{description}</Text></View>
            <Switch value={snapshot.notificationPreferences[key]} onValueChange={(value) => { void updateNotificationPreferences({ [key]: value }); }} trackColor={{ false: colors.borderStrong, true: colors.accentSoft }} thumbColor={snapshot.notificationPreferences[key] ? colors.accent : colors.textFaint} />
          </View>
        ))}
        {snapshot.notificationPreferences.mobile && Platform.OS !== "web" ? (
          <Pressable onPress={() => { void sendTestMobileNotification().then((shown) => Alert.alert(shown ? "Prueba enviada" : "Sin permiso", shown ? "Revisa las notificaciones del sistema." : "Habilita las notificaciones en los ajustes del dispositivo.")); }} style={[styles.secondaryButton, { borderColor: colors.borderStrong }]}><Ionicons name="notifications-circle-outline" size={17} color={colors.textMuted} /><Text style={[styles.secondaryText, { color: colors.textMuted }]}>Probar notificación del sistema</Text></Pressable>
        ) : null}
      </Card>

      <Card>
        <SectionTitle action={<StatusPill label={cloudLabel} tone={cloudStatus === "synced" ? "success" : cloudStatus === "error" ? "danger" : "neutral"} />}>
          Respaldo Supabase
        </SectionTitle>
        <Text style={[styles.description, { color: colors.textMuted }]}>{cloudMessage ?? "Tus cambios se guardan localmente y en tu fila privada de Supabase."}</Text>
      </Card>

      <Card>
        <View style={styles.integrationTitle}>
          <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><Ionicons name="school-outline" size={18} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Aula Virtual ESPOL</Text>
            <Text style={[styles.description, { color: colors.textMuted }]}>Introduce tu token personal. Con Supabase se guarda cifrado en el servidor.</Text>
          </View>
        </View>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder={canvasConnected ? "Token guardado; vacío para reutilizar" : "Token personal de Canvas"}
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoCapitalize="none"
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surfaceSubtle }]}
        />
        <Pressable
          disabled={(!token && !canvasConnected) || syncing}
          onPress={() => { void onSync(); }}
          style={({ pressed }) => [styles.button, { backgroundColor: colors.accent, opacity: (!token && !canvasConnected) || syncing ? 0.45 : pressed ? 0.8 : 1 }]}
        >
          {syncing ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Ionicons name="sync-outline" size={17} color={colors.onAccent} />}
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>{syncing ? "Sincronizando" : "Sincronizar ahora"}</Text>
        </Pressable>
        {canvasConnected ? (
          <Pressable onPress={() => { void onForget(); }} style={styles.forgetButton}>
            <Ionicons name="unlink-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.forgetText, { color: colors.textMuted }]}>Olvidar token guardado</Text>
          </Pressable>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Arquitectura compartida</SectionTitle>
        <Text style={[styles.description, { color: colors.textMuted }]}>Esta app usa los mismos tipos, reglas de sincronización y colores que Academic Planner web. El token nunca se incluye en el bundle ni se devuelve al dispositivo.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800" },
  name: { fontSize: 16, fontWeight: "700" },
  program: { marginTop: 3, fontSize: 12 },
  university: { marginTop: 2, fontSize: 11 },
  description: { marginTop: 7, fontSize: 12, lineHeight: 18 },
  accountName: { marginTop: 14, fontSize: 15, fontWeight: "700" },
  hint: { marginTop: 8, fontSize: 11, lineHeight: 16 },
  integrationTitle: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  input: { marginTop: 15, height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 14 },
  button: { marginTop: 10, height: 46, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonText: { fontSize: 14, fontWeight: "700" },
  forgetButton: { marginTop: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  forgetText: { fontSize: 12, fontWeight: "600" },
  secondaryButton: { marginTop: 15, minHeight: 42, borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  secondaryText: { fontSize: 13, fontWeight: "700" },
  linkRow: { minHeight: 62, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  toggleRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12 },
  preferenceRow: { minHeight: 60, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12 },
  linkCopy: { flex: 1 },
  linkTitle: { fontSize: 13, fontWeight: "700" },
  linkMeta: { marginTop: 3, fontSize: 11 },
});
