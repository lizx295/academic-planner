import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface EncryptedToken {
  token_ciphertext: string;
  token_iv: string;
  token_auth_tag: string;
  key_version: number;
}

interface StoredTokenRow extends EncryptedToken {
  user_id: string;
}

let adminClient: SupabaseClient | undefined;

export class CanvasTokenVaultError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function serverConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new CanvasTokenVaultError(
      "El guardado de tokens requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en el servidor.",
      503,
    );
  }
  return { url, secretKey };
}

function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const { url, secretKey } = serverConfig();
  adminClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}

function encryptionKey(): Buffer {
  const encoded = process.env.CANVAS_TOKEN_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new CanvasTokenVaultError("Falta configurar CANVAS_TOKEN_ENCRYPTION_KEY en el servidor.", 503);
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new CanvasTokenVaultError(
      "CANVAS_TOKEN_ENCRYPTION_KEY debe contener exactamente 32 bytes codificados en base64.",
      503,
    );
  }
  return key;
}

function encryptToken(token: string): EncryptedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    token_ciphertext: ciphertext.toString("base64"),
    token_iv: iv.toString("base64"),
    token_auth_tag: cipher.getAuthTag().toString("base64"),
    key_version: 1,
  };
}

function decryptToken(row: EncryptedToken): string {
  if (row.key_version !== 1) throw new Error("La versión de cifrado del token no es compatible.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(row.token_iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(row.token_auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.token_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export async function authenticatedUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return null;
  const { data, error } = await getAdminClient().auth.getUser(accessToken);
  if (error || !data.user) {
    throw new CanvasTokenVaultError("La sesión de Supabase no es válida o expiró.", 401);
  }
  return data.user.id;
}

export async function hasStoredCanvasToken(userId: string): Promise<boolean> {
  const { data, error } = await getAdminClient()
    .from("canvas_integrations")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function loadCanvasToken(userId: string): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from("canvas_integrations")
    .select("user_id, token_ciphertext, token_iv, token_auth_tag, key_version")
    .eq("user_id", userId)
    .maybeSingle<StoredTokenRow>();
  if (error) throw error;
  return data ? decryptToken(data) : null;
}

export async function saveCanvasToken(userId: string, token: string): Promise<void> {
  const { error } = await getAdminClient().from("canvas_integrations").upsert({
    user_id: userId,
    ...encryptToken(token),
    last_synced_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function markCanvasTokenSynced(userId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("canvas_integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteCanvasToken(userId: string): Promise<void> {
  const { error } = await getAdminClient().from("canvas_integrations").delete().eq("user_id", userId);
  if (error) throw error;
}
