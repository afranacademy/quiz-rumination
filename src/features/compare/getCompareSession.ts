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
 * Uses get_compare_token_by_token (reads from compare_tokens table).
 * Fetches the row first, then checks expiry in code to distinguish "no row" from "expired".
 * 
 * @returns CompareSession if valid and not expired, null if not found or expired
 */
export async function getCompareSession(token: string): Promise<CompareSession | null> {
  // Trim token to prevent whitespace issues
  const trimmedToken = token.trim();
  
  if (import.meta.env.DEV) {
    console.log("[getCompareSession] Fetching token via RPC get_compare_token_by_token, token:", {
      raw: token,
      trimmed: trimmedToken,
      length: trimmedToken.length,
      preview: trimmedToken.substring(0, 12) + "..."
    });
  }

  // Use RPC to fetch token from compare_tokens table (doesn't filter by expiry)
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_compare_token_by_token", {
    p_token: trimmedToken,
  });

  if (rpcError) {
    if (import.meta.env.DEV) {
      console.error("[getCompareSession] RPC Error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        status: rpcError.status || "N/A",
        token: trimmedToken.substring(0, 12) + "...",
      });
      console.error("[getCompareSession] Full error object:", rpcError);
    }
    throw new Error(`Failed to fetch compare session: ${rpcError.message}`);
  }

  // RPC returns array (table function)
  if (!rpcData || (Array.isArray(rpcData) && rpcData.length === 0)) {
    if (import.meta.env.DEV) {
      console.log("[getCompareSession] No row found for token (query path: RPC get_compare_token_by_token)", {
        token: trimmedToken.substring(0, 12) + "...",
        data: rpcData,
        error: null,
        status: "no_rows",
      });
    }
    return null; // Row doesn't exist
  }

  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  // Check expiry using getTime() for accurate comparison
  // Handle parse failures gracefully (don't treat as expired)
  let isExpired = false;
  let expiresAtMs: number | null = null;
  const nowMs = Date.now();
  
  if (row.expires_at) {
    const parsedExpiresAt = Date.parse(row.expires_at);
    if (isNaN(parsedExpiresAt)) {
      // Parse failure - log but don't treat as expired (let caller handle)
      if (import.meta.env.DEV) {
        console.error("[getCompareSession] ❌ Failed to parse expires_at:", {
          token: trimmedToken.substring(0, 12) + "...",
          raw_expires_at: row.expires_at,
          parsedExpiresAt,
          status: row.status,
          RPC_error: null,
        });
      }
      // Don't return null here - let the caller decide how to handle parse failure
    } else {
      expiresAtMs = parsedExpiresAt;
      isExpired = expiresAtMs <= nowMs;
    }
  }

  if (import.meta.env.DEV) {
    console.log("[getCompareSession] 🔍 Token validation:", {
      token: trimmedToken.substring(0, 12) + "...",
      raw_expires_at: row.expires_at,
      parsedExpiresAtMs: expiresAtMs,
      nowMs,
      status: row.status,
      computedExpired: isExpired,
      RPC_error: null,
    });
  }

  if (isExpired) {
    if (import.meta.env.DEV) {
      console.log("[getCompareSession] Token found but expired:", {
        compare_id: row.compare_id,
        token: row.token?.substring(0, 12) + "..." || trimmedToken.substring(0, 12) + "...",
        expires_at: row.expires_at,
        expiresAtMs,
        nowMs,
        now: new Date(nowMs).toISOString(),
        query_path: "RPC get_compare_token_by_token",
        data: row,
        error: null,
        status: "expired",
      });
    }
    return null; // Row exists but expired
  }

  if (import.meta.env.DEV) {
    console.log("[getCompareSession] ✅ Token found and valid:", {
      compare_id: row.compare_id,
      token: row.token?.substring(0, 12) + "..." || trimmedToken.substring(0, 12) + "...",
      status: row.status,
      attempt_a_id: row.attempt_a_id?.substring(0, 8) + "...",
      attempt_b_id: row.attempt_b_id?.substring(0, 8) + "..." || "null",
      expires_at: row.expires_at,
      expiresAtMs,
      nowMs,
      query_path: "RPC get_compare_token_by_token",
      data: row,
      error: null,
      status: "valid",
    });
  }

  // Map compare_tokens row to CompareSession format
  return {
    id: row.compare_id || row.token || trimmedToken, // Use compare_id or token as id
    attemptAId: row.attempt_a_id,
    attemptBId: row.attempt_b_id || null,
    status: row.status === "completed" ? "completed" : "pending",
    createdAt: new Date().toISOString(), // compare_tokens doesn't have created_at, use current time
    expiresAt: row.expires_at,
    inviterFirstName: null, // Will be fetched separately if needed
    inviterLastName: null, // Will be fetched separately if needed
  };
}
