import { NextResponse } from "next/server";
import { pingSupabaseAuth } from "@/lib/supabase/server";

/**
 * Checks env vars and calls Supabase Auth `GET /auth/v1/health` (real network call).
 * With dev server: curl -s http://localhost:3000/api/supabase/health
 */
export async function GET() {
  const ping = await pingSupabaseAuth();

  if (!ping.ok) {
    const status = ping.step === "env" ? 503 : 502;
    return NextResponse.json(ping, { status });
  }

  return NextResponse.json({
    ok: true,
    message: "Connected: Supabase Auth responded to GET /auth/v1/health.",
    authHealth: ping.authHealth,
  });
}
