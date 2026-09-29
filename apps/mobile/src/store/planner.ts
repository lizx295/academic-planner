import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  mergeCanvasSync,
  type CanvasSyncPayload,
  type PlannerSnapshot,
} from "@academic-planner/core";

import { createMobileDemo } from "@/data/demo";
import { getSupabaseClient } from "@/lib/supabase";

const STORAGE_KEY = "academic-planner-mobile-state";
type CloudStatus = "local" | "connecting" | "synced" | "error";

interface MobilePlannerStore {
  snapshot: PlannerSnapshot;
  ready: boolean;
  cloudStatus: CloudStatus;
  cloudMessage: string | null;
  initialize: () => Promise<void>;
  toggleTask: (id: string) => void;
  syncCanvas: (secret: string) => Promise<CanvasSyncPayload["counts"]>;
}

async function persistSnapshot(snapshot: PlannerSnapshot) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  const result = await supabase.from("planner_states").upsert({ user_id: userId, state: snapshot });
  if (result.error) throw result.error;
}

export const usePlannerStore = create<MobilePlannerStore>((set, get) => ({
  snapshot: createMobileDemo(),
  ready: false,
  cloudStatus: "local",
  cloudMessage: null,

  initialize: async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) set({ snapshot: JSON.parse(cached) as PlannerSnapshot });
      const supabase = getSupabaseClient();
      if (!supabase) {
        set({ ready: true, cloudStatus: "local", cloudMessage: "Configura Supabase para activar el respaldo." });
        return;
      }
      set({ cloudStatus: "connecting", cloudMessage: null });
      const session = await supabase.auth.getSession();
      if (session.error) throw session.error;
      let user = session.data.session?.user;
      if (!user) {
        const anonymous = await supabase.auth.signInAnonymously();
        if (anonymous.error) throw anonymous.error;
        user = anonymous.data.user ?? undefined;
      }
      if (!user) throw new Error("Supabase no devolvió una sesión.");
      const remote = await supabase
        .from("planner_states")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      if (remote.error) throw remote.error;
      if (remote.data?.state) {
        const snapshot = remote.data.state as PlannerSnapshot;
        set({ snapshot });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } else {
        await persistSnapshot(get().snapshot);
      }
      set({ ready: true, cloudStatus: "synced", cloudMessage: null });
    } catch (error) {
      set({
        ready: true,
        cloudStatus: "error",
        cloudMessage: error instanceof Error ? error.message : "No se pudo conectar con Supabase.",
      });
    }
  },

  toggleTask: (id) => {
    const current = get().snapshot;
    const snapshot = {
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id
          ? { ...task, status: task.status === "completed" ? "pending" as const : "completed" as const }
          : task,
      ),
    };
    set({ snapshot });
    persistSnapshot(snapshot).then(
      () => set({ cloudStatus: getSupabaseClient() ? "synced" : "local", cloudMessage: null }),
      (error: unknown) => set({ cloudStatus: "error", cloudMessage: error instanceof Error ? error.message : "No se pudo guardar." }),
    );
  },

  syncCanvas: async (secret) => {
    const apiUrl = process.env.EXPO_PUBLIC_WEB_API_URL?.replace(/\/$/, "");
    if (!apiUrl) throw new Error("Falta EXPO_PUBLIC_WEB_API_URL.");
    const response = await fetch(`${apiUrl}/api/canvas/sync`, {
      method: "POST",
      headers: { "x-canvas-sync-secret": secret },
    });
    const body = await response.json() as CanvasSyncPayload | { error?: string };
    if (!response.ok || !("courses" in body)) {
      throw new Error("error" in body && body.error ? body.error : "No se pudo sincronizar Canvas.");
    }
    const snapshot = mergeCanvasSync(get().snapshot, body);
    set({ snapshot });
    await persistSnapshot(snapshot);
    set({ cloudStatus: getSupabaseClient() ? "synced" : "local", cloudMessage: null });
    return body.counts;
  },
}));
