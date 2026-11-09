import { createJSONStorage, type StateStorage } from "zustand/middleware";

/**
 * Almacenamiento con escritura diferida.
 *
 * El planificador guarda un documento JSON relativamente grande. Escribirlo en
 * `localStorage` de forma sincrónica en cada acción bloquea el hilo principal
 * y se nota al escribir, marcar tareas o cambiar de vista. Aquí agrupamos las
 * escrituras en una sola pasada cada 250 ms y vaciamos lo pendiente al cerrar
 * la pestaña o pasarla a segundo plano.
 */
const FLUSH_MS = 250;
const pending = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function flush(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (typeof window === "undefined" || pending.size === 0) return;
  for (const [name, value] of pending) {
    try {
      window.localStorage.setItem(name, value);
    } catch (error) {
      console.warn("[store] no se pudo guardar en localStorage", error);
    }
  }
  pending.clear();
}

function schedule(): void {
  if (typeof window === "undefined" || timer) return;
  timer = setTimeout(flush, FLUSH_MS);
}

function ensureFlushListeners(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

const deferredStorage: StateStorage = {
  getItem: (name) => {
    const queued = pending.get(name);
    if (queued !== undefined) return queued;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    ensureFlushListeners();
    pending.set(name, value);
    schedule();
  },
  removeItem: (name) => {
    pending.delete(name);
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

export const persistStorage = createJSONStorage(() => deferredStorage);
