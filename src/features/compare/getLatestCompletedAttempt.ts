import { supabase } from "@/lib/supabaseClient";

/**
 * Resolves the latest completed attempt ID for the current user.
 * 
 * Strategy:
 * 1. Try localStorage "afran_attempt_id"
 * 2. If missing or invalid, query attempts by participant_id = auth.uid() where status='completed'
 * 3. Store resolved attempt ID back to localStorage
 * 
 * @param userId - Current user ID from auth session (must be non-null)
 * @returns Resolved attempt ID or null if none found
 */
export async function getLatestCompletedAttempt(
  userId: string
): Promise<string | null> {
  if (import.meta.env.DEV) {
    console.log("[getLatestCompletedAttempt] 🔍 Resolving attempt ID for user:", userId);
  }

  // Step 1: Try localStorage first
  const storedAttemptId = localStorage.getItem("afran_attempt_id");
  
  if (storedAttemptId) {
    if (import.meta.env.DEV) {
      console.log("[getLatestCompletedAttempt] Found attempt ID in localStorage:", storedAttemptId);
    }

    // Validate the stored attempt exists and is completed
    const { data: attemptData, error: attemptError } = await supabase
      .from("attempts")
      .select("id, status, participant_id")
      .eq("id", storedAttemptId)
      .maybeSingle();

    if (attemptError) {
      if (import.meta.env.DEV) {
        console.warn("[getLatestCompletedAttempt] Error validating stored attempt:", {
          code: attemptError.code,
          message: attemptError.message,
        });
      }
      // Continue to fallback
    } else if (attemptData) {
      // Verify it belongs to current user and is completed
      if (
        attemptData.participant_id === userId &&
        attemptData.status === "completed"
      ) {
        if (import.meta.env.DEV) {
          console.log("[getLatestCompletedAttempt] ✅ Stored attempt is valid:", {
            id: attemptData.id,
            status: attemptData.status,
            source: "localStorage",
          });
        }
        return attemptData.id;
      } else {
        if (import.meta.env.DEV) {
          console.warn("[getLatestCompletedAttempt] Stored attempt invalid:", {
            id: attemptData.id,
            status: attemptData.status,
            participant_id: attemptData.participant_id,
            current_user_id: userId,
          });
        }
        // Continue to fallback
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn("[getLatestCompletedAttempt] Stored attempt ID not found in DB");
      }
      // Continue to fallback
    }
  } else {
    if (import.meta.env.DEV) {
      console.log("[getLatestCompletedAttempt] No attempt ID in localStorage");
    }
  }

  // Step 2: Fallback - query latest completed attempt by participant_id
  if (import.meta.env.DEV) {
    console.log("[getLatestCompletedAttempt] Querying latest completed attempt for user...");
  }

  const { data: attemptsData, error: queryError } = await supabase
    .from("attempts")
    .select("id, status, completed_at, participant_id")
    .eq("participant_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1);

  if (queryError) {
    if (import.meta.env.DEV) {
      console.error("[getLatestCompletedAttempt] ❌ Error querying attempts:", {
        code: queryError.code,
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint,
      });
    }
    return null;
  }

  if (!attemptsData || attemptsData.length === 0) {
    if (import.meta.env.DEV) {
      console.warn("[getLatestCompletedAttempt] No completed attempts found for user");
    }
    return null;
  }

  const latestAttempt = attemptsData[0];
  
  if (import.meta.env.DEV) {
    console.log("[getLatestCompletedAttempt] ✅ Found latest completed attempt:", {
      id: latestAttempt.id,
      status: latestAttempt.status,
      completed_at: latestAttempt.completed_at,
      source: "database_query",
    });
  }

  // Step 3: Store resolved attempt ID back to localStorage
  localStorage.setItem("afran_attempt_id", latestAttempt.id);
  
  if (import.meta.env.DEV) {
    console.log("[getLatestCompletedAttempt] Stored attempt ID to localStorage");
  }

  return latestAttempt.id;
}

