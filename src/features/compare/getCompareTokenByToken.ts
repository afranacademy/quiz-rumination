import { supabase } from "@/lib/supabaseClient";

export type CompareTokenInfo = {
  token: string;
  status: "pending" | "completed" | "superseded";
  expires_at: string | null;
  attempt_a_id: string;
  attempt_b_id: string | null;
  compare_id: string;
};

export type CompareTokenValidationResult = {
  valid: boolean;
  expired: boolean;
  notFound: boolean;
  data: CompareTokenInfo | null;
};

/**
 * Fetches compare token info by token using RPC.
 * Server returns the row if it exists (doesn't filter by expiry).
 * Frontend determines if it's expired or invalid.
 * 
 * @param token - The invite token to look up
 * @returns Validation result with token info or null
 */
export async function getCompareTokenByToken(
  token: string
): Promise<CompareTokenValidationResult> {
  // Trim token to prevent whitespace issues
  const trimmedToken = token.trim();

  if (import.meta.env.DEV) {
    console.log("[getCompareTokenByToken] Fetching token via RPC:", {
      raw: token,
      trimmed: trimmedToken,
      length: trimmedToken.length,
      preview: trimmedToken.substring(0, 12) + "...",
    });
  }

  // Call RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_compare_token_by_token",
    { p_token: trimmedToken }
  );

  if (rpcError) {
    if (import.meta.env.DEV) {
      console.error("[getCompareTokenByToken] RPC Error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
    }
    return {
      valid: false,
      expired: false,
      notFound: true,
      data: null,
    };
  }

  // RPC returns array (table function)
  if (!rpcData || rpcData.length === 0) {
    if (import.meta.env.DEV) {
      console.log("[getCompareTokenByToken] Token not found:", {
        token: trimmedToken.substring(0, 12) + "...",
      });
    }
    return {
      valid: false,
      expired: false,
      notFound: true,
      data: null,
    };
  }

  const row = rpcData[0];

  // Check expiry server-side (using current time)
  const now = new Date();
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const isExpired = expiresAt !== null && expiresAt <= now;

  if (import.meta.env.DEV) {
    console.log("[getCompareTokenByToken] RPC response:", {
      token: row.token?.substring(0, 12) + "...",
      status: row.status,
      expires_at: row.expires_at,
      isExpired,
      now: now.toISOString(),
      compare_id: row.compare_id,
    });
  }

  return {
    valid: !isExpired && row.status === "pending",
    expired: isExpired,
    notFound: false,
    data: {
      token: row.token,
      status: row.status,
      expires_at: row.expires_at,
      attempt_a_id: row.attempt_a_id,
      attempt_b_id: row.attempt_b_id,
      compare_id: row.compare_id,
    },
  };
}

