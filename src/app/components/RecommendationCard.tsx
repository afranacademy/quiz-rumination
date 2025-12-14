import { LucideIcon } from "lucide-react";
import { cn } from "./ui/utils";

interface RecommendationCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function RecommendationCard({
  icon: Icon,
  title,
  description,
  className,
}: RecommendationCardProps) {
  return (
    <div
      className={cn(
        "p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-200 hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-4 text-right">
        <div className="p-3 rounded-xl bg-primary/10 shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
