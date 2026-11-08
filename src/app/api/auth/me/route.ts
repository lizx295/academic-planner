import { ensureReady } from "@/server/bootstrap";
import { getSession } from "@/server/auth";
import { guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await getSession();
    if (!user) return Response.json({ user: null }, { status: 401 });
    return Response.json({ user });
  });
}
