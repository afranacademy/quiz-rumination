import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MyMindPatternPdf } from "@/pdf/templates/MyMindPatternPdf";
import { buildAndDownloadPdf } from "@/pdf/buildPdf";

interface DevPanelProps {
  attemptId: string | null;
  participantId: string | null;
  finalizationStatus?: string | null;
  completedAttemptData?: any | null;
}

export function DevPanel({ attemptId, participantId, finalizationStatus, completedAttemptData }: DevPanelProps) {
  const [attemptData, setAttemptData] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Use completedAttemptData if provided (from update response), otherwise fetch
  useEffect(() => {
    if (completedAttemptData) {
      setAttemptData(completedAttemptData);
      setLastOperation("Updated from completeAttempt response");
      setLastError(null);
      return;
    }

    if (!attemptId || !import.meta.env.DEV) return;

    // Fetch attempt data (no status filter - fetch by id only)
    const fetchAttempt = async () => {
      try {
        const { data, error } = await supabase
          .from("attempts")
          .select("id, status, total_score, score_band_id, dimension_scores, participant_id")
          .eq("id", attemptId)
          .single();

        if (error) {
          setLastError(`Fetch error: ${error.message}`);
          return;
        }

        setAttemptData(data);
        setLastError(null);
        setLastOperation("Fetched attempt data");
      } catch (err) {
        setLastError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    fetchAttempt();
    const interval = setInterval(fetchAttempt, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [attemptId, completedAttemptData]);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white text-xs p-4 rounded-lg font-mono max-w-sm z-50 border border-white/20">
      <div className="font-bold mb-2 text-yellow-400">Dev Panel</div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Attempt ID:</span>{" "}
          {attemptId ? attemptId.substring(0, 8) + "..." : "N/A"}
        </div>
        <div>
          <span className="text-gray-400">Participant:</span>{" "}
          {participantId ? participantId.substring(0, 8) + "..." : "N/A"}
        </div>
        {attemptData && (
          <>
            <div>
              <span className="text-gray-400">Status:</span> {attemptData.status || "N/A"}
            </div>
            <div>
              <span className="text-gray-400">Score:</span> {attemptData.total_score ?? "N/A"}
            </div>
            <div>
              <span className="text-gray-400">Band ID:</span>{" "}
              {attemptData.score_band_id !== null && attemptData.score_band_id !== undefined
                ? String(attemptData.score_band_id)
                : "N/A"}
            </div>
            {attemptData.dimension_scores && (
              <div>
                <span className="text-gray-400">Dimensions:</span>{" "}
                {Object.keys(attemptData.dimension_scores).length} dims
              </div>
            )}
          </>
        )}
        {finalizationStatus && (
          <div className={`mt-2 ${
            finalizationStatus.includes("✅") 
              ? "text-green-400" 
              : finalizationStatus.includes("Error") 
              ? "text-red-400" 
              : "text-yellow-400"
          }`}>
            {finalizationStatus}
          </div>
        )}
        {lastOperation && (
          <div className="text-green-400 mt-2">Last: {lastOperation}</div>
        )}
        {lastError && (
          <div className="text-red-400 mt-2 break-words">Error: {lastError}</div>
        )}
      </div>
      
      {/* DEV-ONLY: PDF v2 Test Button */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <button
          onClick={async () => {
            setIsGeneratingPdf(true);
            try {
              const now = new Date();
              const pdfDoc = <MyMindPatternPdf firstName="تست" now={now} />;
              await buildAndDownloadPdf(pdfDoc, "my-mind-pattern.pdf");
              setLastOperation("PDF v2 generated and downloaded");
              setLastError(null);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              setLastError(`PDF v2 Error: ${errorMsg}`);
              console.error("[DevPanel] PDF v2 generation error:", error);
            } finally {
              setIsGeneratingPdf(false);
            }
          }}
          disabled={isGeneratingPdf}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded font-mono"
        >
          {isGeneratingPdf ? "Generating PDF v2..." : "Test PDF v2 (My Mind Pattern)"}
        </button>
      </div>
    </div>
  );
}

