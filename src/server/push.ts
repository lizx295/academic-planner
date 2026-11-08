import {
  generateVAPIDKeys,
  sendNotification,
  setVapidDetails,
  type PushSubscription,
} from "web-push";

import { getSql } from "@/server/db";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const globalForPush = globalThis as unknown as {
  __apVapid?: VapidKeys;
  __apVapidConfigured?: boolean;
};

function vapid(): VapidKeys {
  if (globalForPush.__apVapid) return globalForPush.__apVapid;

  let publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  let privateKey = process.env.VAPID_PRIVATE_KEY ?? "";

  if (!publicKey || !privateKey) {
    // Claves efímeras para desarrollo: las suscripciones caducan al reiniciar.
    const generated = generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    console.warn(
      "[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas; usando claves efímeras de desarrollo.",
    );
  }

  globalForPush.__apVapid = { publicKey, privateKey };
  return globalForPush.__apVapid;
}

export function getVapidPublicKey(): string {
  return vapid().publicKey;
}

export function configureWebPush(): void {
  if (globalForPush.__apVapidConfigured) return;
  const { publicKey, privateKey } = vapid();
  const subject = process.env.VAPID_SUBJECT ?? "mailto:soporte@espol.edu.ec";
  setVapidDetails(subject, publicKey, privateKey);
  globalForPush.__apVapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  try {
    configureWebPush();
  } catch (error) {
    console.error("[push] no se pudo configurar", error);
    return 0;
  }

  const sql = getSql();
  const subs = await sql<
    { id: string; endpoint: string; p256dh: string; auth: string }[]
  >`select id, endpoint, p256dh, auth from push_subscriptions where user_id = ${userId}`;

  let sent = 0;
  await Promise.all(
    subs.map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        await sendNotification(subscription, JSON.stringify(payload));
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await sql`delete from push_subscriptions where id = ${row.id}`;
        } else {
          console.error("[push] envío falló", status, (error as Error).message);
        }
      }
    }),
  );
  return sent;
}

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into push_subscriptions (user_id, endpoint, p256dh, auth)
    values (${userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
    on conflict (endpoint) do update
      set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
  `;
}
