import { supabase } from "./supabaseClient";

/**
 * Standard admin RPC response structure
 */
export type AdminRpcResponse<T> = {
  ok: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
};

/**
 * Safely calls an admin RPC and unwraps the JSON contract
 * @param rpcName Name of the RPC function
 * @param params RPC parameters
 * @returns Typed response with ok/data/error structure
 */
export async function callAdminRpc<T = any>(
  rpcName: string,
  params: Record<string, any>
): Promise<AdminRpcResponse<T>> {
  try {
    if (!supabase) {
      return {
        ok: false,
        data: null,
        error: {
          code: "SUPABASE_NOT_INITIALIZED",
          message: "Supabase client not initialized",
        },
      };
    }

    const { data, error } = await supabase.rpc(rpcName, params);

    if (error) {
      return {
        ok: false,
        data: null,
        error: {
          code: error.code || "RPC_ERROR",
          message: error.message || "Unknown RPC error",
        },
      };
    }

    // RPC should return {ok, data, error} structure
    if (data && typeof data === "object" && "ok" in data) {
      return data as AdminRpcResponse<T>;
    }

    // Fallback: if RPC returns data directly, wrap it
    return {
      ok: true,
      data: data as T,
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      ok: false,
      data: null,
      error: {
        code: "EXCEPTION",
        message: error.message,
      },
    };
  }
}

