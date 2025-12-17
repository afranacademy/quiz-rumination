import { supabase } from "@/lib/supabaseClient";

/**
 * Completes a compare session by setting attempt_b_id and status='completed'.
 * First tries RPC complete_compare_session if it exists, otherwise uses direct update.
 */
export async function completeCompareSession(
  token: string,
  attemptBId: string
): Promise<void> {
  const rpcPayload = {
    p_invite_token: token,
    p_attempt_b_id: attemptBId,
  };

  if (import.meta.env.DEV) {
    console.log("[completeCompareSession] Completing session:", {
      token: token.substring(0, 12) + "...",
      attemptBId: attemptBId.substring(0, 8) + "...",
      rpcPayload,
    });
  }

  // Trim token before RPC call
  const trimmedToken = token.trim();
  const trimmedRpcPayload = {
    p_invite_token: trimmedToken,
    p_attempt_b_id: attemptBId,
  };

  if (import.meta.env.DEV) {
    console.log("[completeCompareSession] 🔍 Completing session:", {
      token: trimmedToken.substring(0, 12) + "...",
      raw_token: token,
      trimmed_token: trimmedToken,
      attemptBId: attemptBId.substring(0, 8) + "...",
      rpcPayload: trimmedRpcPayload,
    });
  }

  // Call RPC (must use compare_tokens table via migration 015)
  const { data: rpcData, error: rpcError } = await supabase.rpc("complete_compare_session", trimmedRpcPayload);

  if (rpcError) {
    if (import.meta.env.DEV) {
      console.error("[completeCompareSession] ❌ RPC Error:", {
        rpcPayload: trimmedRpcPayload,
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        status: rpcError.status || "N/A",
        token: trimmedToken.substring(0, 12) + "...",
      });
      console.error("[completeCompareSession] Full RPC error object:", rpcError);
    }
    throw new Error(`Failed to complete compare session: ${rpcError.message}`);
  }

  if (import.meta.env.DEV) {
    console.log("[completeCompareSession] ✅ Session completed via RPC:", {
      rpcPayload: trimmedRpcPayload,
      rpcResponse: rpcData,
      token: trimmedToken.substring(0, 12) + "...",
    });
  }
}

