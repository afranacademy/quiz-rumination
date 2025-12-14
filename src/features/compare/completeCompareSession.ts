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
    p_token: token,
    p_attempt_b_id: attemptBId,
  };

  if (import.meta.env.DEV) {
    console.log("[completeCompareSession] Completing session:", {
      token: token.substring(0, 12) + "...",
      attemptBId: attemptBId.substring(0, 8) + "...",
      rpcPayload,
    });
  }

  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc("complete_compare_session", rpcPayload);

  if (!rpcError) {
    if (import.meta.env.DEV) {
      console.log("[completeCompareSession] ✅ Session completed via RPC:", {
        rpcPayload,
        rpcResponse: rpcData,
      });
    }
    return;
  }

  // If RPC doesn't exist or fails, use direct update
  if (rpcError.code === "42883" || rpcError.message?.includes("function") || rpcError.message?.includes("does not exist")) {
    if (import.meta.env.DEV) {
      console.log("[completeCompareSession] RPC not found, using direct update");
    }
  } else {
    if (import.meta.env.DEV) {
      console.error("[completeCompareSession] RPC Error:", {
        rpcPayload,
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        status: rpcError.status || "N/A",
      });
      console.error("[completeCompareSession] Full RPC error object:", rpcError);
    }
    throw new Error(`Failed to complete compare session: ${rpcError.message}`);
  }

  // Direct update
  const { error: updateError } = await supabase
    .from("compare_sessions")
    .update({
      attempt_b_id: attemptBId,
      status: "completed",
    })
    .eq("invite_token", token)
    .eq("status", "pending");

  if (updateError) {
    if (import.meta.env.DEV) {
      console.error("[completeCompareSession] Update Error:", {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
    }
    throw new Error(`Failed to complete compare session: ${updateError.message}`);
  }

  if (import.meta.env.DEV) {
    console.log("[completeCompareSession] ✅ Session completed via direct update");
  }
}

