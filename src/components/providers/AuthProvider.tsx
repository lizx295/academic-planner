"use client";

import type { Session, User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LOCAL_SESSION_KEY = "academic-planner-local-session";

export interface LocalSession {
  email: string;
  name: string;
}

type AuthStatus = "loading" | "guest" | "local" | "authenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  localSession: LocalSession | null;
  supabaseEnabled: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (name: string, email: string, password: string) => Promise<{ confirmationRequired: boolean }>;
  sendMagicLink: (email: string) => Promise<void>;
  continueLocally: (session: LocalSession) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readLocalSession(): LocalSession | null {
  try {
    const value = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<LocalSession>;
    if (!parsed.name || !parsed.email) return null;
    return { name: parsed.name, email: parsed.email };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [localSession, setLocalSession] = useState<LocalSession | null>(null);
  const supabaseEnabled = isSupabaseConfigured();

  useEffect(() => {
    const local = readLocalSession();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        setLocalSession(local);
        setStatus(local ? "local" : "guest");
      });
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setLocalSession(local);
        setStatus(local ? "local" : "guest");
        return;
      }
      setUser(data.session?.user ?? null);
      setLocalSession(data.session ? null : local);
      setStatus(data.session ? "authenticated" : local ? "local" : "guest");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (session) {
        window.localStorage.removeItem(LOCAL_SESSION_KEY);
        setLocalSession(null);
        setStatus("authenticated");
      } else {
        const currentLocal = readLocalSession();
        setLocalSession(currentLocal);
        setStatus(currentLocal ? "local" : "guest");
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase no está configurado en este entorno.");
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) throw result.error;
  }, []);

  const signUpWithPassword = useCallback(async (name: string, email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase no está configurado en este entorno.");
    const result = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    if (result.error) throw result.error;
    return { confirmationRequired: !result.data.session };
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase no está configurado en este entorno.");
    const result = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (result.error) throw result.error;
  }, []);

  const continueLocally = useCallback((session: LocalSession) => {
    const normalized = { name: session.name.trim(), email: session.email.trim().toLowerCase() };
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(normalized));
    setLocalSession(normalized);
    setStatus("local");
  }, []);

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    setLocalSession(null);
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setStatus("guest");
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    localSession,
    supabaseEnabled,
    signInWithPassword,
    signUpWithPassword,
    sendMagicLink,
    continueLocally,
    signOut,
  }), [
    status,
    user,
    localSession,
    supabaseEnabled,
    signInWithPassword,
    signUpWithPassword,
    sendMagicLink,
    continueLocally,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return value;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.status === "guest") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [auth.status, pathname, router]);

  if (auth.status === "loading" || auth.status === "guest") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
        <div className="flex items-center gap-3 text-sm text-text-muted" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Preparando tu espacio académico…
        </div>
      </div>
    );
  }

  return children;
}
