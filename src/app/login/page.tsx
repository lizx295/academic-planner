"use client";

import { ArrowRight, Cloud, KeyRound, Laptop, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useAppStore } from "@/store/app";

type Mode = "login" | "register" | "magic" | "local";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const updateProfile = useAppStore((state) => state.updateProfile);
  const [mode, setMode] = useState<Mode>(auth.supabaseEnabled ? "login" : "local");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === "authenticated" || auth.status === "local") router.replace("/");
  }, [auth.status, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!email.trim() || !email.includes("@")) throw new Error("Escribe un correo válido.");
      if (mode === "local") {
        if (!name.trim()) throw new Error("Escribe tu nombre.");
        auth.continueLocally({ name, email });
        updateProfile({ name: name.trim() });
        router.replace("/");
        return;
      }
      if (mode === "magic") {
        await auth.sendMagicLink(email);
        setMessage("Te enviamos un enlace de acceso. Revisa también la carpeta de spam.");
        return;
      }
      if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
      if (mode === "register") {
        if (!name.trim()) throw new Error("Escribe tu nombre.");
        const result = await auth.signUpWithPassword(name, email, password);
        updateProfile({ name: name.trim() });
        if (result.confirmationRequired) {
          setMessage("Cuenta creada. Confirma tu correo para iniciar sesión.");
          setMode("login");
        }
      } else {
        await auth.signInWithPassword(email, password);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "register" ? "Crea tu cuenta" : mode === "magic" ? "Acceso sin contraseña" : mode === "local" ? "Ambiente local" : "Bienvenido de nuevo";
  const description = mode === "local"
    ? "Tus datos permanecen en este navegador. Podrás vincularlos a Supabase después."
    : "Accede al mismo espacio académico desde la web y la aplicación móvil.";

  return (
    <main className="grid min-h-dvh bg-bg lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <section className="hidden border-r border-border bg-surface px-12 py-10 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-accent"><Logo size={30} /></span>
          <span className="text-base font-semibold tracking-tight text-text">Academic Planner</span>
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-medium text-accent">Tu actividad académica, en un solo lugar</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.06] tracking-[-0.045em] text-text">
            Menos paneles.<br />Más claridad para estudiar.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-text-muted">
            Consulta materias, entregas, notas y avisos de Canvas con una agenda diseñada para leer y decidir rápido.
          </p>
          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            {[
              [Cloud, "Sincronización", "Web y móvil"],
              [ShieldCheck, "Privacidad", "Token cifrado"],
              [Mail, "Avisos", "Sin ruido"],
            ].map(([Icon, label, copy]) => (
              <div key={String(label)} className="border-t border-border pt-3">
                <Icon size={18} className="text-accent" />
                <p className="mt-3 text-sm font-semibold text-text">{String(label)}</p>
                <p className="mt-1 text-xs text-text-faint">{String(copy)}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-text-faint">Diseñado para estudiantes · Datos de Canvas en modo lectura</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-9 flex items-center gap-2 lg:hidden">
            <span className="text-accent"><Logo size={26} /></span>
            <span className="font-semibold text-text">Academic Planner</span>
          </div>

          <div className="mb-7">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              {mode === "local" ? <Laptop size={19} /> : <KeyRound size={19} />}
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-text">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {(mode === "register" || mode === "local") ? (
              <label className="block space-y-1.5">
                <span className="text-[13px] font-medium text-text-muted">Nombre</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Tu nombre" className="h-11" />
              </label>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-text-muted">Correo</span>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="estudiante@correo.com" className="h-11" />
            </label>
            {(mode === "login" || mode === "register") ? (
              <label className="block space-y-1.5">
                <span className="text-[13px] font-medium text-text-muted">Contraseña</span>
                <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="Mínimo 8 caracteres" className="h-11" />
              </label>
            ) : null}

            {error ? <p role="alert" className="rounded-xl border border-absent/30 bg-absent-soft/30 px-3 py-2.5 text-sm text-absent">{error}</p> : null}
            {message ? <p role="status" className="rounded-xl border border-present/30 bg-present-soft/30 px-3 py-2.5 text-sm text-present">{message}</p> : null}

            <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
              {mode === "register" ? "Crear cuenta" : mode === "magic" ? "Enviar enlace" : mode === "local" ? "Continuar localmente" : "Iniciar sesión"}
              <ArrowRight size={16} />
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {auth.supabaseEnabled ? (
              <>
                <button type="button" className="font-medium text-accent hover:underline" onClick={() => setMode(mode === "register" ? "login" : "register")}>
                  {mode === "register" ? "Ya tengo cuenta" : "Crear cuenta"}
                </button>
                <button type="button" className="text-text-muted hover:text-text" onClick={() => setMode("magic")}>Usar enlace mágico</button>
              </>
            ) : null}
            {mode !== "local" ? <button type="button" className="text-text-muted hover:text-text" onClick={() => setMode("local")}>Continuar sin nube</button> : null}
            {mode === "local" && auth.supabaseEnabled ? <button type="button" className="text-text-muted hover:text-text" onClick={() => setMode("login")}>Volver al acceso con nube</button> : null}
          </div>

          {!auth.supabaseEnabled ? (
            <p className="mt-7 border-l-2 border-accent pl-3 text-xs leading-5 text-text-faint">
              Supabase no está configurado. Este entorno usará almacenamiento local y la API de Canvas disponible en este servidor.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
