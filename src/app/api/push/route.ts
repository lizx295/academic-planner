import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import { getVapidPublicKey, saveSubscription } from "@/server/push";
import { getSql } from "@/server/db";
import { ApiError, guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return guard(async () => {
    await requireUser();
    return Response.json({ publicKey: getVapidPublicKey() });
  });
}

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      throw new ApiError(400, "Suscripción push inválida.");
    }
    await saveSubscription(user.id, {
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });
    return Response.json({ ok: true }, { status: 201 });
  });
}

export async function DELETE(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const endpoint = new URL(req.url).searchParams.get("endpoint");
    if (!endpoint) throw new ApiError(400, "Falta el endpoint.");
    const sql = getSql();
    await sql`delete from push_subscriptions where endpoint = ${endpoint} and user_id = ${user.id}`;
    return Response.json({ ok: true });
  });
}
