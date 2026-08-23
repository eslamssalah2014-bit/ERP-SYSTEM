import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(cleanUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(cleanUrl, supabaseAnonKey)
  : null;
