import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import {
  assertSnapshotShape,
  readSnapshot,
  readSnapshotMeta,
  upsertSnapshot,
  writeSnapshot,
} from "@/server/snapshot";
import { ApiError, guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const url = new URL(req.url);

    // Sondeo ligero: los clientes preguntan la versión y solo descargan el
    // documento completo cuando realmente cambió.
    if (url.searchParams.get("meta") === "1") {
      const meta = await readSnapshotMeta(user.id);
      return Response.json(meta, { headers: { "cache-control": "no-store" } });
    }

    const snapshot = await readSnapshot(user.id);
    if (!snapshot) {
      return Response.json({ data: null, version: 0, updatedAt: null });
    }
    return Response.json(snapshot, {
      headers: { "cache-control": "no-store" },
    });
  });
}

export async function PUT(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      data?: unknown;
      baseVersion?: number;
    };
    const data = assertSnapshotShape(body.data);
    const baseVersion = Number(body.baseVersion ?? 0);
    if (!Number.isFinite(baseVersion) || baseVersion < 0) {
      throw new ApiError(400, "baseVersion inválida.");
    }

    const saved =
      baseVersion <= 0
        ? await upsertSnapshot(user.id, data, baseVersion)
        : await writeSnapshot(user.id, data, baseVersion);

    if (!saved) {
      const current = await readSnapshot(user.id);
      return Response.json(
        {
          error: "conflict",
          message: "Otro dispositivo guardó cambios primero.",
          snapshot: current,
        },
        { status: 409 },
      );
    }

    return Response.json(saved, { headers: { "cache-control": "no-store" } });
  });
}
