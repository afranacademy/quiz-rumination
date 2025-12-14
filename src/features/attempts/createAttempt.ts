import { supabase } from "@/lib/supabaseClient";

export type StartAttemptPayload = {
  quizId: string;
  participantId: string;
  userFirstName: string;
  userLastName: string | null;
  userPhone: string;
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

  const insertPayload = {
    quiz_id: payload.quizId,
    participant_id: payload.participantId,
    user_first_name: payload.userFirstName,
    user_last_name: payload.userLastName,
    user_phone: payload.userPhone,
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

  // First, check current status to prevent overwriting
  const { data: currentAttempt, error: fetchError } = await supabase
    .from("attempts")
    .select("id, status")
    .eq("id", payload.attemptId)
    .single();

  if (fetchError) {
    console.error("[completeAttempt] Error fetching attempt status:", {
      message: fetchError.message,
      details: fetchError.details,
      hint: fetchError.hint,
      code: fetchError.code,
    });
    throw new Error(`Failed to fetch attempt status: ${fetchError.message}`);
  }

  if (!currentAttempt) {
    throw new Error(`Attempt not found: ${payload.attemptId}`);
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
    console.log("[completeAttempt] Completing attempt:", payload.attemptId);
    console.log("[completeAttempt] Pre-update validation:", {
      totalScore: payload.totalScore,
      dimensionScores: payload.dimensionScores,
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

  // Update by id only - we already checked status is not completed/abandoned
  // Use .is("completed_at", null) to ensure we don't overwrite completed attempts
  // Use .select('*') to get all fields including dimension_scores
  // Use .maybeSingle() to handle 0 rows gracefully (idempotent)
  const { data, error } = await supabase
    .from("attempts")
    .update(updatePayload)
    .eq("id", payload.attemptId)
    .is("completed_at", null) // Only update if not already completed
    .select("*")
    .maybeSingle();

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
        const { data: retryData, error: retryError } = await supabase
          .from("attempts")
          .update(updatePayload)
          .eq("id", payload.attemptId)
          .is("completed_at", null)
          .select("*")
          .maybeSingle();

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
    // Update returned 0 rows (already completed) - fetch by id only (no status filter)
    // This is idempotent: treat as success if already completed
    const { data: checkData, error: checkError } = await supabase
      .from("attempts")
      .select("*")
      .eq("id", payload.attemptId)
      .single();
    
    if (checkError) {
      if (import.meta.env.DEV) {
        console.error("[completeAttempt] Error checking attempt status:", {
          code: checkError.code,
          message: checkError.message,
          details: checkError.details,
          hint: checkError.hint,
        });
      }
      throw new Error(`Failed to complete attempt: update returned no data and status check failed. Attempt ID: ${payload.attemptId}`);
    }
    
    if (checkData?.status === "completed") {
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
    const currentStatus = checkData?.status || "unknown";
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

  return data;
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
