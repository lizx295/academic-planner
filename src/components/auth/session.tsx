"use client";

import { createContext, useContext } from "react";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "student";
  mustChangePassword: boolean;
  sessionId: string;
}

interface SessionContextValue {
  user: SessionUser;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = SessionContext.Provider;

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession debe usarse dentro de <AuthGate>.");
  return value;
}
