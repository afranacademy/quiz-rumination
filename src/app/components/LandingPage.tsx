import { FileText, Clock, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { BrandLogo } from "@/components/BrandLogo";

interface LandingPageProps {
  onStart: () => void;
  formData: {
    firstName: string;
    lastName: string;
    mobile: string;
  };
  errors: {
    firstName?: string;
    lastName?: string;
    mobile?: string;
  };
  onFieldChange: (field: "firstName" | "lastName" | "mobile", value: string) => void;
  isLoading?: boolean;
}

export function LandingPage({ onStart, formData, errors, onFieldChange, isLoading = false }: LandingPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-md mx-auto">
        {/* Single Premium Glass Container */}
        <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <BrandLogo size="md" />
          </div>

          {/* Title Section */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl text-foreground font-medium leading-tight">
              آزمون سنجش نشخوار فکری
              <span className="block text-lg sm:text-xl md:text-2xl text-muted-foreground mt-2 font-normal">
                (ذهن وراج)
              </span>
            </h1>
            
            <p className="text-sm sm:text-base text-muted-foreground leading-7 max-w-md mx-auto px-2">
              این آزمون به شما کمک می‌کند تا الگوهای فکری خود را بهتر بشناسید و درک عمیق‌تری از ذهن خود پیدا کنید.
            </p>
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <FileText className="w-5 h-5 text-primary/80" />
              <span className="text-xs text-foreground/80">۱۲ سوال</span>
            </div>
            
            <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Clock className="w-5 h-5 text-primary/80" />
              <span className="text-xs text-foreground/80">۳ دقیقه</span>
            </div>
            
            <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Lock className="w-5 h-5 text-primary/80" />
              <span className="text-xs text-foreground/80">محرمانه</span>
            </div>
          </div>

          {/* Form Section */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onStart();
            }}
            className="w-full space-y-5 text-right"
          >
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm text-foreground/90">
                نام
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => onFieldChange("firstName", e.target.value)}
                className="text-right rounded-2xl text-base bg-white/10 border-white/20 backdrop-blur-sm focus:bg-white/15 focus:border-primary/40"
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive/90 mt-1 text-right">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm text-foreground/90">
                نام خانوادگی
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => onFieldChange("lastName", e.target.value)}
                className="text-right rounded-2xl text-base bg-white/10 border-white/20 backdrop-blur-sm focus:bg-white/15 focus:border-primary/40"
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive/90 mt-1 text-right">{errors.lastName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-sm text-foreground/90">
                شماره موبایل
              </Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => onFieldChange("mobile", e.target.value)}
                placeholder="مثلاً 09123456789"
                className="text-right rounded-2xl text-base bg-white/10 border-white/20 backdrop-blur-sm focus:bg-white/15 focus:border-primary/40"
                aria-invalid={!!errors.mobile}
              />
              <p className="text-xs text-muted-foreground/70 text-right mt-1">
                برای ایران با ۰۹ یا +۹۸ — برای خارج از ایران با +کدکشور
              </p>
              {errors.mobile && (
                <p className="text-xs text-destructive/90 mt-1 text-right">{errors.mobile}</p>
              )}
            </div>

            {/* Primary CTA */}
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full px-6 py-5 text-base sm:text-lg rounded-2xl bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg shadow-primary/20 border border-primary/30 disabled:opacity-50"
            >
              {isLoading ? "در حال آماده‌سازی..." : "شروع آزمون"}
            </Button>
          </form>

          {/* Trust Note */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-center text-muted-foreground/70 leading-6">
              <span className="font-medium text-foreground/80">توجه:</span> این ابزار آموزشی است و جایگزین تشخیص بالینی نیست.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
