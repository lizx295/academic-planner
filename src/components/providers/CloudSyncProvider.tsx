"use client";

import { useEffect } from "react";
import { create } from "zustand";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureSeedData, getPersistedPlannerState, useAppStore } from "@/store/app";

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

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureSeedData();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      useCloudSync.getState().setState({
        status: "disabled",
        message: "Supabase no está configurado; se usa almacenamiento local.",
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
      let user = sessionResult.data.session?.user;
      if (!user) {
        const anonymous = await client.auth.signInAnonymously();
        if (anonymous.error) throw anonymous.error;
        user = anonymous.data.user ?? undefined;
      }
      if (!user) throw new Error("Supabase no devolvió un usuario anónimo.");

      const remote = await client
        .from("planner_states")
        .select("state, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (remote.error) throw remote.error;
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

      useCloudSync.getState().setState({
        status: "synced",
        lastSyncedAt: remote.data?.updated_at ?? new Date().toISOString(),
        message: null,
      });

      unsubscribe = useAppStore.subscribe(() => {
        if (applyingRemote || !active) return;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const saved = await client.from("planner_states").upsert({
            user_id: user!.id,
            state: getPersistedPlannerState(),
          });
          if (!active) return;
          useCloudSync.getState().setState(
            saved.error
              ? { status: "error", message: saved.error.message }
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
  }, []);

  return children;
}
