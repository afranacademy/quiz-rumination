import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables at runtime
if (!supabaseUrl) {
  const error = new Error(
    "VITE_SUPABASE_URL is not set. Please configure it in your .env file."
  );
  console.error("[supabaseClient] Missing VITE_SUPABASE_URL", error);
  throw error;
}

if (!supabaseAnonKey) {
  const error = new Error(
    "VITE_SUPABASE_ANON_KEY is not set. Please configure it in your .env file."
  );
  console.error("[supabaseClient] Missing VITE_SUPABASE_ANON_KEY", error);
  throw error;
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

console.log("[supabaseClient] Initialized with URL:", supabaseUrl);
