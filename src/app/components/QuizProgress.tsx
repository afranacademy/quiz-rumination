import { Progress } from "./ui/progress";

interface QuizProgressProps {
  current: number;
  total: number;
}

export function QuizProgress({ current, total }: QuizProgressProps) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground/80">
        <span>سوال {current} از {total}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} className="h-1.5 bg-white/10" />
    </div>
  );
}
