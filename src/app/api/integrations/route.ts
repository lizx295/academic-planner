import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import { decryptJson } from "@/server/crypto";
import { getIntegration, type Provider } from "@/server/integrations";
import { guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const providers: Provider[] = ["aulavirtual"];
    const out: Record<string, unknown> = {};

    for (const provider of providers) {
      const row = await getIntegration(user.id, provider);
      if (!row) {
        out[provider] = { status: "disconnected" };
        continue;
      }
      let summary: Record<string, unknown> = {};
      if (row.config_enc) {
        try {
          const config = decryptJson<Record<string, unknown>>(row.config_enc);
          summary = {
            username: config.username ?? "",
            siteName: config.siteName ?? "Aula Virtual ESPOL",
          };
        } catch {
          summary = { error: "No se pudo descifrar la configuración." };
        }
      }
      out[provider] = {
        status: row.status,
        lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null,
        lastError: row.last_error,
        ...summary,
      };
    }

    return Response.json({ integrations: out });
  });
}
