import { useState, useCallback } from "react";
import { createAttempt } from "./createAttempt";
import type { AttemptPayload, CreatedAttempt } from "./types";

export function useCreateAttempt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createAttemptHandler = useCallback(async (payload: AttemptPayload): Promise<CreatedAttempt | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await createAttempt(payload);
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      setLoading(false);
      console.error("[useCreateAttempt] Error caught:", error);
      // Re-throw to ensure error is not swallowed
      throw error;
    }
  }, []);

  return {
    createAttempt: createAttemptHandler,
    loading,
    error,
  };
}

