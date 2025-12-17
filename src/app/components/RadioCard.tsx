import { cn } from "./ui/utils";

interface RadioCardProps {
  value: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function RadioCard({ value: _value, label, selected, onClick }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full p-5 rounded-2xl border transition-all duration-300 text-right min-h-[64px]",
        "hover:border-primary/50 hover:bg-white/15 active:scale-[0.98]",
        selected
          ? "border-primary/60 bg-primary/10 backdrop-blur-sm shadow-lg shadow-primary/10"
          : "border-white/20 bg-white/8 backdrop-blur-sm"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
            selected ? "border-primary" : "border-white/30"
          )}
        >
          {selected && (
            <div className="w-3 h-3 rounded-full bg-primary shadow-sm"></div>
          )}
        </div>
        <span className={cn(
          "flex-1 text-base leading-7",
          selected ? "text-foreground font-medium" : "text-foreground/85"
        )}>
          {label}
        </span>
      </div>
    </button>
  );
}
