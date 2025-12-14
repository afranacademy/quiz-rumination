import { Button } from "@/app/components/ui/button";
import { Icon } from "./Icon";

interface SocialFeatureCardProps {
  title: string;
  description: string;
  icon: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick?: () => void;
  }>;
  emphasis?: "normal" | "warm" | "primary";
}

export function SocialFeatureCard({
  title,
  description,
  icon,
  primaryAction,
  secondaryActions,
  emphasis = "normal",
}: SocialFeatureCardProps) {
  const emphasisClasses = {
    normal: "bg-white/8 border-white/15",
    warm: "bg-white/10 border-white/20",
    primary: "bg-white/12 border-white/25",
  };

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl shadow-lg shadow-black/10 p-4 sm:p-5 md:p-6 text-right transition-all hover:brightness-105 ${emphasisClasses[emphasis]}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 mt-0.5">
          <Icon name={icon} className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" title={title} />
        </div>
        <h3 className="text-base sm:text-lg font-medium text-foreground flex-1">{title}</h3>
      </div>

      {/* Description */}
      <p className="text-sm sm:text-base text-foreground/80 leading-7 mb-4 pr-8">
        {description}
      </p>

      {/* Actions */}
      <div className="space-y-2">
        {primaryAction && (
            <Button
              size="lg"
              variant={emphasis === "primary" ? "default" : "outline"}
              className={`w-full rounded-xl min-h-[44px] text-sm sm:text-base ${
                emphasis === "primary"
                  ? "bg-primary/80 hover:bg-primary border-primary/40 text-white"
                  : "bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 text-foreground"
              }`}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </Button>
          )}

        {secondaryActions && secondaryActions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            {secondaryActions.map((action, index) => (
              <div key={index} className="flex-1">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-xl min-h-[44px] text-xs sm:text-sm bg-white/5 border-white/15 backdrop-blur-sm hover:bg-white/10 text-foreground/90"
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
