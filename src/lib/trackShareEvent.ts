import { supabase } from "./supabaseClient";

export async function trackShareEvent(params: {
  cardType: "my_mind" | "compare_minds";
  action: "copy_link" | "share_text" | "native_share";
  attemptId?: string | null;
  compareSessionId?: string | null;
  inviteToken?: string | null;
}): Promise<void> {
  try {
    // Get current auth session for participant_id
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const participantId = session?.user?.id ?? null;

    // Build payload
    const payload = {
      card_type: params.cardType,
      share_action: params.action,
      attempt_id: params.attemptId || null,
      compare_session_id: params.compareSessionId || null,
      invite_token: params.inviteToken || null,
      participant_id: participantId,
      page_path: typeof window !== "undefined" 
        ? window.location.pathname + window.location.search 
        : null,
      user_agent: typeof navigator !== "undefined" 
        ? navigator.userAgent 
        : null,
      referrer: typeof document !== "undefined" 
        ? (document.referrer || null) 
        : null,
    };

    if (import.meta.env.DEV) {
      console.log("[trackShareEvent] inserting:", payload);
    }

    const { error } = await supabase
      .from("card_share_events")
      .insert(payload);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[trackShareEvent] error:", error);
      }
      // Swallow error - don't throw
      return;
    }

    if (import.meta.env.DEV) {
      console.log("[trackShareEvent] success");
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[trackShareEvent] error:", error);
    }
    // Swallow error - don't throw
  }
}

