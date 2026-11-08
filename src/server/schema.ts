/**
 * Esquema relacional mínimo para la capa multiusuario.
 *
 * El planificador académico (materias, horarios, tareas…) sigue viviendo en un
 * documento JSON por usuario (`snapshots.data`). Así reutilizamos sin fricción
 * el modelo que ya existe en el cliente y la sincronización es atómica.
 *
 * Todo lo que sí necesita consultas relacionales (usuarios, sesiones,
 * dispositivos, credenciales de integraciones, suscripciones push) tiene su
 * propia tabla.
 */
export const SCHEMA_SQL = /* sql */ `
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  role text not null default 'student' check (role in ('admin', 'student')),
  password_hash text,
  -- Copia cifrada (AES-256-GCM) de la contraseña temporal. Se borra en el
  -- momento en que la persona define su propia contraseña.
  temp_password_enc text,
  must_change_password boolean not null default true,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  device_name text not null default 'Dispositivo',
  user_agent text not null default '',
  ip text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists snapshots (
  user_id uuid primary key references users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists pair_codes (
  code text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null default 'Atajos',
  token_hash text not null unique,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists integrations (
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('notion', 'aulavirtual')),
  config_enc text,
  status text not null default 'disconnected',
  last_sync_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_user_idx on push_subscriptions(user_id);

create table if not exists reminder_log (
  user_id uuid not null references users(id) on delete cascade,
  reminder_key text not null,
  sent_on date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, reminder_key, sent_on)
);

create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  target text not null default '',
  created_at timestamptz not null default now()
);
`;
