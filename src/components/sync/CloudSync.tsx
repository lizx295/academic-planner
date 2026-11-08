"use client";

import { useCallback, useEffect, useRef } from "react";

import { useSession } from "@/components/auth/session";
import { emptyData } from "@/lib/seed";
import { useAppStore } from "@/store/app";
import { useCloudStore } from "@/store/cloud";
import type { AppData } from "@/lib/seed";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DATA_KEYS = [
  "profile",
  "activeSemesterId",
  "semesters",
  "semesterDays",
  "professors",
  "classrooms",
  "courses",
  "schedules",
  "attendance",
  "tasks",
  "assessments",
  "grades",
  "notifications",
  "notionWorkspaces",
  "materials",
  "personalEvents",
  "notes",
] as const;

const POLL_MS = 8000;
const PUSH_DEBOUNCE_MS = 1200;

function dataOf(): Record<string, unknown> {
  const state = useAppStore.getState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of DATA_KEYS) out[key] = state[key];
  return out;
}

function fullData(raw: Record<string, unknown> | null | undefined): AppData {
  const base = emptyData();
  if (!raw) return base;
  const out = { ...base } as unknown as Record<string, unknown>;
  for (const key of DATA_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) out[key] = raw[key];
  }
  return out as unknown as AppData;
}

function metaKey(userId: string): string {
  return `ap-cloud:${userId}`;
}

interface Meta {
  version: number;
  linked: boolean;
}

function readMeta(userId: string): Meta {
  try {
    const raw = localStorage.getItem(metaKey(userId));
    if (!raw) return { version: 0, linked: false };
    const parsed = JSON.parse(raw) as Partial<Meta>;
    return { version: Number(parsed.version ?? 0), linked: Boolean(parsed.linked) };
  } catch {
    return { version: 0, linked: false };
  }
}

function writeMeta(userId: string, meta: Meta): void {
  try {
    localStorage.setItem(metaKey(userId), JSON.stringify(meta));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

export function CloudSync() {
  const { user } = useSession();
  const started = useRef(false);
  const knownVersion = useRef(0);
  const applying = useRef(false);
  const dirty = useRef(false);
  const pushing = useRef(false);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const setCloud = useCloudStore((s) => s.set);

  const applyRemote = useCallback(
    (raw: Record<string, unknown>) => {
      applying.current = true;
      const theme = useAppStore.getState().theme;
      useAppStore.getState().patchData({ ...fullData(raw), theme } as any);
      dirty.current = false;
      queueMicrotask(() => {
        applying.current = false;
      });
    },
    [],
  );

  const push = useCallback(
    async (baseVersion: number): Promise<boolean> => {
      async function attempt(version: number): Promise<boolean> {
        if (pushing.current) {
          pending.current = true;
          return false;
        }
        pushing.current = true;
        setCloud({ status: "syncing", error: null });
        try {
          const res = await fetch("/api/sync", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ data: dataOf(), baseVersion: version }),
          });

          if (res.status === 409) {
            const conflict = (await res.json()) as {
              snapshot?: { data: Record<string, unknown>; version: number };
            };
            if (conflict.snapshot) {
              const { mergeSnapshots } = await import("@/server/snapshot-client");
              const merged = mergeSnapshots(conflict.snapshot.data, dataOf());
              applying.current = true;
              const theme = useAppStore.getState().theme;
              useAppStore.getState().patchData({ ...fullData(merged), theme } as any);
              queueMicrotask(() => {
                applying.current = false;
              });
              knownVersion.current = conflict.snapshot.version;
              pushing.current = false;
              return await attempt(conflict.snapshot.version);
            }
            return false;
          }

          if (!res.ok) {
            const json = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(json.error ?? `HTTP ${res.status}`);
          }

          const saved = (await res.json()) as { version: number };
          knownVersion.current = saved.version;
          dirty.current = false;
          writeMeta(user.id, { version: saved.version, linked: true });
          setCloud({
            status: "synced",
            version: saved.version,
            lastSyncAt: Date.now(),
            error: null,
          });
          channel.current?.postMessage({ type: "saved", version: saved.version });
          return true;
        } catch (error) {
          setCloud({ status: "error", error: (error as Error).message });
          return false;
        } finally {
          pushing.current = false;
          if (pending.current) {
            pending.current = false;
            void attempt(knownVersion.current);
          }
        }
      }

      return attempt(baseVersion);
    },
    [setCloud, user.id],
  );

  const schedule = useCallback(() => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (dirty.current) void push(knownVersion.current);
    }, PUSH_DEBOUNCE_MS);
  }, [push]);

  const pull = useCallback(async () => {
    if (dirty.current || pushing.current) return;
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (!res.ok) return;
      const snap = (await res.json()) as {
        data: Record<string, unknown> | null;
        version: number;
      };
      if (!snap.data) return;
      if (snap.version > knownVersion.current) {
        applyRemote(snap.data);
        knownVersion.current = snap.version;
        writeMeta(user.id, { version: snap.version, linked: true });
        setCloud({ status: "synced", version: snap.version, lastSyncAt: Date.now(), error: null });
      }
    } catch {
      setCloud({ status: "offline" });
    }
  }, [applyRemote, setCloud, user.id]);

  /* ---------- arranque: enlazar o traer datos ---------- */
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    const boot = async () => {
      const meta = readMeta(user.id);
      knownVersion.current = meta.version;

      try {
        const res = await fetch("/api/sync", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const snap = (await res.json()) as {
          data: Record<string, unknown> | null;
          version: number;
        };
        if (cancelled) return;

        if (!snap.data) {
          // Cuenta nueva: conserva datos locales si existen; si no, usa la demo.
          if (!useAppStore.getState().initialized) useAppStore.getState().resetData();
          const ok = await push(0);
          if (!ok) throw new Error("No se pudo crear el documento inicial.");
          writeMeta(user.id, { version: knownVersion.current, linked: true });
        } else if (!meta.linked) {
          // Primer enlace en este navegador: fusiona sin perder nada local.
          if (!useAppStore.getState().initialized) {
            applyRemote(snap.data);
            knownVersion.current = snap.version;
            writeMeta(user.id, { version: snap.version, linked: true });
            setCloud({ status: "synced", version: snap.version, lastSyncAt: Date.now() });
          } else {
            const { mergeSnapshots } = await import("@/server/snapshot-client");
            const merged = mergeSnapshots(snap.data, dataOf());
            applyRemote(merged);
            knownVersion.current = snap.version;
            const ok = await push(snap.version);
            if (!ok) throw new Error("No se pudo fusionar el documento.");
          }
        } else {
          applyRemote(snap.data);
          knownVersion.current = snap.version;
          writeMeta(user.id, { version: snap.version, linked: true });
          setCloud({ status: "synced", version: snap.version, lastSyncAt: Date.now() });
        }
      } catch (error) {
        if (!cancelled) setCloud({ status: "error", error: (error as Error).message });
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [applyRemote, push, setCloud, user.id]);

  /* ---------- cambios locales → subir ---------- */
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (applying.current) return;
      const changed = DATA_KEYS.some(
        (key) =>
          (state as unknown as Record<string, unknown>)[key] !==
          (prev as unknown as Record<string, unknown>)[key],
      );
      if (changed) schedule();
    });
    return unsubscribe;
  }, [schedule]);

  /* ---------- tiempo casi real + pestañas ---------- */
  useEffect(() => {
    try {
      channel.current = new BroadcastChannel("academic-planner-sync");
      channel.current.onmessage = (event: MessageEvent) => {
        if (event.data?.type === "saved") void pull();
      };
    } catch {
      channel.current = null;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void pull();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", () => void pull());
    window.addEventListener("offline", () => setCloud({ status: "offline" }));

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      channel.current?.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pull, setCloud]);

  return null;
}
