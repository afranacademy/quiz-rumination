import { supabase } from "@/lib/supabaseClient";
import type { AttemptPayload, CreatedAttempt } from "./types";

export type StartAttemptPayload = {
  quizId: string;
  participantId: string;
  userFirstName: string;
  userLastName: string | null;
  userPhone: string | null;
  userAgent: string;
};

export type UpdateAttemptAnswersPayload = {
  attemptId: string;
  answers: (number | null)[];
  lastQuestionIndex: number;
};

export type AbandonAttemptPayload = {
  attemptId: string;
  lastQuestionIndex?: number;
};

export type CompleteAttemptPayload = {
  attemptId: string;
  totalScore: number;
  dimensionScores: Record<string, number>;
  scoreBandId: number | null;
};

/**
 * Creates a new attempt when user starts the quiz.
 * Returns the created attempt id.
 */
export async function startAttempt(payload: StartAttemptPayload): Promise<string> {
  // Initialize answers array with 12 null values
  const initialAnswers: (number | null)[] = new Array(12).fill(null);

  // user_last_name is nullable - use null if not provided (graceful fallback)
  const userLastName = payload.userLastName && payload.userLastName.trim() !== '' 
    ? payload.userLastName.trim() 
    : null;
  
  // user_phone can be empty string (nullable in DB)
  const userPhone = payload.userPhone && payload.userPhone.trim() !== ''
    ? payload.userPhone.trim()
    : null;
  
  const insertPayload = {
    quiz_id: payload.quizId,
    participant_id: payload.participantId,
    user_first_name: payload.userFirstName,
    user_last_name: userLastName, // Nullable - null if not provided
    user_phone: userPhone, // Nullable - null if not provided
    status: "started",
    started_at: new Date().toISOString(),
    answers: initialAnswers,
    last_question_index: 0,
    user_agent: payload.userAgent,
  };

  console.log("[startAttempt] Inserting attempt:", insertPayload);

  const { data, error } = await supabase
    .from("attempts")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    console.error("[startAttempt] Error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    console.error("[startAttempt] Payload:", insertPayload);
    
    // Check for RLS or auth errors
    if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
      throw new Error(`RLS Policy Error: ${error.message}. Check Supabase RLS policies for 'attempts' table.`);
    }
    
    throw new Error(`Failed to create attempt: ${error.message}`);
  }

  if (!data?.id) {
    console.error("[startAttempt] No id returned:", { data });
    console.error("[startAttempt] Payload:", insertPayload);
    throw new Error("No attempt id returned");
  }

  console.log("[startAttempt] Success, attempt id:", data.id);
  return data.id;
}

/**
 * Updates attempt with answers as user progresses.
 * Sets status to 'in_progress' if current status is 'started' or if last_question_index > 0.
 */
export async function updateAttemptAnswers(payload: UpdateAttemptAnswersPayload): Promise<void> {
  // First, fetch current status to determine if we need to update status
  const { data: currentAttempt, error: fetchError } = await supabase
    .from("attempts")
    .select("id, status")
    .eq("id", payload.attemptId)
    .single();

  if (fetchError) {
    console.error("[updateAttemptAnswers] Error fetching attempt status:", {
      message: fetchError.message,
      details: fetchError.details,
      hint: fetchError.hint,
      code: fetchError.code,
    });
    throw new Error(`Failed to fetch attempt status: ${fetchError.message}`);
  }

  const updatePayload: {
    answers: (number | null)[];
    last_question_index: number;
    status?: string;
  } = {
    answers: payload.answers,
    last_question_index: payload.lastQuestionIndex,
  };

  // Set status to 'in_progress' if current status is 'started' or if last_question_index > 0
  if (currentAttempt?.status === "started" || payload.lastQuestionIndex > 0) {
    updatePayload.status = "in_progress";
  }

  console.log("[updateAttemptAnswers] Updating attempt:", payload.attemptId, updatePayload);

  const { data, error } = await supabase
    .from("attempts")
    .update(updatePayload)
    .eq("id", payload.attemptId)
    .select("id")
    .single();

  if (error) {
    console.error("[updateAttemptAnswers] Error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    console.error("[updateAttemptAnswers] Payload:", updatePayload);
    
    if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
      throw new Error(`RLS Policy Error: ${error.message}. Check Supabase RLS policies for 'attempts' table.`);
    }
    
    throw new Error(`Failed to update attempt: ${error.message}`);
  }

  if (!data?.id) {
    console.error("[updateAttemptAnswers] No data returned:", { data });
    throw new Error("Failed to update attempt: no data returned");
  }

  console.log("[updateAttemptAnswers] Success");
}

/**
 * Ensures a Supabase session exists. If not, signs in anonymously.
 * Returns true if session exists after this call.
 */
async function ensureSession(): Promise<boolean> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("[ensureSession] Error getting session:", {
      message: sessionError.message,
      code: sessionError.status,
    });
    return false;
  }

  if (session?.user) {
    return true;
  }

  // No session, sign in anonymously
  console.log("[ensureSession] No session found, signing in anonymously...");
  const { data: authData, error: signInError } = await supabase.auth.signInAnonymously();

  if (signInError) {
    console.error("[ensureSession] Error signing in anonymously:", {
      message: signInError.message,
      code: signInError.status,
    });
    return false;
  }

  if (authData?.user) {
    console.log("[ensureSession] Signed in anonymously:", authData.user.id);
    return true;
  }

  return false;
}

/**
 * Completes an attempt with final scores.
 * Only sets completion fields (total_score, dimension_scores, score_band_id, completed_at) when status becomes completed.
 * Prevents overwriting already completed or abandoned attempts.
 * Ensures session exists before update.
 * Returns the updated attempt row.
 */
export async function completeAttempt(payload: CompleteAttemptPayload): Promise<{
  id: string;
  status: string;
  total_score: number;
  score_band_id: number | null;
  dimension_scores: Record<string, number>;
  completed_at: string;
}> {
  // Ensure session exists before update
  const hasSession = await ensureSession();
  if (!hasSession) {
    throw new Error("Failed to ensure authentication session. Cannot complete attempt.");
  }

  // Get current user ID for ownership validation
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const currentParticipantId = user?.id;

  if (userError || !currentParticipantId) {
    throw new Error(`Failed to get current user: ${userError?.message || "No user"}`);
  }

  // First, check current status and ownership to prevent overwriting
  const { data: currentAttempt, error: fetchError } = await supabase
    .from("attempts")
    .select("id, status, participant_id, quiz_id")
    .eq("id", payload.attemptId)
    .maybeSingle();

  if (fetchError) {
    if (import.meta.env.DEV) {
      console.error("[completeAttempt] Error fetching attempt status:", {
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code,
      });
    }
    throw new Error(`Failed to fetch attempt status: ${fetchError.message}`);
  }

  if (!currentAttempt) {
    // Attempt not found - likely RLS blocked or doesn't exist
    if (import.meta.env.DEV) {
      console.error("[completeAttempt] Attempt not found or not accessible:", {
        attemptId: payload.attemptId,
        participantId: currentParticipantId,
      });
    }
    throw new Error(`Attempt not found or not owned: ${payload.attemptId}. Please create a new attempt.`);
  }

  // Validate ownership
  if (currentAttempt.participant_id !== currentParticipantId) {
    if (import.meta.env.DEV) {
      console.error("[completeAttempt] Ownership mismatch:", {
        attemptId: payload.attemptId,
        attemptParticipantId: currentAttempt.participant_id,
        currentParticipantId,
      });
    }
    throw new Error(`Attempt not owned by current participant: ${payload.attemptId}. Please create a new attempt.`);
  }

  // Prevent overwriting already completed or abandoned attempts
  if (currentAttempt.status === "completed") {
    if (import.meta.env.DEV) {
      console.log("[completeAttempt] Attempt already completed, skipping:", payload.attemptId);
    }
    // Fetch the completed attempt data to return (no status filter - fetch by id only)
    const { data: completedData, error: fetchError } = await supabase
      .from("attempts")
      .select("*")
      .eq("id", payload.attemptId)
      .single();
    
    if (fetchError || !completedData) {
      throw new Error(`Failed to fetch completed attempt: ${fetchError?.message || "No data"}`);
    }
    
    // Return the fetched row directly
    return {
      id: completedData.id,
      status: completedData.status,
      total_score: completedData.total_score || 0,
      score_band_id: completedData.score_band_id,
      dimension_scores: completedData.dimension_scores as Record<string, number>,
      completed_at: completedData.completed_at || new Date().toISOString(),
    };
  }

  if (currentAttempt.status === "abandoned") {
    throw new Error(`Cannot complete an abandoned attempt: ${payload.attemptId}`);
  }

  // Assert dimension_scores exists and is an object before update
  if (!payload.dimensionScores || typeof payload.dimensionScores !== "object") {
    throw new Error("dimension_scores missing before update");
  }

  if (import.meta.env.DEV) {
    console.log("[completeAttempt] Completing attempt:", payload.attemptId.substring(0, 8) + "...");
    console.log("[completeAttempt] Pre-update validation:", {
      totalScore: payload.totalScore,
      dimensionScores: payload.dimensionScores,
      dimensionScoresKeys: Object.keys(payload.dimensionScores),
      dimensionScoresValues: Object.values(payload.dimensionScores),
      scoreBandId: payload.scoreBandId,
    });
  }

  // Build update payload - only set completion fields when status becomes completed
  // Use correct column names: dimension_scores (not dimensionScores)
  // Do NOT JSON.stringify - Supabase can store JS object into jsonb
  const updatePayload: {
    total_score: number;
    dimension_scores: Record<string, number>;
    score_band_id: number | null;
    status: string;
    completed_at: string;
  } = {
    total_score: payload.totalScore,
    dimension_scores: payload.dimensionScores,
    score_band_id: payload.scoreBandId,
    status: "completed",
    completed_at: new Date().toISOString(),
  };
  
  if (import.meta.env.DEV) {
    console.log("[completeAttempt] Update payload (dimension_scores):", {
      dimension_scores: updatePayload.dimension_scores,
      dimension_scoresType: typeof updatePayload.dimension_scores,
      dimension_scoresIsObject: typeof updatePayload.dimension_scores === "object",
    });
  }

  // Update by id only - we already checked status is not completed/abandoned
  // Use .is("completed_at", null) to ensure we don't overwrite completed attempts
  // Use .select('*') to get all fields including dimension_scores
  // Use .maybeSingle() to handle 0 rows gracefully (idempotent)
  // Also filter by participant_id to ensure ownership
  const { data, error } = await supabase
    .from("attempts")
    .update(updatePayload)
    .eq("id", payload.attemptId)
    .eq("participant_id", currentParticipantId) // Ensure ownership
    .is("completed_at", null) // Only update if not already completed
    .select("*")
    .maybeSingle();

  if (import.meta.env.DEV) {
    console.log("[completeAttempt] Update result:", {
      attemptId: payload.attemptId,
      participantId: currentParticipantId,
      rowsUpdated: data ? 1 : 0,
      dataReturned: !!data,
    });
  }

  if (error) {
    // Log detailed Supabase error
    console.error("[completeAttempt] Supabase Error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    console.error("[completeAttempt] Full error object:", error);
    console.error("[completeAttempt] Update payload:", updatePayload);
    console.error("[completeAttempt] Attempt ID:", payload.attemptId);
    
    // If RLS/permission error, try to ensure session and retry once
    if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
      console.log("[completeAttempt] RLS error detected, ensuring session and retrying once...");
      const retryHasSession = await ensureSession();
      if (retryHasSession) {
        // Retry the update once - use maybeSingle() to handle 0 rows
        // Also filter by participant_id to ensure ownership
        const { data: retryData, error: retryError } = await supabase
          .from("attempts")
          .update(updatePayload)
          .eq("id", payload.attemptId)
          .eq("participant_id", currentParticipantId) // Ensure ownership
          .is("completed_at", null)
          .select("*")
          .maybeSingle();

        if (import.meta.env.DEV) {
          console.log("[completeAttempt] Retry update result:", {
            attemptId: payload.attemptId,
            participantId: currentParticipantId,
            rowsUpdated: retryData ? 1 : 0,
            dataReturned: !!retryData,
          });
        }

        if (retryError) {
          console.error("[completeAttempt] Retry failed:", {
            code: retryError.code,
            message: retryError.message,
            details: retryError.details,
            hint: retryError.hint,
          });
          throw new Error(`RLS Policy Error: ${retryError.message}. Check Supabase RLS policies for 'attempts' table.`);
        }

        // Retry succeeded, but check if 0 rows (already completed)
        if (!retryData) {
          // Fetch the attempt to check if it was already completed
          const { data: checkData, error: checkError } = await supabase
            .from("attempts")
            .select("*")
            .eq("id", payload.attemptId)
            .single();
          
          if (checkError) {
            if (import.meta.env.DEV) {
              console.error("[completeAttempt] Error checking attempt status after retry:", {
                code: checkError.code,
                message: checkError.message,
              });
            }
            throw new Error(`Failed to complete attempt: retry returned no data and status check failed. Attempt ID: ${payload.attemptId}`);
          }
          
          if (checkData?.status === "completed") {
            if (import.meta.env.DEV) {
              console.log("[completeAttempt] Attempt already completed (race condition), returning existing data:", payload.attemptId);
            }
            // Return the completed attempt data directly
            if (!checkData.dimension_scores || typeof checkData.dimension_scores !== "object") {
              if (import.meta.env.DEV) {
                console.warn("[completeAttempt] Completed attempt missing dimension_scores, but treating as success");
              }
            }
            return {
              id: checkData.id,
              status: checkData.status,
              total_score: checkData.total_score || 0,
              score_band_id: checkData.score_band_id,
              dimension_scores: (checkData.dimension_scores as Record<string, number>) || {},
              completed_at: checkData.completed_at || new Date().toISOString(),
            };
          }
          
          const currentStatus = checkData?.status || "unknown";
          throw new Error(`Failed to complete attempt: retry returned no data. Attempt ID: ${payload.attemptId}, Current status: ${currentStatus}`);
        }

        // Verify retry succeeded
        if (retryData.status !== "completed") {
          throw new Error(`Update did not set status to 'completed'. Got: ${retryData.status}`);
        }

        if (import.meta.env.DEV) {
          console.log("[completeAttempt] Retry succeeded - Attempt completed:", {
            id: retryData.id,
            status: retryData.status,
            total_score: retryData.total_score,
            score_band_id: retryData.score_band_id,
            dimension_scores: retryData.dimension_scores,
            completed_at: retryData.completed_at,
          });
        }
        return retryData;
      } else {
        throw new Error(`RLS Policy Error: ${error.message}. Failed to ensure session. Check Supabase RLS policies for 'attempts' table.`);
      }
    }
    
    throw new Error(`Failed to complete attempt: ${error.message}`);
  }

  if (!data) {
    // Update returned 0 rows - fetch by id to check status and ownership
    // This is idempotent: treat as success if already completed
    const { data: checkData, error: checkError } = await supabase
      .from("attempts")
      .select("*")
      .eq("id", payload.attemptId)
      .eq("participant_id", currentParticipantId)
      .maybeSingle();
    
    if (checkError) {
      if (import.meta.env.DEV) {
        console.error("[completeAttempt] Error checking attempt status:", {
          code: checkError.code,
          message: checkError.message,
          details: checkError.details,
          hint: checkError.hint,
        });
      }
      // If RLS blocks or not found, likely ownership issue
      throw new Error(`Failed to complete attempt: update returned no data and status check failed. Attempt ID: ${payload.attemptId}. This may indicate the attempt is not owned by the current participant.`);
    }
    
    if (!checkData) {
      // Attempt not found or not owned
      if (import.meta.env.DEV) {
        console.error("[completeAttempt] Attempt not found or not owned after 0-row update:", {
          attemptId: payload.attemptId,
          participantId: currentParticipantId,
        });
      }
      throw new Error(`Failed to complete attempt: 0 rows updated and attempt not found or not owned. Attempt ID: ${payload.attemptId}. Please create a new attempt.`);
    }
    
    if (checkData.status === "completed") {
      if (import.meta.env.DEV) {
        console.log("[completeAttempt] Attempt already completed (idempotent call), returning existing data:", payload.attemptId);
      }
      // Return the completed attempt data directly (treat as success)
      if (!checkData.dimension_scores || typeof checkData.dimension_scores !== "object") {
        if (import.meta.env.DEV) {
          console.warn("[completeAttempt] Completed attempt missing dimension_scores, but treating as success");
        }
        // Return with empty object if missing (non-blocking)
      }
      return {
        id: checkData.id,
        status: checkData.status,
        total_score: checkData.total_score || 0,
        score_band_id: checkData.score_band_id,
        dimension_scores: (checkData.dimension_scores as Record<string, number>) || {},
        completed_at: checkData.completed_at || new Date().toISOString(),
      };
    }
    
    // 0 rows updated and status is not completed - throw clear error with current status
    const currentStatus = checkData.status || "unknown";
    if (import.meta.env.DEV) {
      console.error("[completeAttempt] 0 rows updated, attempt not completed:", {
        attemptId: payload.attemptId,
        currentStatus,
        participantId: currentParticipantId,
        attemptParticipantId: checkData.participant_id,
      });
    }
    throw new Error(`Failed to complete attempt: 0 rows updated. Attempt ID: ${payload.attemptId}, Current status: ${currentStatus}`);
  }

  // Verify the update succeeded
  if (data.status !== "completed") {
    if (import.meta.env.DEV) {
    console.error("[completeAttempt] Status mismatch after update:", {
      expected: "completed",
      actual: data.status,
      returnedData: data,
    });
    }
    throw new Error(`Update did not set status to 'completed'. Got: ${data.status}`);
  }

  if (data.total_score === null || data.total_score === undefined) {
    if (import.meta.env.DEV) {
    console.error("[completeAttempt] total_score is still null after update:", data);
    }
    throw new Error("Update did not set total_score");
  }

  if (!data.dimension_scores || typeof data.dimension_scores !== "object") {
    if (import.meta.env.DEV) {
      console.error("[completeAttempt] dimension_scores is missing or invalid after update:", {
        dimension_scores: data.dimension_scores,
        type: typeof data.dimension_scores,
        fullData: data,
      });
    }
    throw new Error("Update did not set dimension_scores");
  }

  if (!data.completed_at) {
    if (import.meta.env.DEV) {
    console.error("[completeAttempt] completed_at is still null after update:", data);
    }
    throw new Error("Update did not set completed_at");
  }

  if (import.meta.env.DEV) {
  console.log("[completeAttempt] Success - Attempt completed:", {
    id: data.id,
    status: data.status,
    total_score: data.total_score,
    score_band_id: data.score_band_id,
      dimension_scores: data.dimension_scores,
    completed_at: data.completed_at,
  });
}

  // A) CRITICAL VERIFICATION: Re-fetch to verify dimension_scores was actually saved
  const { data: verifyData, error: verifyError } = await supabase
    .from("attempts")
    .select("*")
    .eq("id", payload.attemptId)
    .single();

  if (verifyError || !verifyData) {
    const errorMsg = `Failed to verify attempt completion: ${verifyError?.message || "No data returned"}`;
    if (import.meta.env.DEV) {
      console.error("[completeAttempt] ❌ Verification failed:", {
        attemptId: payload.attemptId,
        error: verifyError,
      });
    }
    throw new Error(errorMsg);
  }

  // Log verification data for debugging
  if (import.meta.env.DEV) {
    console.log("[completeAttempt] 🔍 Verification data:", {
      attempt_id: verifyData.id,
      dimension_scores: verifyData.dimension_scores,
      dimension_scores_type: typeof verifyData.dimension_scores,
      dimension_scores_is_object: typeof verifyData.dimension_scores === "object",
      total_score: verifyData.total_score,
      answers: verifyData.answers,
      status: verifyData.status,
    });
  }

  // Critical check: dimension_scores must exist and be an object
  if (!verifyData.dimension_scores || typeof verifyData.dimension_scores !== "object") {
    const errorMsg = `CRITICAL: dimension_scores not saved! Attempt ID: ${payload.attemptId}`;
    if (import.meta.env.DEV) {
      console.error(`[completeAttempt] ❌ ${errorMsg}`, {
        attemptId: payload.attemptId,
        payloadDimensionScores: payload.dimensionScores,
        savedDimensionScores: verifyData.dimension_scores,
        savedDimensionScoresType: typeof verifyData.dimension_scores,
        verifyDataKeys: Object.keys(verifyData),
      });
      throw new Error(errorMsg);
    } else {
      console.warn(`[completeAttempt] ⚠️ ${errorMsg}`);
    }
  }

  // Return verified data
  return {
    id: verifyData.id,
    status: verifyData.status,
    total_score: verifyData.total_score || 0,
    score_band_id: verifyData.score_band_id,
    dimension_scores: (verifyData.dimension_scores as Record<string, number>) || {},
    completed_at: verifyData.completed_at || new Date().toISOString(),
  };
}

/**
 * Marks an attempt as abandoned (best-effort, non-blocking).
 * Only marks abandoned if completed_at is null AND status IN ('started','in_progress').
 * Prevents overwriting completed attempts.
 * Clears completion-only fields when abandoning.
 */
export async function markAttemptAbandoned(attemptId: string, lastQuestionIndex?: number): Promise<void> {
  try {
    // First, fetch current attempt status and completed_at to check if already completed
    const { data: currentAttempt, error: fetchError } = await supabase
      .from("attempts")
      .select("id, status, completed_at")
      .eq("id", attemptId)
      .single();

    if (fetchError) {
      if (import.meta.env.DEV) {
        console.error("[markAttemptAbandoned] Error fetching attempt status (non-blocking):", {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code,
        });
      }
      // Don't throw - this is best-effort
      return;
    }

    if (!currentAttempt) {
      if (import.meta.env.DEV) {
        console.warn("[markAttemptAbandoned] Attempt not found:", attemptId);
      }
      return;
    }

    // Only mark abandoned if completed_at is null AND status IN ('started','in_progress')
    if (currentAttempt.completed_at !== null) {
      if (import.meta.env.DEV) {
        console.log("[markAttemptAbandoned] Attempt already completed, skipping abandon:", attemptId);
      }
      return;
    }

    if (currentAttempt.status !== "started" && currentAttempt.status !== "in_progress") {
      if (import.meta.env.DEV) {
        console.log("[markAttemptAbandoned] Attempt status is not 'started' or 'in_progress', skipping abandon:", {
          attemptId,
          status: currentAttempt.status,
        });
      }
      return;
    }

    const previousStatus = currentAttempt.status;

    // Build update payload - clear completion-only fields
    const updatePayload: {
      status: string;
      abandoned_at: string;
      total_score: null;
      dimension_scores: null;
      score_band_id: null;
      completed_at: null;
      last_question_index?: number;
    } = {
      status: "abandoned",
      abandoned_at: new Date().toISOString(),
      total_score: null,
      dimension_scores: null,
      score_band_id: null,
      completed_at: null,
    };

    // Include last_question_index if provided
    if (lastQuestionIndex !== undefined) {
      updatePayload.last_question_index = lastQuestionIndex;
    }

    if (import.meta.env.DEV) {
      console.log("[markAttemptAbandoned] [DEV] Marking attempt as abandoned:", {
        attempt_id: attemptId,
        previous_status: previousStatus,
        update_payload: JSON.stringify(updatePayload, null, 2),
      });
    }

    const { error } = await supabase
      .from("attempts")
      .update(updatePayload)
      .eq("id", attemptId)
      .eq("status", previousStatus) // Only update if status hasn't changed (optimistic locking)
      .is("completed_at", null); // Only update if completed_at is null

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[markAttemptAbandoned] Error (non-blocking):", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      }
      // Don't throw - this is best-effort
    } else {
      if (import.meta.env.DEV) {
        console.log("[markAttemptAbandoned] Success");
      }
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[markAttemptAbandoned] Unexpected error (non-blocking):", err);
    }
    // Don't throw - this is best-effort
  }
}

/**
 * Creates a complete attempt with all data in one operation.
 * This is a convenience function that combines startAttempt and completeAttempt.
 */
export async function createAttempt(payload: AttemptPayload): Promise<CreatedAttempt | null> {
  try {
    // Start the attempt
    const attemptId = await startAttempt({
      quizId: payload.quizId,
      participantId: payload.userId,
      userFirstName: payload.firstName,
      userLastName: payload.lastName || null,
      userPhone: payload.phone || null,
      userAgent: navigator.userAgent,
    });

    // Update answers
    await updateAttemptAnswers({
      attemptId,
      answers: payload.answers,
      lastQuestionIndex: payload.answers.length - 1,
    });

    // Complete the attempt
    const completed = await completeAttempt({
      attemptId,
      totalScore: payload.totalScore,
      dimensionScores: payload.dimensionScores,
      scoreBandId: payload.bandId,
    });

    return {
      id: completed.id,
      createdAt: completed.completed_at,
    };
  } catch (error) {
    console.error("[createAttempt] Error:", error);
    return null;
  }
}
