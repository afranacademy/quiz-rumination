import { supabase } from "@/lib/supabaseClient";

export type MindProfileTemplate = {
  id: string;
  title: string;
  subtitle: string | null;
  intro: string | null;
  dimension_texts: Record<string, string>; // keyed by dimension key (stickiness, pastBrooding, futureWorry, interpersonal)
  tips: string[]; // array of tip strings
  band_id: number | null;
};

export type GetMindProfileTemplateInput = {
  quizId: string;
  bandId: number | null;
  locale?: "fa" | "en";
};

/**
 * Fetches a mind profile template from the database.
 * 
 * Query logic:
 * - Select by quiz_id and locale (default 'fa')
 * - Prefer template with band_id matching score_band_id
 * - Fallback to template with band_id IS NULL
 * - Order by band_id DESC (nulls last) to prefer specific band over null
 * - Limit to 1 result
 * 
 * @throws Error if no template found or query fails
 */
export async function getMindProfileTemplate(
  input: GetMindProfileTemplateInput
): Promise<MindProfileTemplate> {
  const { quizId, bandId, locale = "fa" } = input;

  if (import.meta.env.DEV) {
    console.log("[getMindProfileTemplate] Fetching template:", {
      quizId,
      bandId,
      locale,
    });
  }

  // Build the OR condition: (band_id = bandId) OR (band_id IS NULL)
  // If bandId is null, only match templates with band_id IS NULL
  const orCondition = bandId !== null
    ? `band_id.eq.${bandId},band_id.is.null`
    : "band_id.is.null";

  const { data, error } = await supabase
    .from("mind_profile_templates")
    .select("id, title, subtitle, intro, dimension_texts, tips, band_id")
    .eq("quiz_id", quizId)
    .eq("locale", locale)
    .or(orCondition)
    .order("band_id", { ascending: false }) // Prefer specific band (higher number) over null
    .limit(1)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[getMindProfileTemplate] Supabase Error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      console.error("[getMindProfileTemplate] Full error object:", error);
      console.error("[getMindProfileTemplate] Query input:", input);
    }
    throw new Error(
      `Failed to fetch mind profile template: ${error.message}`
    );
  }

  if (!data) {
    const errorMsg = `No mind profile template found for quiz_id=${quizId}, band_id=${bandId}, locale=${locale}`;
    if (import.meta.env.DEV) {
      console.error("[getMindProfileTemplate]", errorMsg);
      console.error("[getMindProfileTemplate] Query input:", input);
    }
    throw new Error(errorMsg);
  }

  if (import.meta.env.DEV) {
    console.log("[getMindProfileTemplate] ✅ Template found:", {
      id: data.id,
      title: data.title,
      band_id: data.band_id,
    });
  }

  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle,
    intro: data.intro,
    dimension_texts: (data.dimension_texts as Record<string, string>) || {},
    tips: (data.tips as string[]) || [],
    band_id: data.band_id,
  };
}

