"use client";

import { create } from "zustand";

export type CloudStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface CloudStore {
  status: CloudStatus;
  version: number;
  lastSyncAt: number | null;
  error: string | null;
  set: (patch: Partial<Omit<CloudStore, "set">>) => void;
}

export const useCloudStore = create<CloudStore>((set) => ({
  status: "idle",
  version: 0,
  lastSyncAt: null,
  error: null,
  set: (patch) => set(patch),
}));
