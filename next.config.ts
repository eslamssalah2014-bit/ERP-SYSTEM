import type { NextConfig } from "next";

const isStandalone = process.env.OUTPUT_STANDALONE === "true" || process.env.RENDER === "true";

const nextConfig: NextConfig = {
  ...(isStandalone ? { output: "standalone" } : {}),
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
