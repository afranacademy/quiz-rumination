/**
 * Safe, non-blocking behavior tracking layer
 * All tracking is gated behind VITE_ENABLE_BEHAVIOR_TRACKING feature flag
 * NEVER throws errors - failures are logged only
 */

import { supabase } from "./supabaseClient";

const ENABLED = import.meta.env.VITE_ENABLE_BEHAVIOR_TRACKING === "true";

/**
 * Track a behavioral event
 * Never throws - failures are logged only
 */
export async function trackEvent(payload: {
  attempt_id: string | null;
  event_type: "open" | "view_card" | "click_cta" | "copy_text" | "share" | "download_pdf";
  card_type?: string;
  source_page?: "result" | "compare";
  source_card?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  if (!ENABLED) {
    return;
  }

  if (!payload.attempt_id) {
    console.error("[track_failed] Missing attempt_id", payload);
    return;
  }

  try {
    const { error } = await supabase.rpc("rpc_track_event", {
      p_attempt_id: payload.attempt_id,
      p_event_type: payload.event_type,
      p_card_type: payload.card_type || null,
      p_source_page: payload.source_page || null,
      p_source_card: payload.source_card || null,
      p_metadata: payload.metadata || null,
    });

    if (error) {
      console.error("[track_failed]", payload, error);
    }
  } catch (err) {
    console.error("[track_failed]", payload, err);
  }
}

/**
 * Submit an answer (non-blocking)
 */
export async function submitAnswer(
  attemptId: string | null | undefined,
  questionIndex: number,
  choiceValue: number
): Promise<void> {
  if (!ENABLED) {
    return;
  }

  if (!attemptId) {
    console.error("[attempt_id_missing]");
    return;
  }

  try {
    const { error } = await supabase.rpc("rpc_submit_answer", {
      p_attempt_id: attemptId,
      p_question_index: questionIndex,
      p_choice_value: choiceValue,
    });

    if (error) {
      console.error("[answers_write_failed]", { attemptId, questionIndex, error });
    }
  } catch (err) {
    console.error("[answers_write_failed]", { attemptId, questionIndex, error: err });
  }
}

/**
 * Complete attempt (non-blocking)
 * Returns result for logging, but never throws
 */
export async function completeAttemptRpc(attemptId: string | null | undefined): Promise<any> {
  if (!ENABLED) {
    return null;
  }

  if (!attemptId) {
    console.error("[attempt_id_missing]");
    return null;
  }

  try {
    const { data, error } = await supabase.rpc("rpc_complete_attempt", {
      p_attempt_id: attemptId,
    });

    if (error) {
      console.error("[complete_attempt_failed]", { attemptId, error });
      return null;
    }

    console.log("[complete_attempt_result]", data);
    return data;
  } catch (err) {
    console.error("[complete_attempt_failed]", { attemptId, error: err });
    return null;
  }
}

/**
 * DEV-ONLY: Print proof report for a completed attempt
 */
export async function printDevProof(attemptId: string): Promise<void> {
  if (!import.meta.env.DEV || !ENABLED) {
    return;
  }

  try {
    // Get attempt_answers count
    const { data: answersData, error: answersError } = await supabase
      .from("attempt_answers")
      .select("id", { count: "exact" })
      .eq("attempt_id", attemptId);

    const answersCount = answersError ? 0 : (answersData?.length || 0);

    // Get attempt data
    const { data: attemptData, error: attemptError } = await supabase
      .from("attempts")
      .select("id, total_score, mental_pattern")
      .eq("id", attemptId)
      .maybeSingle();

    // Get last events
    const { data: eventsData, error: eventsError } = await supabase
      .from("card_events")
      .select("event_type, created_at")
      .eq("attempt_id", attemptId)
      .order("created_at", { ascending: false })
      .limit(10);

    console.group(`[DEV PROOF] Attempt ${attemptId.substring(0, 8)}...`);
    console.log("attemptId:", attemptId);
    console.log("attempt_answers count:", answersCount);
    console.log("attempts.total_score:", attemptData?.total_score ?? "NULL");
    console.log("attempts.mental_pattern:", attemptData?.mental_pattern ?? "NULL");
    console.log("last events:", eventsData || []);
    if (answersError) console.error("answers query error:", answersError);
    if (attemptError) console.error("attempt query error:", attemptError);
    if (eventsError) console.error("events query error:", eventsError);
    console.groupEnd();
  } catch (err) {
    console.error("[dev_proof_failed]", err);
  }
}

