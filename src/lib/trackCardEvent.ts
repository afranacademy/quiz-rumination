import { supabase } from "./supabaseClient";

/**
 * Card type constants for tracking
 */
export const CARD_TYPES = {
  CTA_MIND_VARAJ_COURSE: "cta_mind_varaj_course",
  CTA_PERSONAL_RESULT_CARD: "cta_personal_result_card",
  CTA_MY_MIND_PATTERN_CARD: "cta_my_mind_pattern_card",
  CTA_COMPARE_MINDS: "cta_compare_minds",
  PDF_COMPARE: "pdf_compare",
  PDF_MY_MIND_PATTERN: "pdf_my_mind_pattern",
} as const;

/**
 * Event type constants
 */
export const EVENT_TYPES = {
  CLICK: "click",
  DOWNLOAD: "download",
} as const;

/**
 * Fire-and-forget tracking of card events
 * Does not block navigation/download and handles errors silently
 */
export async function trackCardEvent(params: {
  cardType: string;
  eventType: "click" | "download";
  attemptId?: string | null;
  compareSessionId?: string | null;
  participantId?: string | null;
}): Promise<void> {
  try {
    if (!supabase) {
      if (import.meta.env.DEV) {
        console.warn("[trackCardEvent] Supabase client not initialized");
      }
      return;
    }

    // DEV: Warn if attemptId is missing (but still track the event)
    if (import.meta.env.DEV && !params.attemptId) {
      console.warn("[trackCardEvent] ⚠️ Tracking event missing attemptId", {
        cardType: params.cardType,
        eventType: params.eventType,
        compareSessionId: params.compareSessionId,
        participantId: params.participantId,
      });
    }

    await supabase.rpc("track_card_event", {
      p_card_type: params.cardType,
      p_event_type: params.eventType,
      p_participant_id: params.participantId || null,
      p_attempt_id: params.attemptId || null,
      p_compare_session_id: params.compareSessionId || null,
      p_platform: "web",
    });
  } catch (error) {
    // Silently fail - tracking should never block user actions
    if (import.meta.env.DEV) {
      console.warn("[trackCardEvent] Failed to track event:", error);
    }
  }
}

