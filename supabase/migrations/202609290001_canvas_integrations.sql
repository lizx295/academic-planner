create table if not exists public.canvas_integrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_ciphertext text not null,
  token_iv text not null,
  token_auth_tag text not null,
  key_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz
);

alter table public.canvas_integrations enable row level security;

-- Sin políticas para anon/authenticated: solo el servidor con service_role
-- puede operar esta tabla. El cliente no puede leer ni el texto cifrado.
revoke all on table public.canvas_integrations from anon, authenticated;

drop trigger if exists canvas_integrations_set_updated_at on public.canvas_integrations;
create trigger canvas_integrations_set_updated_at
before update on public.canvas_integrations
for each row execute function public.set_updated_at();
