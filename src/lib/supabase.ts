import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const cleanSupabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseConfigured = Boolean(cleanSupabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));

// Public client for browser operations
export const supabase = isSupabaseConfigured
  ? createClient(cleanSupabaseUrl, supabaseAnonKey || supabaseServiceRoleKey, {
      auth: { persistSession: true },
    })
  : null;

// Admin client for server-side mutations (guarantees persistence without RLS friction)
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(cleanSupabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
