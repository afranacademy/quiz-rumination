import { useNavigate, useSearchParams } from "react-router-dom";
import { QuizPage as QuizPageComponent } from "@/app/components/QuizPage";
import { scoreAfranR14 } from "@/features/quiz/scoring/scoreAfranR14";
import { getLevel } from "@/features/quiz/scoring/levelsAfranR14";
import { saveAttempt } from "@/features/compare/saveAttempt";
import type { LikertValue, LevelKey } from "@/features/quiz/types";

export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const handleComplete = async (quizAnswers: Record<number, LikertValue>) => {
    try {
      const breakdown = scoreAfranR14(quizAnswers);
      const level = getLevel(breakdown.total);
      const result = {
        total: breakdown.total,
        maxTotal: 48,
        level: level as LevelKey,
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem("quiz_result_v1", JSON.stringify(result));
      
      // Store raw answers for mind pattern feature
      const answersArray: LikertValue[] = [];
      for (let i = 1; i <= 12; i++) {
        answersArray.push(quizAnswers[i] ?? 0);
      }
      sessionStorage.setItem("quiz_answers_v1", JSON.stringify(answersArray));

      // Get firstName from intake
      let firstName: string | undefined;
      try {
        const intakeData = sessionStorage.getItem("quiz_intake_v1");
        if (intakeData) {
          const intake = JSON.parse(intakeData);
          firstName = intake.firstName;
        }
      } catch (e) {
        // Ignore
      }

      // Save attempt to Supabase
      const attemptResult = await saveAttempt({
        answers: quizAnswers,
        firstName,
        inviteToken: inviteToken || undefined,
      });

      if (attemptResult?.attemptId) {
        sessionStorage.setItem("quiz_attempt_id", JSON.stringify(attemptResult.attemptId));
      }

      // If this was an invite flow, redirect to compare
      if (inviteToken) {
        navigate(`/compare/${inviteToken}`);
      } else {
        navigate("/result");
      }
    } catch (error) {
      console.error("Failed to save result:", error);
      navigate("/result");
    }
  };

  return <QuizPageComponent onComplete={handleComplete} />;
}
