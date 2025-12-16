import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import { RadioCard } from "./RadioCard";
import { QuizProgress } from "./QuizProgress";
import { BrandLogo } from "@/components/BrandLogo";
import { quizDefinition } from "@/features/quiz/data/afranR14";
import type { LikertValue } from "@/features/quiz/types";

interface QuizPageProps {
  onComplete: (answers: Record<number, LikertValue>) => void;
  onAnswerChange?: (answers: Record<number, LikertValue>) => void;
  onExit?: () => void;
  isSubmitting?: boolean;
}

export function QuizPage({ onComplete, onAnswerChange, onExit, isSubmitting = false }: QuizPageProps) {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, LikertValue>>({});
  
  const question = quizDefinition.items[currentQuestion];
  const isLastQuestion = currentQuestion === quizDefinition.items.length - 1;
  const isFirstQuestion = currentQuestion === 0;
  const hasAnswer = answers[question.id] !== undefined;

  const handleAnswer = (value: LikertValue) => {
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);
    onAnswerChange?.(newAnswers);
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handleCompleteQuiz = () => {
    if (!isLastQuestion || !hasAnswer || isSubmitting) {
      return;
    }
    console.log("[CTA] click");
    console.log("[QUIZ] submit started");
    onComplete(answers);
  };

  const handleBack = () => {
    if (isFirstQuestion) {
      // User is exiting the quiz
      onExit?.();
      navigate("/");
    } else {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 pb-24 sm:pb-6" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 6rem))' }}>
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Fixed Calm Header */}
        <div className="mb-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-lg shadow-black/10">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <BrandLogo size="md" />
            </div>
            <div className="text-center mb-3">
              <p className="text-sm sm:text-base text-foreground/95 font-medium mb-1 leading-6">در دو هفته‌ی گذشته، هر جمله تا چه حد درباره‌ی تو صدق می‌کنه؟</p>
            </div>
            <QuizProgress current={currentQuestion + 1} total={quizDefinition.items.length} />
          </div>
        </div>

        {/* Glass Question Card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 space-y-8 flex-1 flex flex-col">
          {/* Question Text */}
          <div className="text-center flex-1 flex items-center">
            <h3 className="text-sm sm:text-base md:text-lg text-foreground leading-6 sm:leading-7 font-normal max-w-full px-2">
              {question.text}
            </h3>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {quizDefinition.scale.labels.map((label, index) => {
              const value = index as LikertValue;
              return (
                <RadioCard
                  key={value}
                  value={String(value)}
                  label={label}
                  selected={answers[question.id] === value}
                  onClick={() => handleAnswer(value)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Glass Action Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-2xl border-t border-white/20 p-4 sm:hidden z-50 shadow-2xl shadow-black/20" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleBack}
            className="flex-1 rounded-2xl min-h-[44px] bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15"
          >
            <ChevronRight className="w-5 h-5 ml-2" />
            قبلی
          </Button>
          
          {isLastQuestion ? (
            <Button
              type="button"
              size="lg"
              disabled={!hasAnswer || isSubmitting}
              onClick={handleCompleteQuiz}
              className="flex-1 rounded-2xl min-h-[44px] bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg shadow-primary/20 border border-primary/30 disabled:opacity-40"
            >
              {isSubmitting ? "در حال ارسال..." : "مشاهده نتیجه"}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={handleNext}
              disabled={!hasAnswer || isSubmitting}
              className="flex-1 rounded-2xl min-h-[44px] bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg shadow-primary/20 border border-primary/30 disabled:opacity-40"
            >
              بعدی
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden sm:block max-w-md mx-auto mt-6">
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleBack}
            className="rounded-2xl min-h-[44px] bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15"
          >
            <ChevronRight className="w-5 h-5 ml-2" />
            قبلی
          </Button>
          
          {isLastQuestion ? (
            <Button
              type="button"
              size="lg"
              disabled={!hasAnswer || isSubmitting}
              onClick={handleCompleteQuiz}
              className="rounded-2xl min-h-[44px] bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg shadow-primary/20 border border-primary/30 disabled:opacity-40"
            >
              {isSubmitting ? "در حال ارسال..." : "مشاهده نتیجه"}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={handleNext}
              disabled={!hasAnswer || isSubmitting}
              className="rounded-2xl min-h-[44px] bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg shadow-primary/20 border border-primary/30 disabled:opacity-40"
            >
              بعدی
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

