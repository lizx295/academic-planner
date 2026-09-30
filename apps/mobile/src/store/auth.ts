import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { create } from "zustand";

import { getSupabaseClient } from "@/lib/supabase";

const LOCAL_AUTH_KEY = "academic-planner-mobile-local-session";

export type MobileAuthStatus = "loading" | "guest" | "local" | "authenticated";
export interface MobileLocalSession { name: string; email: string }

interface MobileAuthStore {
  status: MobileAuthStatus;
  ready: boolean;
  email: string | null;
  name: string | null;
  supabaseEnabled: boolean;
  initialize: () => Promise<void>;
  continueLocally: (name: string, email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useMobileAuth = create<MobileAuthStore>((set) => ({
  status: "loading",
  ready: false,
  email: null,
  name: null,
  supabaseEnabled: Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),

  initialize: async () => {
    const localRaw = await AsyncStorage.getItem(LOCAL_AUTH_KEY);
    const local = localRaw ? JSON.parse(localRaw) as MobileLocalSession : null;
    const supabase = getSupabaseClient();
    if (!supabase) {
      set({ ready: true, status: local ? "local" : "guest", email: local?.email ?? null, name: local?.name ?? null });
      return;
    }
    const result = await supabase.auth.getSession();
    if (result.error) throw result.error;
    const user = result.data.session?.user;
    set({
      ready: true,
      status: user ? "authenticated" : local ? "local" : "guest",
      email: user?.email ?? local?.email ?? null,
      name: String(user?.user_metadata?.display_name ?? local?.name ?? "") || null,
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user;
      set(current ? {
        ready: true,
        status: "authenticated",
        email: current.email ?? null,
        name: String(current.user_metadata?.display_name ?? "") || null,
      } : { ready: true, status: "guest", email: null, name: null });
    });
    const consumeAuthUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
      if (code) await supabase.auth.exchangeCodeForSession(code);
    };
    void Linking.getInitialURL().then(consumeAuthUrl);
    Linking.addEventListener("url", ({ url }) => { void consumeAuthUrl(url); });
  },

  continueLocally: async (name, email) => {
    const session = { name: name.trim(), email: email.trim().toLowerCase() };
    await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(session));
    set({ status: "local", ready: true, name: session.name, email: session.email });
  },

  signIn: async (email, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está configurado.");
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) throw result.error;
    await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
  },

  signUp: async (name, email, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está configurado.");
    const result = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
    if (result.error) throw result.error;
    await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
    return !result.data.session;
  },

  sendMagicLink: async (email) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está configurado.");
    const result = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: "academic-planner://" } });
    if (result.error) throw result.error;
  },

  signOut: async () => {
    await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    set({ status: "guest", ready: true, email: null, name: null });
  },
}));
