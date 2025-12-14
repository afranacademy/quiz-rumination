import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ResultPage as ResultPageComponent } from "@/app/components/ResultPage";
import type { LevelKey } from "@/features/quiz/types";
import type { QuizIntake } from "@/features/quiz/types";

interface QuizResult {
  total: number;
  maxTotal: number;
  level: LevelKey;
  createdAt: string;
}

// DEV-ONLY: Preview mode mock scores
const PREVIEW_SCORES: Record<"low" | "medium" | "high", number> = {
  low: 10,
  medium: 26,
  high: 42,
};

// DEV-ONLY: Mock intake for preview
const MOCK_INTAKE = { firstName: "کاربر تست" };

export default function ResultPage() {
  const navigate = useNavigate();
  const params = useParams<{ level?: string }>();
  const [searchParams] = useSearchParams();
  const [score, setScore] = useState<number | null>(null);
  const [level, setLevel] = useState<LevelKey | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    // DEV-ONLY: Check for route param first (e.g., /result/low)
    const routeLevel = params.level;
    if (routeLevel && (routeLevel === "low" || routeLevel === "medium" || routeLevel === "high")) {
      // Preview mode via route: use mock data
      const mockScore = PREVIEW_SCORES[routeLevel];
      setScore(mockScore);
      setLevel(routeLevel);
      setFirstName(MOCK_INTAKE.firstName);
      setIsPreviewMode(true);
      return;
    }

    // DEV-ONLY: Check for preview query parameter (e.g., /result?preview=low)
    const previewParam = searchParams.get("preview");
    if (previewParam && (previewParam === "low" || previewParam === "medium" || previewParam === "high")) {
      // Preview mode via query: use mock data
      const mockScore = PREVIEW_SCORES[previewParam];
      setScore(mockScore);
      setLevel(previewParam);
      setFirstName(MOCK_INTAKE.firstName);
      setIsPreviewMode(true);
      return;
    }

    // Production mode: read from sessionStorage
    setIsPreviewMode(false);
    try {
      const resultData = sessionStorage.getItem("quiz_result_v1");
      if (resultData) {
        const parsed = JSON.parse(resultData) as QuizResult;
        if (parsed.total !== undefined && parsed.level && parsed.maxTotal === 48) {
          setScore(parsed.total);
          setLevel(parsed.level);
        }
      }

      const intakeData = sessionStorage.getItem("quiz_intake_v1");
      if (intakeData) {
        const parsed = JSON.parse(intakeData) as QuizIntake;
        if (parsed.firstName) {
          setFirstName(parsed.firstName);
        }
      }
    } catch (error) {
      console.error("Failed to read from sessionStorage:", error);
    }
  }, [params, searchParams]);

  const handleRetake = () => {
    sessionStorage.removeItem("quiz_result_v1");
    navigate("/");
  };

  if (score === null || level === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">نتیجه‌ای برای نمایش پیدا نشد.</p>
          <button
            onClick={handleRetake}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  return <ResultPageComponent score={score} level={level} firstName={firstName} onRetake={handleRetake} isPreviewMode={isPreviewMode} />;
}
