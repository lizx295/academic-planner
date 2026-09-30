import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "academic-planner-api",
    canvasBaseUrl: process.env.CANVAS_BASE_URL || "https://aulavirtual.espol.edu.ec",
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    timestamp: new Date().toISOString(),
  });
}
