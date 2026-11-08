import { requireUser } from "@/server/auth";
import { ApiError, guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROMPT = `Eres un asistente que digitaliza calendarios académicos universitarios.
Analiza la imagen (puede ser un horario de clases, un calendario de evaluaciones o una foto de un syllabus).
Devuelve SOLO un objeto JSON con esta forma:
{
  "courses": [{"code": "string", "name": "string", "professor": "string"}],
  "schedules": [{"course": "string", "weekday": 1, "start": "HH:MM", "end": "HH:MM", "room": "string"}],
  "events": [{"title": "string", "date": "YYYY-MM-DD o null", "start": "HH:MM o null", "end": "HH:MM o null", "course": "string", "kind": "exam|task|project|class|personal", "notes": "string"}]
}
weekday: 0=domingo, 1=lunes … 6=sábado.
Si no puedes leer un dato, usa "" o null. No inventes fechas que no aparezcan.
Responde en español, sin texto adicional fuera del JSON.`;

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await requireUser();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error: "IA de visión no configurada",
          fallback: "ocr",
          hint: "La app usará el OCR local (Tesseract) en tu dispositivo.",
        },
        { status: 501 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { imageDataUrl?: string };
    const dataUrl = String(body.imageDataUrl ?? "");
    if (!dataUrl.startsWith("data:image/")) {
      throw new ApiError(400, "Envía una imagen válida en data URL.");
    }
    if (dataUrl.length > 8_000_000) {
      throw new ApiError(413, "La imagen es demasiado grande (máx. ~5 MB).");
    }

    const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Digitaliza este calendario académico." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(502, `La IA respondió ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ApiError(502, "La IA devolvió un JSON inválido.");
    }
    return Response.json({ source: "ai", ...(parsed as Record<string, unknown>) });
  });
}
