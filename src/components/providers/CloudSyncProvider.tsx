"use client";

import { useEffect } from "react";
import { create } from "zustand";

import { useAuth } from "@/components/providers/AuthProvider";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureSeedData, getPersistedPlannerState, useAppStore } from "@/store/app";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "@academic-planner/core";

export type CloudSyncStatus = "disabled" | "connecting" | "synced" | "error";

interface CloudSyncStore {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  message: string | null;
  setState: (patch: Partial<Omit<CloudSyncStore, "setState">>) => void;
}

export const useCloudSync = create<CloudSyncStore>((set) => ({
  status: isSupabaseConfigured() ? "connecting" : "disabled",
  lastSyncedAt: null,
  message: null,
  setState: (patch) => set(patch),
}));

function preferenceRow(userId: string) {
  const preferences = useAppStore.getState().notificationPreferences;
  return {
    user_id: userId,
    enabled: preferences.enabled,
    browser_enabled: preferences.browser,
    mobile_enabled: preferences.mobile,
    categories: {
      announcements: preferences.announcements,
      messages: preferences.messages,
      discussions: preferences.discussions,
      contentUpdates: preferences.contentUpdates,
      grades: preferences.grades,
      deadlines: preferences.deadlines,
      classReminders: preferences.classReminders,
    },
    lead_hours: preferences.leadHours,
    quiet_start: preferences.quietStart,
    quiet_end: preferences.quietEnd,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil",
  };
}

function preferencesFromRow(row: Record<string, unknown>): NotificationPreferences {
  const categories = (row.categories ?? {}) as Partial<NotificationPreferences>;
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    enabled: row.enabled !== false,
    browser: row.browser_enabled === true,
    mobile: row.mobile_enabled === true,
    announcements: categories.announcements !== false,
    messages: categories.messages !== false,
    discussions: categories.discussions !== false,
    contentUpdates: categories.contentUpdates !== false,
    grades: categories.grades !== false,
    deadlines: categories.deadlines !== false,
    classReminders: categories.classReminders !== false,
    leadHours: Array.isArray(row.lead_hours) ? row.lead_hours.filter((value): value is number => typeof value === "number") : [24, 2],
    quietStart: typeof row.quiet_start === "string" ? row.quiet_start.slice(0, 5) : "22:00",
    quietEnd: typeof row.quiet_end === "string" ? row.quiet_end.slice(0, 5) : "07:00",
  };
}

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  useEffect(() => {
    ensureSeedData();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || auth.status !== "authenticated" || !auth.user) {
      useCloudSync.getState().setState({
        status: "disabled",
        message: auth.status === "local"
          ? "Sesión local activa; conecta una cuenta para sincronizar entre dispositivos."
          : "Supabase no está configurado; se usa almacenamiento local.",
      });
      return;
    }
    const client = supabase;

    let active = true;
    let unsubscribe: (() => void) | undefined;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let applyingRemote = false;

    async function start() {
      useCloudSync.getState().setState({ status: "connecting", message: null });
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      const user = sessionResult.data.session?.user;
      if (!user) throw new Error("La sesión de Supabase terminó. Inicia sesión nuevamente.");

      const [remote, preferenceResult] = await Promise.all([
        client.from("planner_states").select("state, updated_at").eq("user_id", user.id).maybeSingle(),
        client.from("notification_preferences").select("enabled, browser_enabled, mobile_enabled, categories, lead_hours, quiet_start, quiet_end").eq("user_id", user.id).maybeSingle(),
      ]);
      if (remote.error) throw remote.error;
      if (preferenceResult.error) throw preferenceResult.error;
      if (!active) return;

      if (remote.data?.state && Object.keys(remote.data.state as object).length > 0) {
        applyingRemote = true;
        useAppStore.getState().patchData(remote.data.state as Partial<ReturnType<typeof getPersistedPlannerState>>);
        applyingRemote = false;
      } else {
        const initial = await client.from("planner_states").upsert({
          user_id: user.id,
          state: getPersistedPlannerState(),
        });
        if (initial.error) throw initial.error;
      }
      if (preferenceResult.data) {
        useAppStore.getState().patchData({ notificationPreferences: preferencesFromRow(preferenceResult.data) });
      } else {
        const createdPreferences = await client.from("notification_preferences").upsert(preferenceRow(user.id));
        if (createdPreferences.error) throw createdPreferences.error;
      }

      useCloudSync.getState().setState({
        status: "synced",
        lastSyncedAt: remote.data?.updated_at ?? new Date().toISOString(),
        message: null,
      });

      unsubscribe = useAppStore.subscribe(() => {
        if (applyingRemote || !active) return;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const [saved, savedPreferences] = await Promise.all([
            client.from("planner_states").upsert({ user_id: user!.id, state: getPersistedPlannerState() }),
            client.from("notification_preferences").upsert(preferenceRow(user!.id)),
          ]);
          if (!active) return;
          const saveError = saved.error ?? savedPreferences.error;
          useCloudSync.getState().setState(
            saveError
              ? { status: "error", message: saveError.message }
              : { status: "synced", lastSyncedAt: new Date().toISOString(), message: null },
          );
        }, 800);
      });
    }

    start().catch((error: unknown) => {
      if (!active) return;
      useCloudSync.getState().setState({
        status: "error",
        message: error instanceof Error ? error.message : "No se pudo conectar con Supabase.",
      });
    });

    return () => {
      active = false;
      if (saveTimer) clearTimeout(saveTimer);
      unsubscribe?.();
    };
  }, [auth.status, auth.user]);

  return children;
}
