import type { NextConfig } from "next";

// Vercel sets process.env.VERCEL="1", where standalone output is not used.
// Docker, Render, and self-hosted environments use output: "standalone".
const isVercel = process.env.VERCEL === "1" || process.env.NEXT_DEPLOYMENT_TARGET === "vercel";

const nextConfig: NextConfig = {
  ...(!isVercel ? { output: "standalone" } : {}),
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
