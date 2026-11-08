import { destroyCurrentSession } from "@/server/auth";
import { guard } from "@/server/validate";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  return guard(async () => {
    await destroyCurrentSession();
    return Response.json({ ok: true });
  });
}
