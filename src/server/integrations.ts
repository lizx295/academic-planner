import { getSql } from "@/server/db";

export type Provider = "aulavirtual";

export interface IntegrationRow {
  provider: Provider;
  config_enc: string | null;
  status: string;
  last_sync_at: Date | null;
  last_error: string | null;
}

export async function getIntegration(userId: string, provider: Provider): Promise<IntegrationRow | null> {
  const sql = getSql();
  const rows = await sql<IntegrationRow[]>`
    select provider, config_enc, status, last_sync_at, last_error
    from integrations where user_id = ${userId} and provider = ${provider} limit 1
  `;
  return rows[0] ?? null;
}

export async function setIntegration(
  userId: string,
  provider: Provider,
  patch: {
    configEnc?: string | null;
    status?: string;
    lastSyncAt?: Date | null;
    lastError?: string | null;
  },
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into integrations (user_id, provider, config_enc, status, last_sync_at, last_error, updated_at)
    values (${userId}, ${provider}, ${patch.configEnc ?? null}, ${patch.status ?? "disconnected"},
            ${patch.lastSyncAt ?? null}, ${patch.lastError ?? null}, now())
    on conflict (user_id, provider) do update set
      config_enc = coalesce(excluded.config_enc, integrations.config_enc),
      status = excluded.status,
      last_sync_at = coalesce(excluded.last_sync_at, integrations.last_sync_at),
      last_error = excluded.last_error,
      updated_at = now()
  `;
}

export async function disconnectIntegration(userId: string, provider: Provider): Promise<void> {
  const sql = getSql();
  await sql`delete from integrations where user_id = ${userId} and provider = ${provider}`;
}
