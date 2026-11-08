import { ensureReady } from "@/server/bootstrap";
import { getSql } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await ensureReady();
    const sql = getSql();
    await sql`select 1 as ok`;
    return Response.json({ ok: true, service: "academic-planner", time: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "sin conexión" },
      { status: 503 },
    );
  }
}
