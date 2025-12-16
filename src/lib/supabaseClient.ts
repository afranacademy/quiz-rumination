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

// #region agent log
fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabaseClient.ts:24',message:'Supabase client initialized',data:{supabaseUrl,hasAnonKey:!!supabaseAnonKey,anonKeyLength:supabaseAnonKey?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion

console.log("[supabaseClient] Initialized with URL:", supabaseUrl);
