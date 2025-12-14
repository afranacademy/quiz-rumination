import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useAnonAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[anon auth] Error getting session:", {
            message: sessionError.message,
            code: sessionError.status,
            details: sessionError,
          });
          if (mounted) {
            setError(`Failed to get session: ${sessionError.message}`);
            setLoading(false);
          }
          return;
        }

        // If session exists, use it
        if (session?.user) {
          console.log("[anon auth] Existing session found:", session.user.id);
          if (mounted) {
            setUserId(session.user.id);
            setLoading(false);
          }
          return;
        }

        // No session, sign in anonymously
        console.log("[anon auth] No session found, signing in anonymously...");
        const { data: authData, error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          console.error("[anon auth] Error signing in anonymously:", {
            message: signInError.message,
            code: signInError.status,
            status: signInError.status,
            details: signInError,
          });
          
          // Check if anonymous auth is disabled
          if (signInError.status === 400 || signInError.message?.toLowerCase().includes("anonymous")) {
            const errorMsg = "Anonymous sign-in is disabled in Supabase Auth settings. Please enable it in Supabase Dashboard: Auth -> Providers -> Anonymous -> Enabled";
            console.error("[anon auth]", errorMsg);
            if (mounted) {
              setError(errorMsg);
              setLoading(false);
            }
            return;
          }

          if (mounted) {
            setError(`Failed to sign in anonymously: ${signInError.message} (code: ${signInError.status})`);
            setLoading(false);
          }
          return;
        }

        if (authData?.user) {
          console.log("[anon auth] Signed in anonymously:", authData.user.id);
          if (mounted) {
            setUserId(authData.user.id);
            setLoading(false);
          }
        } else {
          const errorMsg = "No user returned from anonymous sign-in";
          console.error("[anon auth]", errorMsg, { authData });
          if (mounted) {
            setError(errorMsg);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("[anon auth] Unexpected error:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[anon auth] Auth state changed:", event, session?.user?.id);
      if (mounted) {
        if (session?.user) {
          setUserId(session.user.id);
        } else {
          setUserId(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { userId, loading, error };
}

