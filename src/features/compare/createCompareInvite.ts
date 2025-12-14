import { supabase } from "@/lib/supabaseClient";

export type CreateCompareInviteResult = {
  session_id: string;
  invite_token: string;
  expires_at: string;
  url: string;
};

/**
 * Creates a compare invite session for attempt A.
 * Validates that the attempt exists and is completed.
 * Calls RPC: create_compare_invite(p_attempt_a_id uuid, p_expires_in_minutes int default 60)
 * RPC returns: (session_id uuid, invite_token text, expires_at timestamptz)
 * Returns: { session_id, invite_token, expires_at, url }
 */
export async function createCompareInvite(
  attemptAId: string,
  expiresInMinutes: number = 60
): Promise<CreateCompareInviteResult> {
  if (import.meta.env.DEV) {
    console.log("[createCompareInvite] 🔵 Click fired - creating invite");
    console.log("[createCompareInvite] Attempt A ID:", attemptAId);
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(attemptAId)) {
    const errorMsg = `Invalid attempt ID format: ${attemptAId}. Expected UUID.`;
    if (import.meta.env.DEV) {
      console.error("[createCompareInvite] ❌ Invalid attempt ID format");
    }
    throw new Error(errorMsg);
  }

  // Validate attempt exists and is completed
  if (import.meta.env.DEV) {
    console.log("[createCompareInvite] Validating attempt exists and is completed...");
  }

  const { data: attemptData, error: attemptError } = await supabase
    .from("attempts")
    .select("id, status, total_score")
    .eq("id", attemptAId)
    .maybeSingle();

  if (attemptError) {
    if (import.meta.env.DEV) {
      console.error("[createCompareInvite] ❌ Error fetching attempt:", {
        code: attemptError.code,
        message: attemptError.message,
        details: attemptError.details,
        hint: attemptError.hint,
      });
    }
    throw new Error(`Failed to validate attempt: ${attemptError.message}`);
  }

  if (!attemptData) {
    const errorMsg = "Attempt not found. Please complete the quiz first.";
    if (import.meta.env.DEV) {
      console.error("[createCompareInvite] ❌ Attempt not found");
    }
    throw new Error(errorMsg);
  }

  if (attemptData.status !== "completed") {
    const errorMsg = "Attempt is not completed. Please complete the quiz first.";
    if (import.meta.env.DEV) {
      console.error("[createCompareInvite] ❌ Attempt not completed:", {
        status: attemptData.status,
        total_score: attemptData.total_score,
      });
    }
    throw new Error(errorMsg);
  }

  if (import.meta.env.DEV) {
    console.log("[createCompareInvite] ✅ Attempt validated:", {
      id: attemptData.id,
      status: attemptData.status,
      total_score: attemptData.total_score,
    });
  }

  // Call RPC with both parameters
  const rpcPayload = {
    p_attempt_a_id: attemptAId,
    p_expires_in_minutes: expiresInMinutes,
  };

  if (import.meta.env.DEV) {
    console.log("[createCompareInvite] RPC payload:", rpcPayload);
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_compare_invite",
    rpcPayload
  );

  if (rpcError) {
    if (import.meta.env.DEV) {
      console.error("[createCompareInvite] ❌ RPC Error:", {
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
    throw new Error(`Failed to create compare invite: ${rpcError.message}`);
  }

  // RPC returns a row with session_id, invite_token, expires_at
  // Handle both single row and array responses
  let resultRow: any = null;
  if (Array.isArray(rpcData)) {
    if (rpcData.length === 0) {
      if (import.meta.env.DEV) {
        console.error("[createCompareInvite] ❌ RPC returned empty array");
      }
      throw new Error("Invalid response from create_compare_invite RPC: empty result");
    }
    resultRow = rpcData[0];
  } else if (rpcData && typeof rpcData === "object") {
    resultRow = rpcData;
  } else {
    if (import.meta.env.DEV) {
      console.error("[createCompareInvite] ❌ Invalid RPC response format:", rpcData);
    }
    throw new Error("Invalid response from create_compare_invite RPC: unexpected format");
  }

  if (!resultRow.invite_token || typeof resultRow.invite_token !== "string") {
    if (import.meta.env.DEV) {
      console.error("[createCompareInvite] ❌ Invalid RPC response - missing invite_token:", resultRow);
    }
    throw new Error("Invalid response from create_compare_invite RPC: missing invite_token");
  }

  const inviteToken = resultRow.invite_token;
  const sessionId = resultRow.session_id || "";
  const expiresAt = resultRow.expires_at || "";

  // Build share URL - use /compare/invite/${token} as specified
  const url = `${window.location.origin}/compare/invite/${inviteToken}`;

  if (import.meta.env.DEV) {
    console.log("[createCompareInvite] ✅ Invite created successfully:", {
      session_id: sessionId,
      invite_token: inviteToken.substring(0, 12) + "...",
      expires_at: expiresAt,
      url,
      rpcResponse: rpcData,
    });
  }

  return {
    session_id: sessionId,
    invite_token: inviteToken,
    expires_at: expiresAt,
    url,
  };
}

