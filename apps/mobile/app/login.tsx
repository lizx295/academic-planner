import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMobileAuth } from "@/store/auth";
import { usePlannerStore } from "@/store/planner";
import { usePlannerTheme } from "@/theme";

type Mode = "login" | "register" | "magic" | "local";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = usePlannerTheme();
  const auth = useMobileAuth();
  const updateProfile = usePlannerStore((state) => state.updateProfile);
  const [mode, setMode] = useState<Mode>(auth.supabaseEnabled ? "login" : "local");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    try {
      setBusy(true);
      if (!email.includes("@")) throw new Error("Escribe un correo válido.");
      if ((mode === "local" || mode === "register") && !name.trim()) throw new Error("Escribe tu nombre.");
      if ((mode === "login" || mode === "register") && password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
      if (mode === "local") {
        await auth.continueLocally(name, email);
        updateProfile({ name: name.trim() });
      }
      else if (mode === "login") await auth.signIn(email, password);
      else if (mode === "register") {
        const confirmation = await auth.signUp(name, email, password);
        updateProfile({ name: name.trim() });
        if (confirmation) Alert.alert("Confirma tu correo", "La cuenta fue creada. Abre el enlace enviado por Supabase.");
      } else {
        await auth.sendMagicLink(email);
        Alert.alert("Enlace enviado", "Revisa tu correo para continuar.");
      }
    } catch (error) {
      Alert.alert("No se pudo continuar", error instanceof Error ? error.message : "Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "register" ? "Crear cuenta" : mode === "magic" ? "Enlace mágico" : mode === "local" ? "Ambiente local" : "Iniciar sesión";
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
        <View style={[styles.logo, { backgroundColor: colors.accent }]}><Ionicons name="school-outline" size={24} color={colors.onAccent} /></View>
        <Text style={[styles.brand, { color: colors.accent }]}>ACADEMIC PLANNER</Text>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{mode === "local" ? "Tus datos permanecerán en este dispositivo hasta que conectes Supabase." : "Sincroniza tu agenda académica entre la web y el móvil."}</Text>

        <View style={styles.form}>
          {(mode === "local" || mode === "register") ? <TextInput value={name} onChangeText={setName} placeholder="Nombre" placeholderTextColor={colors.textFaint} style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} /> : null}
          <TextInput value={email} onChangeText={setEmail} placeholder="Correo" placeholderTextColor={colors.textFaint} autoCapitalize="none" keyboardType="email-address" style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
          {(mode === "login" || mode === "register") ? <TextInput value={password} onChangeText={setPassword} placeholder="Contraseña" placeholderTextColor={colors.textFaint} secureTextEntry style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} /> : null}
          <Pressable onPress={() => void submit()} disabled={busy} style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}>
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <><Text style={[styles.primaryText, { color: colors.onAccent }]}>{mode === "local" ? "Continuar localmente" : mode === "register" ? "Crear cuenta" : mode === "magic" ? "Enviar enlace" : "Entrar"}</Text><Ionicons name="arrow-forward" size={17} color={colors.onAccent} /></>}
          </Pressable>
        </View>

        <View style={styles.links}>
          {auth.supabaseEnabled ? <Pressable onPress={() => setMode(mode === "register" ? "login" : "register")}><Text style={[styles.link, { color: colors.accent }]}>{mode === "register" ? "Ya tengo cuenta" : "Crear cuenta"}</Text></Pressable> : null}
          {auth.supabaseEnabled && mode !== "magic" ? <Pressable onPress={() => setMode("magic")}><Text style={[styles.link, { color: colors.textMuted }]}>Usar enlace mágico</Text></Pressable> : null}
          {mode !== "local" ? <Pressable onPress={() => setMode("local")}><Text style={[styles.link, { color: colors.textMuted }]}>Usar sin nube</Text></Pressable> : null}
          {mode === "local" && auth.supabaseEnabled ? <Pressable onPress={() => setMode("login")}><Text style={[styles.link, { color: colors.textMuted }]}>Volver al acceso con nube</Text></Pressable> : null}
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 26 },
  inner: { width: "100%", maxWidth: 428, alignSelf: "center" },
  logo: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  brand: { marginTop: 18, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { marginTop: 10, fontSize: 31, lineHeight: 37, fontWeight: "700", letterSpacing: -1 },
  subtitle: { marginTop: 9, maxWidth: 420, fontSize: 14, lineHeight: 21 },
  form: { marginTop: 30, gap: 12 },
  input: { height: 50, borderWidth: 1, borderRadius: 11, paddingHorizontal: 14, fontSize: 15 },
  primary: { height: 50, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { fontSize: 15, fontWeight: "700" },
  links: { marginTop: 22, flexDirection: "row", flexWrap: "wrap", gap: 18 },
  link: { fontSize: 13, fontWeight: "600" },
});
