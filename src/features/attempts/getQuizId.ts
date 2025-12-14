import { supabase } from "@/lib/supabaseClient";

// Cache quiz_id in memory
let quizIdCache: string | null = null;
let quizIdCachePromise: Promise<string> | null = null;

/**
 * Gets the quiz_id for the 'rumination' quiz.
 * Fetches from Supabase and caches the result.
 */
export async function getQuizId(): Promise<string> {
  if (quizIdCache !== null) {
    return quizIdCache;
  }

  // If already fetching, return the same promise
  if (quizIdCachePromise !== null) {
    return quizIdCachePromise;
  }

  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  quizIdCachePromise = (async () => {
    const { data, error } = await supabase
      .from("quizzes")
      .select("id")
      .eq("slug", "rumination")
      .single();

    if (error) {
      console.error("[getQuizId] Error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      quizIdCachePromise = null;
      throw new Error(`Failed to fetch quiz: ${error.message}`);
    }

    if (!data || !data.id) {
      console.error("[getQuizId] Quiz not found");
      quizIdCachePromise = null;
      throw new Error("Rumination quiz not found in database");
    }

    console.log("[getQuizId] Quiz ID:", data.id);
    quizIdCache = data.id;
    return quizIdCache;
  })();

  return quizIdCachePromise;
}

/**
 * Clears the quiz_id cache (useful for testing).
 */
export function clearQuizIdCache(): void {
  quizIdCache = null;
  quizIdCachePromise = null;
}

