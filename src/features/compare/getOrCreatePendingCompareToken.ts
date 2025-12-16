import { supabase } from "@/lib/supabaseClient";

export type GetOrCreatePendingCompareTokenResult = {
  token: string;
  expires_at: string;
  compare_id: string;
  status: "pending" | "completed";
  url: string;
};

/**
 * Gets or creates a pending compare token for an attempt.
 * If a pending token exists (not expired, not superseded), returns it.
 * Otherwise, creates a new one.
 * 
 * @param attemptAId - The attempt ID to create/get token for
 * @param expiresInMinutes - Expiration time in minutes (default: 1440 = 24 hours)
 * @returns Token info including whether it was existing or newly created
 */
export async function getOrCreatePendingCompareToken(
  attemptAId: string,
  expiresInMinutes: number = 1440
): Promise<GetOrCreatePendingCompareTokenResult> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'getOrCreatePendingCompareToken.ts:21',message:'Function entry',data:{attemptAId,expiresInMinutes,supabaseUrl:import.meta.env.VITE_SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  if (import.meta.env.DEV) {
    console.log("[getOrCreatePendingCompareToken] 🔵 Getting or creating pending token");
    console.log("[getOrCreatePendingCompareToken] Attempt A ID:", attemptAId);
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(attemptAId)) {
    const errorMsg = `Invalid attempt ID format: ${attemptAId}. Expected UUID.`;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'getOrCreatePendingCompareToken.ts:38',message:'UUID validation failed',data:{attemptAId,errorMsg},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (import.meta.env.DEV) {
      console.error("[getOrCreatePendingCompareToken] ❌ Invalid attempt ID format");
    }
    throw new Error(errorMsg);
  }

  // Call RPC
  const rpcPayload = {
    p_attempt_a_id: attemptAId,
    p_expires_in_minutes: expiresInMinutes,
  };

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'getOrCreatePendingCompareToken.ts:47',message:'Before RPC call',data:{rpcFunctionName:'get_or_create_pending_compare_token',rpcPayload},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (import.meta.env.DEV) {
    console.log("[getOrCreatePendingCompareToken] RPC payload:", rpcPayload);
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_or_create_pending_compare_token",
    rpcPayload
  );

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'getOrCreatePendingCompareToken.ts:54',message:'RPC call completed - checking for schema cache error',data:{hasError:!!rpcError,errorCode:rpcError?.code,isSchemaCacheError:rpcError?.code==='PGRST202'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'getOrCreatePendingCompareToken.ts:54',message:'After RPC call',data:{hasError:!!rpcError,errorCode:rpcError?.code,errorMessage:rpcError?.message,errorDetails:rpcError?.details,errorHint:rpcError?.hint,hasData:!!rpcData,dataType:Array.isArray(rpcData)?'array':typeof rpcData,dataLength:Array.isArray(rpcData)?rpcData.length:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,E'})}).catch(()=>{});
  // #endregion

  if (rpcError) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'getOrCreatePendingCompareToken.ts:68',message:'RPC error details',data:{errorCode:rpcError.code,errorMessage:rpcError.message,errorDetails:rpcError.details,errorHint:rpcError.hint,fullError:JSON.stringify(rpcError),isSchemaCacheError:rpcError.code==='PGRST202'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,E'})}).catch(()=>{});
    // #endregion
    
    // If schema cache error, provide helpful message
    if (rpcError.code === 'PGRST202') {
      const helpfulMessage = `Function not found in schema cache. Please run migration 012_reusable_compare_tokens.sql in Supabase SQL Editor, then refresh the schema cache with: SELECT pg_notify('pgrst', 'reload schema');`;
      if (import.meta.env.DEV) {
        console.error("[getOrCreatePendingCompareToken] ❌ Schema Cache Error:", {
          rpcPayload,
          error: {
            code: rpcError.code,
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
          },
          instructions: helpfulMessage,
        });
      }
      throw new Error(`Migration not applied: ${helpfulMessage}`);
    }
    
    if (import.meta.env.DEV) {
      console.error("[getOrCreatePendingCompareToken] ❌ RPC Error:", {
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
    throw new Error(`Failed to get or create compare token: ${rpcError.message}`);
  }

  // RPC returns a row with token, expires_at, compare_id, status
  let resultRow: any = null;
  if (Array.isArray(rpcData)) {
    if (rpcData.length === 0) {
      if (import.meta.env.DEV) {
        console.error("[getOrCreatePendingCompareToken] ❌ RPC returned empty array");
      }
      throw new Error("Invalid response from get_or_create_pending_compare_token RPC: empty result");
    }
    resultRow = rpcData[0];
  } else if (rpcData && typeof rpcData === "object") {
    resultRow = rpcData;
  } else {
    if (import.meta.env.DEV) {
      console.error("[getOrCreatePendingCompareToken] ❌ Invalid RPC response format:", rpcData);
    }
    throw new Error("Invalid response from get_or_create_pending_compare_token RPC: unexpected format");
  }

  if (!resultRow.token || typeof resultRow.token !== "string") {
    if (import.meta.env.DEV) {
      console.error("[getOrCreatePendingCompareToken] ❌ Invalid RPC response - missing token:", resultRow);
    }
    throw new Error("Invalid response from get_or_create_pending_compare_token RPC: missing token");
  }

  const token = resultRow.token;
  const compareId = resultRow.compare_id || "";
  const expiresAt = resultRow.expires_at || "";
  const status = (resultRow.status === "completed" ? "completed" : "pending") as "pending" | "completed";

  // Build share URL
  const url = `${window.location.origin}/compare/invite/${token}`;

  if (import.meta.env.DEV) {
    console.log("[getOrCreatePendingCompareToken] ✅ Token retrieved/created:", {
      compare_id: compareId,
      token: token.substring(0, 12) + "...",
      expires_at: expiresAt,
      status,
      url,
    });
  }

  return {
    token,
    expires_at: expiresAt,
    compare_id: compareId,
    status,
    url,
  };
}

