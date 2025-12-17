import type { LikertValue } from "../quiz/types";
import { scoreAfranR14 } from "../quiz/scoring/scoreAfranR14";
import { getLevel } from "../quiz/scoring/levelsAfranR14";

// Lazy load Supabase to avoid build errors if not configured
let supabaseClient: any = null;

async function getSupabaseClient() {
  if (supabaseClient !== null) {
    return supabaseClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (error) {
    console.warn("Supabase not available:", error);
    return null;
  }
}

export async function saveAttempt(input: {
  answers: Record<number, LikertValue>;
  firstName?: string;
  inviteToken?: string;
}): Promise<{ attemptId: string } | null> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    console.warn("Supabase not configured, skipping attempt save");
    return null;
  }

  try {
    const breakdown = scoreAfranR14(input.answers);
    const level = getLevel(breakdown.total);
    
    const answersArray: LikertValue[] = [];
    for (let i = 1; i <= 12; i++) {
      answersArray.push(input.answers[i] ?? 0);
    }

    // Calculate scored answers (reverse items 11 and 12)
    const scoredAnswers: LikertValue[] = [...answersArray];
    // Items 11 and 12 are reverse-scored (indices 10 and 11)
    const reverseLikert = (v: LikertValue): LikertValue => {
      const map: Record<LikertValue, LikertValue> = { 0: 4, 1: 3, 2: 2, 3: 1, 4: 0 };
      return map[v];
    };
    scoredAnswers[10] = reverseLikert(answersArray[10]);
    scoredAnswers[11] = reverseLikert(answersArray[11]);

    const { data, error } = await supabase
      .from("attempts")
      .insert({
        quiz_slug: "rumination",
        first_name: input.firstName || null,
        answers_raw: answersArray,
        answers_scored: scoredAnswers,
        total_score: breakdown.total,
        level: level,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save attempt:", error);
      return null;
    }

    // If this is for an invite, link it
    if (input.inviteToken && data.id) {
      const API_URL = import.meta.env.VITE_NETLIFY_FUNCTIONS_URL || "";
      try {
        await fetch(`${API_URL}/.netlify/functions/linkInvite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: input.inviteToken,
            inviteeAttemptId: data.id,
          }),
        });
      } catch (err) {
        console.error("Failed to link invite:", err);
      }
    }

    return { attemptId: data.id };
  } catch (error) {
    console.error("Error saving attempt:", error);
    return null;
  }
}
