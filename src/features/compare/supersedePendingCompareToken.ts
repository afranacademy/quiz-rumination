import { supabase } from "@/lib/supabaseClient";

export type SupersedePendingCompareTokenResult = {
  session_id: string;
  invite_token: string;
  expires_at: string;
  url: string;
};

/**
 * Supersedes (invalidates) existing pending tokens for an attempt and creates a new one.
 * This explicitly creates a fresh token, marking all previous pending tokens as superseded.
 * 
 * @param attemptAId - The attempt ID to create new token for
 * @param expiresInMinutes - Expiration time in minutes (default: 1440 = 24 hours)
 * @returns New token info
 */
export async function supersedePendingCompareToken(
  attemptAId: string,
  expiresInMinutes: number = 1440
): Promise<SupersedePendingCompareTokenResult> {
  if (import.meta.env.DEV) {
    console.log("[supersedePendingCompareToken] 🔵 Superseding old tokens and creating new one");
    console.log("[supersedePendingCompareToken] Attempt A ID:", attemptAId);
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(attemptAId)) {
    const errorMsg = `Invalid attempt ID format: ${attemptAId}. Expected UUID.`;
    if (import.meta.env.DEV) {
      console.error("[supersedePendingCompareToken] ❌ Invalid attempt ID format");
    }
    throw new Error(errorMsg);
  }

  // Call RPC
  const rpcPayload = {
    p_attempt_a_id: attemptAId,
    p_expires_in_minutes: expiresInMinutes,
  };

  if (import.meta.env.DEV) {
    console.log("[supersedePendingCompareToken] RPC payload:", rpcPayload);
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "supersede_pending_compare_token",
    rpcPayload
  );

  if (rpcError) {
    if (import.meta.env.DEV) {
      console.error("[supersedePendingCompareToken] ❌ RPC Error:", {
        rpcPayload,
        error: {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        },
        rpcResponse: rpcData,
      });
    }
    throw new Error(`Failed to supersede and create compare token: ${rpcError.message}`);
  }

  // RPC returns a row with token, expires_at, compare_id (from compare_tokens table)
  let resultRow: any = null;
  if (Array.isArray(rpcData)) {
    if (rpcData.length === 0) {
      if (import.meta.env.DEV) {
        console.error("[supersedePendingCompareToken] ❌ RPC returned empty array");
      }
      throw new Error("Invalid response from supersede_pending_compare_token RPC: empty result");
    }
    resultRow = rpcData[0];
  } else if (rpcData && typeof rpcData === "object") {
    resultRow = rpcData;
  } else {
    if (import.meta.env.DEV) {
      console.error("[supersedePendingCompareToken] ❌ Invalid RPC response format:", rpcData);
    }
    throw new Error("Invalid response from supersede_pending_compare_token RPC: unexpected format");
  }

  if (!resultRow.token || typeof resultRow.token !== "string") {
    if (import.meta.env.DEV) {
      console.error("[supersedePendingCompareToken] ❌ Invalid RPC response - missing token:", resultRow);
    }
    throw new Error("Invalid response from supersede_pending_compare_token RPC: missing token");
  }

  const inviteToken = resultRow.token;
  const sessionId = resultRow.compare_id || resultRow.token; // Use compare_id or token as session_id
  const expiresAt = resultRow.expires_at || "";

  // Build share URL
  const url = `${window.location.origin}/compare/invite/${inviteToken}`;

  if (import.meta.env.DEV) {
    console.log("[supersedePendingCompareToken] ✅ New token created after superseding:", {
      session_id: sessionId,
      invite_token: inviteToken.substring(0, 12) + "...",
      expires_at: expiresAt,
      url,
    });
  }

  return {
    session_id: sessionId,
    invite_token: inviteToken,
    expires_at: expiresAt,
    url,
  };
}

