import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

interface InviteIdentityGateProps {
  open: boolean;
  inviterName: string | null;
  onSubmit: (data: { firstName: string; lastName?: string; phone: string }) => void;
  onClose?: () => void; // Optional - gate should not be dismissible
}

/**
 * Identity gate for invited users - collects first name, last name (optional), and phone
 * before allowing them to start the quiz.
 */
export function InviteIdentityGate({ open, inviterName, onSubmit, onClose: _onClose }: InviteIdentityGateProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ firstName?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePhone = (phoneValue: string): boolean => {
    // Iran phone format: 09xxxxxxxxx (11 digits starting with 09)
    // Also accept: +989xxxxxxxxx, 00989xxxxxxxxx
    const normalized = phoneValue.replace(/[\s\-\(\)]/g, "");
    const iranPattern = /^(0|0098|\+98)?9\d{9}$/;
    return iranPattern.test(normalized);
  };

  const normalizePhone = (phoneValue: string): string => {
    // Remove all non-digits
    let normalized = phoneValue.replace(/\D/g, "");
    // If starts with +98 or 0098, convert to 0
    if (normalized.startsWith("989")) {
      normalized = "0" + normalized.substring(2);
    } else if (normalized.startsWith("00989")) {
      normalized = "0" + normalized.substring(4);
    }
    return normalized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    
    // Validate
    const newErrors: { firstName?: string; phone?: string } = {};
    
    if (!firstName.trim() || firstName.trim().length < 2) {
      newErrors.firstName = "نام باید حداقل ۲ کاراکتر باشد";
    }
    
    if (!phone.trim()) {
      newErrors.phone = "شماره تماس الزامی است";
    } else if (!validatePhone(phone)) {
      newErrors.phone = "فرمت شماره تماس معتبر نیست (مثال: 09123456789)";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const normalizedPhone = normalizePhone(phone);
      onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: normalizedPhone,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[InviteIdentityGate] Error submitting:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayInviterName = inviterName || "شریک مقایسه‌ات";

  return (
    <Dialog open={open} onOpenChange={() => {}}> {/* Prevent closing */}
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-right">تکمیل اطلاعات</DialogTitle>
          <DialogDescription className="text-right text-sm text-foreground/70 leading-relaxed">
            {displayInviterName} شما را دعوت کرده به تکمیل این آزمون تا ببینی ذهن‌تون چقدر شبیه یا متفاوته.
            <br />
            <span className="text-xs text-foreground/60 mt-2 block">
              بدون قضاوت، فقط برای نمایش اسم در کارت مقایسه
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-right">
              نام <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="مثال: علی"
              className="text-right"
              disabled={isSubmitting}
              autoFocus
            />
            {errors.firstName && (
              <p className="text-xs text-destructive text-right">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-right">
              نام خانوادگی (اختیاری)
            </Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="مثال: احمدی"
              className="text-right"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-right">
              شماره تماس <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثال: 09123456789"
              className="text-right"
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p className="text-xs text-destructive text-right">{errors.phone}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? "در حال ثبت..." : "شروع آزمون"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

