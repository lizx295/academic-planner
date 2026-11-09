"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input, FieldShell } from "@/components/ui/Field";
import { useTheme } from "@/hooks/useTheme";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "student";
  mustChangePassword: boolean;
}

function EyeButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Ocultar contraseña" : "Mostrar contraseña"}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-text-faint hover:bg-surface-subtle hover:text-text"
    >
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <EyeButton shown={shown} onToggle={() => setShown((v) => !v)} />
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (user: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        user?: SessionUser;
        error?: string;
      };
      if (!res.ok || !json.user) {
        setError(json.error ?? "No pudimos iniciar sesión. Inténtalo de nuevo.");
        return;
      }
      onSuccess(json.user);
    } catch {
      setError("No hay conexión con el servidor. Revisa tu red e inténtalo otra vez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FieldShell label="Correo institucional" htmlFor="email">
        <div className="relative">
          <Mail
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <Input
            id="email"
            type="email"
            required
            autoComplete="username"
            placeholder="nombre.apellido@espol.edu.ec"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
          />
        </div>
      </FieldShell>

      <FieldShell label="Contraseña" htmlFor="password">
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          placeholder="Tu contraseña temporal o personal"
          autoComplete="current-password"
          required
        />
      </FieldShell>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={loading} className="w-full justify-center">
        Entrar a mi planificador
        <ArrowRight size={16} aria-hidden="true" />
      </Button>

      <div className="rounded-xl border border-border bg-surface-subtle/60 px-3 py-2.5 text-[12px] leading-relaxed text-text-muted">
        <p className="font-semibold text-text">Cuenta de prueba</p>
        <p>
          <span className="font-mono">demo@espol.edu.ec</span> ·{" "}
          <span className="font-mono">Demo-2026</span>
        </p>
        <p className="mt-1 text-text-faint">
          Al entrar, la app te pedirá crear tu contraseña personal (como en una cuenta real).
        </p>
      </div>
    </form>
  );
}

function ChangePasswordForm({
  user,
  onDone,
}: {
  user: SessionUser;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Usa al menos 8 caracteres.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Incluye letras y números.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      onDone();
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-accent-2-soft/70 px-3 py-3 text-[13px] leading-relaxed text-text-muted">
        <p className="flex items-center gap-1.5 font-semibold text-text">
          <ShieldCheck size={15} aria-hidden="true" className="text-accent-2" />
          Protege tu cuenta
        </p>
        <p className="mt-1">
          Entraste con una contraseña temporal. Crea una contraseña personal; desde ese momento
          el administrador ya no podrá verla.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <FieldShell label="Nueva contraseña" htmlFor="new-password" helper="Mínimo 8 caracteres, con letras y números.">
          <PasswordInput
            id="new-password"
            value={password}
            onChange={setPassword}
            placeholder="Crea tu contraseña"
            autoComplete="new-password"
            required
          />
        </FieldShell>
        <FieldShell label="Confirma la contraseña" htmlFor="confirm-password">
          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            required
          />
        </FieldShell>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={loading} className="w-full justify-center">
          Guardar y continuar
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
        <p className="text-center text-[12px] text-text-faint">
          Sesión de <span className="font-medium text-text-muted">{user.email}</span>
        </p>
      </form>
    </div>
  );
}

function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { theme } = useTheme();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  const next = params.get("next") || "/";
  const forcingChange = params.get("change") === "1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { user?: SessionUser };
        if (!cancelled && json.user) setUser(json.user);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    router.replace(next.startsWith("/") ? next : "/");
  }, [user, next, router]);

  const handleLogin = useCallback(
    (logged: SessionUser) => {
      if (logged.mustChangePassword) {
        setUser(logged);
        return;
      }
      router.replace(next.startsWith("/") ? next : "/");
    },
    [next, router],
  );

  const handleChanged = useCallback(() => {
    router.replace(next.startsWith("/") ? next : "/");
    router.refresh();
  }, [next, router]);

  const showChange = Boolean(user?.mustChangePassword) || (forcingChange && Boolean(user));

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-[-10%] h-80 w-80 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-[-8%] h-96 w-96 rounded-full bg-accent-2/25 blur-3xl"
      />

      <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] glass-strong shadow-2xl shadow-black/10 lg:grid lg:grid-cols-[1.05fr_1fr]">
        {/* Panel de marca */}
        <div className="relative hidden flex-col justify-between gap-10 p-10 lg:flex brand-soft">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-accent">
                <Logo size={32} />
              </span>
              <p className="text-[17px] font-semibold tracking-tight text-text">Academic Planner</p>
            </div>
            <h1 className="mt-10 text-[30px] font-semibold leading-tight tracking-tight text-text">
              Tu semestre,
              <br />
              en un solo lugar.
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
              Materias, horarios, faltas, tareas, notas y tu Aula Virtual de ESPOL,
              sincronizados entre tu laptop y tu teléfono.
            </p>
          </div>

          <ul className="space-y-3 text-[13px] text-text-muted">
            <li className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface/70 text-accent">
                <GraduationCap size={15} aria-hidden="true" />
              </span>
              Acceso con correo institucional ESPOL
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface/70 text-accent-2">
                <ShieldCheck size={15} aria-hidden="true" />
              </span>
              Contraseña temporal que solo tú puedes reemplazar
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface/70 text-accent">
                <Sparkles size={15} aria-hidden="true" />
              </span>
              Atajos, notificaciones y sincronización en tiempo real
            </li>
          </ul>
        </div>

        {/* Formulario */}
        <div className="p-7 sm:p-10">
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <span className="text-accent">
              <Logo size={26} />
            </span>
            <p className="text-[15px] font-semibold tracking-tight text-text">Academic Planner</p>
          </div>

          {checking ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-subtle">
                <span className="block h-full w-1/2 animate-pulse rounded-full brand-gradient" />
              </span>
            </div>
          ) : showChange && user ? (
            <>
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Último paso
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">
                  Crea tu contraseña
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                  Hola {user.name || user.email.split("@")[0]}. Elige una contraseña solo tuya.
                </p>
              </div>
              <ChangePasswordForm user={user} onDone={handleChanged} />
            </>
          ) : (
            <>
              <div className="mb-6">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                  <KeyRound size={12} aria-hidden="true" />
                  Acceso institucional
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">
                  Inicia sesión
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                  Usa tu correo <span className="font-medium text-text">@espol.edu.ec</span>. Si
                  eres nuevo, el administrador te dará una contraseña temporal.
                </p>
              </div>
              <LoginForm onSuccess={handleLogin} />
              <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-text-faint">
                <LockKeyhole size={12} aria-hidden="true" />
                Conexión cifrada · datos privados de tu cuenta
              </p>
            </>
          )}
        </div>
      </div>

      <p className="sr-only">
        Tema actual: {theme}. Fin del formulario de acceso.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
