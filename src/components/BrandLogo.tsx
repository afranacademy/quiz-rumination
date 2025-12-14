import { cn } from "@/app/components/ui/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BrandLogo({ size = "md", className }: BrandLogoProps) {
  const sizeClasses = {
    sm: "w-[72px] max-w-[72px]",
    md: "w-[96px] max-w-[96px] sm:w-[100px] sm:max-w-[100px]",
    lg: "w-[110px] max-w-[110px] sm:w-[120px] sm:max-w-[120px]",
  };

  return (
    <img
      src="/logo/logo afran white.png"
      alt="آکادمی افران"
      className={cn(
        "mx-auto block select-none pointer-events-none",
        sizeClasses[size],
        "max-w-[40vw]",
        className
      )}
    />
  );
}
