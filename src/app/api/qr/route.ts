import QRCode from "qrcode";

import { requireUser } from "@/server/auth";
import { guard } from "@/server/validate";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  return guard(async () => {
    await requireUser();
    const data = new URL(req.url).searchParams.get("data") ?? "";
    if (!data || data.length > 2048) {
      return Response.json({ error: "Dato inválido para el QR." }, { status: 400 });
    }
    const buffer = await QRCode.toBuffer(data, {
      type: "png",
      width: 512,
      margin: 1,
      color: { dark: "#3c2430", light: "#fff7fa" },
      errorCorrectionLevel: "M",
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
      },
    });
  });
}
