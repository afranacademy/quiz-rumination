import { cn } from "./ui/utils";

type Level = "low" | "medium" | "high";

interface ResultBadgeProps {
  level: Level;
  className?: string;
}

const levelConfig = {
  low: {
    label: "سطح کم",
    bgColor: "bg-emerald-500/25",
    textColor: "text-emerald-300",
    borderColor: "border-emerald-400/50",
    shadowColor: "shadow-emerald-500/20",
  },
  medium: {
    label: "سطح متوسط",
    bgColor: "bg-amber-500/25",
    textColor: "text-amber-300",
    borderColor: "border-amber-400/50",
    shadowColor: "shadow-amber-500/20",
  },
  high: {
    label: "سطح زیاد",
    bgColor: "bg-red-500/25",
    textColor: "text-red-300",
    borderColor: "border-red-400/50",
    shadowColor: "shadow-red-500/20",
  },
};

export function ResultBadge({ level, className }: ResultBadgeProps) {
  const config = levelConfig[level];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-6 py-3 rounded-full border backdrop-blur-sm shadow-lg font-medium",
        config.bgColor,
        config.textColor,
        config.borderColor,
        config.shadowColor,
        className
      )}
    >
      {config.label}
    </span>
  );
}
