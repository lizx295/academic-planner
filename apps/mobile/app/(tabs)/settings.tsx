import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

export default function SettingsScreen() {
  const { colors } = usePlannerTheme();
  const snapshot = usePlannerStore((state) => state.snapshot);
  const cloudStatus = usePlannerStore((state) => state.cloudStatus);
  const cloudMessage = usePlannerStore((state) => state.cloudMessage);
  const syncCanvas = usePlannerStore((state) => state.syncCanvas);
  const [secret, setSecret] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function onSync() {
    setSyncing(true);
    try {
      const counts = await syncCanvas(secret);
      setSecret("");
      Alert.alert("Sincronización completada", `${counts.courses} materias, ${counts.tasks} tareas y ${counts.grades} notas actualizadas.`);
    } catch (error) {
      Alert.alert("No se pudo sincronizar", error instanceof Error ? error.message : "Revisa la configuración.");
    } finally {
      setSyncing(false);
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
            <Text style={[styles.description, { color: colors.textMuted }]}>Usa la misma API segura desplegada con la aplicación web.</Text>
          </View>
        </View>
        <TextInput
          value={secret}
          onChangeText={setSecret}
          placeholder="Clave de sincronización"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoCapitalize="none"
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surfaceSubtle }]}
        />
        <Pressable
          disabled={!secret || syncing}
          onPress={() => { void onSync(); }}
          style={({ pressed }) => [styles.button, { backgroundColor: colors.accent, opacity: !secret || syncing ? 0.45 : pressed ? 0.8 : 1 }]}
        >
          {syncing ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Ionicons name="sync-outline" size={17} color={colors.onAccent} />}
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>{syncing ? "Sincronizando" : "Sincronizar ahora"}</Text>
        </Pressable>
      </Card>

      <Card>
        <SectionTitle>Arquitectura compartida</SectionTitle>
        <Text style={[styles.description, { color: colors.textMuted }]}>Esta app usa los mismos tipos, reglas de sincronización y colores que Academic Planner web. El token de Canvas permanece únicamente en Vercel.</Text>
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
  integrationTitle: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  input: { marginTop: 15, height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 14 },
  button: { marginTop: 10, height: 46, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonText: { fontSize: 14, fontWeight: "700" },
});
