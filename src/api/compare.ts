import { supabase } from "@/lib/supabaseClient";

export type CompareSession = {
  id: string;
  attemptAId: string;
  attemptBId: string | null;
  status: "pending" | "completed";
  createdAt: string;
  expiresAt: string | null;
};

/**
 * Creates a compare invite session for attempt A.
 * Returns the invite token.
 * @deprecated Use createCompareInvite from @/features/compare/createCompareInvite instead
 */
export async function createInvite(attemptAId: string): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const { data, error } = await supabase.rpc("create_compare_invite", {
    p_attempt_a_id: attemptAId,
    p_expires_in_minutes: 60,
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[createInvite] RPC Error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  if (!data || !data.invite_token) {
    throw new Error("Invalid response from create_compare_invite RPC");
  }

  return data.invite_token;
}

/**
 * Fetches a compare session by invite token.
 */
export async function fetchSessionByToken(token: string): Promise<CompareSession | null> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const { data, error } = await supabase.rpc("get_compare_session_by_token", {
    token_param: token,
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[fetchSessionByToken] RPC Error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    id: row.id,
    attemptAId: row.attempt_a_id,
    attemptBId: row.attempt_b_id,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Completes a compare session by linking attempt B.
 */
export async function completeSession(token: string, attemptBId: string): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const { data, error } = await supabase.rpc("complete_compare_session", {
    p_invite_token: token,
    p_attempt_b_id: attemptBId,
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[completeSession] RPC Error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    throw new Error(`Failed to complete session: ${error.message}`);
  }

  return data as string;
}

