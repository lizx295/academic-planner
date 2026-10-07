import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  mergeCanvasSync,
  upgradeCanvasCourseSections,
  type CanvasSyncPayload,
  type PlannerSnapshot,
  type NotificationPreferences,
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
  canvasConnected: boolean;
  initialize: () => Promise<void>;
  toggleTask: (id: string) => void;
  updateProfile: (patch: Partial<PlannerSnapshot["profile"]>) => void;
  syncCanvas: (token?: string) => Promise<CanvasSyncPayload["counts"]>;
  forgetCanvas: () => Promise<void>;
  updateNotificationPreferences: (patch: Partial<NotificationPreferences>) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAnnouncementRead: (id: string) => void;
  markConversationRead: (id: string) => void;
  markDashboardItemRead: (id: string) => void;
}

function webApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_WEB_API_URL?.replace(/\/$/, "");
  if (!url) throw new Error("Falta EXPO_PUBLIC_WEB_API_URL.");
  return url;
}

async function authorizationHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
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
  canvasConnected: false,

  initialize: async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const snapshot = upgradeCanvasCourseSections(JSON.parse(cached) as PlannerSnapshot);
        set({ snapshot });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      }
      const supabase = getSupabaseClient();
      if (!supabase) {
        set({ ready: true, cloudStatus: "local", cloudMessage: "Configura Supabase para activar el respaldo." });
        return;
      }
      set({ cloudStatus: "connecting", cloudMessage: null });
      const session = await supabase.auth.getSession();
      if (session.error) throw session.error;
      const user = session.data.session?.user;
      if (!user) {
        set({ ready: true, cloudStatus: "local", cloudMessage: "Inicia sesión para activar el respaldo entre dispositivos." });
        return;
      }
      const remote = await supabase
        .from("planner_states")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      if (remote.error) throw remote.error;
      if (remote.data?.state) {
        const snapshot = upgradeCanvasCourseSections(remote.data.state as PlannerSnapshot);
        set({ snapshot });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } else {
        await persistSnapshot(get().snapshot);
      }
      set({ ready: true, cloudStatus: "synced", cloudMessage: null });
      if (process.env.EXPO_PUBLIC_WEB_API_URL) {
        try {
          const headers = await authorizationHeaders();
          const response = await fetch(`${webApiUrl()}/api/canvas/sync`, { headers });
          if (response.ok) {
            const body = await response.json() as { connected?: boolean };
            set({ canvasConnected: body.connected === true });
          }
        } catch {
          // La disponibilidad de la API de Canvas no cambia el estado del respaldo Supabase.
        }
      }
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

  updateProfile: (patch) => {
    const snapshot = { ...get().snapshot, profile: { ...get().snapshot.profile, ...patch } };
    set({ snapshot });
    void persistSnapshot(snapshot);
  },

  syncCanvas: async (token) => {
    const auth = await authorizationHeaders();
    const response = await fetch(`${webApiUrl()}/api/canvas/sync`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ canvasToken: token || undefined, remember: Boolean(auth.Authorization) }),
    });
    const body = await response.json() as CanvasSyncPayload | { error?: string };
    if (!response.ok || !("courses" in body)) {
      throw new Error("error" in body && body.error ? body.error : "No se pudo sincronizar Canvas.");
    }
    const snapshot = mergeCanvasSync(get().snapshot, body);
    set({ snapshot });
    await persistSnapshot(snapshot);
    set({
      cloudStatus: getSupabaseClient() ? "synced" : "local",
      cloudMessage: null,
      canvasConnected: Boolean(auth.Authorization) || get().canvasConnected,
    });
    return body.counts;
  },

  forgetCanvas: async () => {
    const response = await fetch(`${webApiUrl()}/api/canvas/sync`, {
      method: "DELETE",
      headers: await authorizationHeaders(),
    });
    const body = await response.json() as { error?: string };
    if (!response.ok) throw new Error(body.error || "No se pudo eliminar el token guardado.");
    set({ canvasConnected: false });
  },

  updateNotificationPreferences: async (patch) => {
    const snapshot = {
      ...get().snapshot,
      notificationPreferences: { ...get().snapshot.notificationPreferences, ...patch },
    };
    set({ snapshot });
    await persistSnapshot(snapshot);
  },

  markNotificationRead: (id) => {
    const snapshot = {
      ...get().snapshot,
      notifications: get().snapshot.notifications.map((item) => item.id === id ? { ...item, read: true } : item),
    };
    set({ snapshot });
    void persistSnapshot(snapshot);
  },

  markAnnouncementRead: (id) => {
    const snapshot = {
      ...get().snapshot,
      announcements: get().snapshot.announcements.map((item) => item.id === id ? { ...item, read: true } : item),
    };
    set({ snapshot });
    void persistSnapshot(snapshot);
  },

  markConversationRead: (id) => {
    const snapshot = {
      ...get().snapshot,
      conversations: get().snapshot.conversations.map((item) => item.id === id ? { ...item, read: true } : item),
    };
    set({ snapshot });
    void persistSnapshot(snapshot);
  },

  markDashboardItemRead: (id) => {
    const snapshot = {
      ...get().snapshot,
      dashboardItems: get().snapshot.dashboardItems.map((item) => item.id === id ? { ...item, newActivity: false } : item),
    };
    set({ snapshot });
    void persistSnapshot(snapshot);
  },
}));
