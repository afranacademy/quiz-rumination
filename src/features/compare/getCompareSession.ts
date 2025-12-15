import { supabase } from "@/lib/supabaseClient";

export type CompareSession = {
  id: string;
  attemptAId: string;
  attemptBId: string | null;
  status: "pending" | "completed";
  createdAt: string;
  expiresAt: string | null;
  inviterFirstName: string | null;
  inviterLastName: string | null;
};

/**
 * Validates and fetches a compare session by invite token using RPC.
 * Fetches the row first, then checks expiry in code to distinguish "no row" from "expired".
 * 
 * @returns CompareSession if valid and not expired, null if not found or expired
 */
export async function getCompareSession(token: string): Promise<CompareSession | null> {
  if (import.meta.env.DEV) {
    console.log("[getCompareSession] Fetching session via RPC, token:", token.substring(0, 12) + "...");
  }

  // Use RPC to fetch session (doesn't filter by expiry)
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_compare_session_by_token", {
    p_token: token,
  });

  if (rpcError) {
    if (import.meta.env.DEV) {
      console.error("[getCompareSession] RPC Error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        status: rpcError.status || "N/A",
      });
      console.error("[getCompareSession] Full error object:", rpcError);
    }
    throw new Error(`Failed to fetch compare session: ${rpcError.message}`);
  }

  // RPC returns array (table function)
  if (!rpcData || rpcData.length === 0) {
    if (import.meta.env.DEV) {
      console.log("[getCompareSession] No row found for token (query path: RPC)", {
        token: token.substring(0, 12) + "...",
        data: rpcData,
        error: null,
        status: "no_rows",
      });
    }
    return null; // Row doesn't exist
  }

  const row = rpcData[0];

  // Check expiry in code (not in query)
  const now = new Date();
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const isExpired = expiresAt !== null && expiresAt <= now;

  if (isExpired) {
    if (import.meta.env.DEV) {
      console.log("[getCompareSession] Session found but expired:", {
        id: row.id,
        expires_at: row.expires_at,
        now: now.toISOString(),
        query_path: "RPC",
        data: row,
        error: null,
        status: "expired",
      });
    }
    return null; // Row exists but expired
  }

  if (import.meta.env.DEV) {
    console.log("[getCompareSession] ✅ Session found and valid:", {
      id: row.id,
      status: row.status,
      attempt_a_id: row.attempt_a_id?.substring(0, 8) + "...",
      attempt_b_id: row.attempt_b_id?.substring(0, 8) + "..." || "null",
      expires_at: row.expires_at,
      inviter_first_name: row.inviter_first_name,
      inviter_last_name: row.inviter_last_name,
      query_path: "RPC",
      data: row,
      error: null,
      status: "valid",
    });
  }

  return {
    id: row.id,
    attemptAId: row.attempt_a_id,
    attemptBId: row.attempt_b_id,
    status: row.status as "pending" | "completed",
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    inviterFirstName: row.inviter_first_name || null,
    inviterLastName: row.inviter_last_name || null,
  };
}
