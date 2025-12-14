import { supabase } from "@/lib/supabaseClient";

type ScoreBand = {
  id: number;
  min_score: number;
  max_score: number;
  order_index?: number;
};

// Cache bands in memory
let bandsCache: ScoreBand[] | null = null;
let bandsCachePromise: Promise<ScoreBand[]> | null = null;

/**
 * Fetches score bands from Supabase and caches them.
 * Returns cached bands on subsequent calls.
 */
async function fetchScoreBands(): Promise<ScoreBand[]> {
  if (bandsCache !== null) {
    return bandsCache;
  }

  // If already fetching, return the same promise
  if (bandsCachePromise !== null) {
    return bandsCachePromise;
  }

    bandsCachePromise = (async () => {
      const { data, error } = await supabase
        .from("score_bands")
        .select("id, min_score, max_score, order_index")
        .order("order_index", { ascending: true });

      if (error) {
        console.error("[fetchScoreBands] Error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        bandsCachePromise = null;
        throw new Error(`Failed to fetch score bands: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.error("[fetchScoreBands] No bands found");
        bandsCachePromise = null;
        throw new Error("No score bands found in database");
      }

      // Log raw data for debugging
      console.log("[fetchScoreBands] Raw data from Supabase:", JSON.stringify(data, null, 2));

      // Validate and normalize the data
      const normalizedBands: ScoreBand[] = data.map((band: any, index: number) => {
        // Ensure id is a number (integer 1-6)
        const id = Number(band.id);
        
        // Log each band for debugging (first time only)
        if (bandsCache === null && index < 3) {
          console.log(`[fetchScoreBands] Band ${index + 1}:`, {
            rawId: band.id,
            idType: typeof band.id,
            normalizedId: id,
            min_score: band.min_score,
            max_score: band.max_score,
            order_index: band.order_index,
            fullBand: band,
          });
        }

        return {
          id,
          min_score: Number(band.min_score),
          max_score: Number(band.max_score),
          order_index: band.order_index ? Number(band.order_index) : undefined,
        };
      });

      bandsCache = normalizedBands;
      console.log("[fetchScoreBands] Loaded", bandsCache.length, "bands");
      console.log("[fetchScoreBands] All band IDs:", bandsCache.map(b => ({ id: b.id, type: typeof b.id, min: b.min_score, max: b.max_score })));
      return bandsCache;
    })();

  return bandsCachePromise;
}

/**
 * Calculates the score_band_id for a given total_score.
 * Fetches score_bands from Supabase and caches them.
 * Returns the band_id where min_score <= total_score <= max_score.
 * Uses order_index for ordering if available.
 * Returns null if no band is found (does not throw).
 */
export async function calculateBand(totalScore: number): Promise<number | null> {
  try {
    const bands = await fetchScoreBands();

    // Find the band that contains this score
    for (const band of bands) {
      if (totalScore >= band.min_score && totalScore <= band.max_score) {
        // Ensure id is a number (integer 1-6)
        const bandId = Number(band.id);
        
        // Validate it's a valid integer
        if (!Number.isInteger(bandId) || bandId < 1 || bandId > 6) {
          console.error("[calculateBand] Invalid band id (expected 1-6):", {
            rawId: band.id,
            normalizedId: bandId,
            type: typeof band.id,
            band: band,
          });
          // Continue to next band instead of returning invalid ID
          continue;
        }

        console.log("[calculateBand] Found band:", {
          id: bandId,
          min_score: band.min_score,
          max_score: band.max_score,
          forScore: totalScore,
        });
        return bandId;
      }
    }

    // No band found - return null (don't fail)
    console.warn(`[calculateBand] No band found for score ${totalScore}, returning null`);
    return null;
  } catch (error) {
    // If fetching bands fails, log but don't throw - return null
    console.error("[calculateBand] Error fetching bands, returning null:", error);
    return null;
  }
}

/**
 * Clears the bands cache (useful for testing or refresh).
 */
export function clearBandsCache(): void {
  bandsCache = null;
  bandsCachePromise = null;
}
