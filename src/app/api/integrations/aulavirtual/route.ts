import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import { decryptJson, encryptJson } from "@/server/crypto";
import { disconnectIntegration, getIntegration, setIntegration } from "@/server/integrations";
import { MoodleError, moodleFetchAll, moodleLogin } from "@/server/moodle";
import { applyMoodleSync } from "@/server/moodleSync";
import { mutateSnapshot } from "@/server/snapshot";
import { sendPushToUser } from "@/server/push";
import { ApiError, assertString, guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MoodleConfig {
  username: string;
  password: string;
  siteName: string;
  moodleUserId: number;
}

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      action?: "connect" | "test" | "sync";
      username?: string;
      password?: string;
    };

    if (body.action === "connect") {
      const username = assertString(body.username, "usuario", 120);
      const password = assertString(body.password, "contraseña", 200);
      try {
        const session = await moodleLogin(username, password);
        const config: MoodleConfig = {
          username,
          password,
          siteName: session.siteName,
          moodleUserId: session.userId,
        };
        await setIntegration(user.id, "aulavirtual", {
          configEnc: encryptJson(config),
          status: "connected",
          lastError: null,
        });
        return Response.json({
          ok: true,
          siteName: session.siteName,
          username: session.username,
        });
      } catch (error) {
        await setIntegration(user.id, "aulavirtual", {
          status: "error",
          lastError: (error as Error).message,
        });
        throw new ApiError(502, (error as MoodleError).message);
      }
    }

    if (body.action === "test") {
      const row = await getIntegration(user.id, "aulavirtual");
      if (!row?.config_enc) throw new ApiError(400, "Primero conecta tu Aula Virtual.");
      const config = decryptJson<MoodleConfig>(row.config_enc);
      const session = await moodleLogin(config.username, config.password);
      return Response.json({ ok: true, siteName: session.siteName });
    }

    if (body.action === "sync") {
      const row = await getIntegration(user.id, "aulavirtual");
      if (!row?.config_enc) throw new ApiError(400, "Primero conecta tu Aula Virtual.");
      const config = decryptJson<MoodleConfig>(row.config_enc);

      try {
        const session = await moodleLogin(config.username, config.password);
        const result = await moodleFetchAll(session.token, session.userId);
        const counts = await mutateSnapshot(user.id, (data) => {
          const applied = applyMoodleSync(data, result);
          return { data: applied.data, result: applied.counts };
        });

        await setIntegration(user.id, "aulavirtual", {
          status: "connected",
          lastSyncAt: new Date(),
          lastError: null,
        });

        if (counts.announcementsCreated > 0) {
          await sendPushToUser(user.id, {
            title: `📣 ${counts.announcementsCreated} anuncio(s) del Aula Virtual`,
            body: `También se importaron ${counts.tasksCreated} tarea(s) y ${counts.assessmentsCreated} evaluación(es).`,
            url: "/notes",
            tag: "moodle-sync",
          }).catch(() => undefined);
        }

        return Response.json({ ok: true, siteName: result.siteName, ...counts });
      } catch (error) {
        await setIntegration(user.id, "aulavirtual", {
          status: "error",
          lastError: (error as Error).message,
        });
        throw new ApiError(502, (error as MoodleError).message);
      }
    }

    throw new ApiError(400, "Acción no reconocida.");
  });
}

export async function DELETE(): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    await disconnectIntegration(user.id, "aulavirtual");
    return Response.json({ ok: true });
  });
}
