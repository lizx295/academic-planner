"use client";

import { useEffect, useState } from "react";

import { useAppStore } from "@/store/app";
import type { ThemePreference } from "@/types";

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

export function applyThemeClass(pref: ThemePreference): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveTheme(pref) === "dark");
}

/** Sincroniza la clase `.dark` del <html> con la preferencia guardada. */
export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    const apply = () => applyThemeClass(useAppStore.getState().theme);
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  return { theme, setTheme };
}

/** Reloj vivo para countdowns. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** `true` solo después del montaje en el cliente (para texto ·reloj·). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}