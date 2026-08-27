import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const startTime = Date.now();

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let dbStatus = "unconfigured";
  let dbLatencyMs = 0;

  if (supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      const t0 = Date.now();
      const { data, error } = await sb.from("organizations").select("id").limit(1);
      dbLatencyMs = Date.now() - t0;

      if (error) {
        dbStatus = `error: ${error.message}`;
      } else {
        dbStatus = "connected";
      }
    } catch (err: any) {
      dbStatus = `exception: ${err.message || String(err)}`;
    }
  }

  const isHealthy = dbStatus === "connected" || dbStatus === "unconfigured";

  const payload = {
    status: isHealthy ? "healthy" : "degraded",
    service: "sanad-erp",
    environment: process.env.NODE_ENV || "production",
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    database: {
      provider: "supabase-postgresql",
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    version: "0.1.0",
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
