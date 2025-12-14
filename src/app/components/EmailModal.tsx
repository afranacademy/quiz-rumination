import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onSubmit: (contact: string) => void;
}

export function EmailModal({ open, onClose, onSkip, onSubmit }: EmailModalProps) {
  const [step, setStep] = useState<"contact" | "otp">("contact");
  const [contactType, setContactType] = useState<"email" | "phone">("email");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");

  const handleSendOTP = () => {
    if (contact.trim()) {
      // Mock OTP sending
      setStep("otp");
    }
  };

  const handleVerifyOTP = () => {
    if (otp.length === 6) {
      // Mock OTP verification
      onSubmit(contact);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">دریافت لینک نتیجه</DialogTitle>
          <DialogDescription className="text-right">
            {step === "contact"
              ? "برای دریافت لینک نتیجه آزمون، ایمیل یا شماره تلفن خود را وارد کنید."
              : "کد تأیید ارسال شده را وارد کنید."}
          </DialogDescription>
        </DialogHeader>

        {step === "contact" ? (
          <div className="space-y-6">
            {/* Contact Type Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                type="button"
                onClick={() => setContactType("email")}
                className={`flex-1 py-2.5 rounded-lg transition-all ${
                  contactType === "email"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Mail className="w-4 h-4 inline ml-2" />
                ایمیل
              </button>
              <button
                type="button"
                onClick={() => setContactType("phone")}
                className={`flex-1 py-2.5 rounded-lg transition-all ${
                  contactType === "phone"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Phone className="w-4 h-4 inline ml-2" />
                تلفن
              </button>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <Label htmlFor="contact" className="text-right block">
                {contactType === "email" ? "آدرس ایمیل" : "شماره تلفن"}
              </Label>
              <Input
                id="contact"
                type={contactType === "email" ? "email" : "tel"}
                placeholder={
                  contactType === "email"
                    ? "example@email.com"
                    : "09123456789"
                }
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="text-right"
                dir={contactType === "email" ? "ltr" : "rtl"}
              />
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleSendOTP}
                className="w-full rounded-xl"
                disabled={!contact.trim()}
              >
                ارسال کد تأیید
              </Button>
              <Button
                variant="ghost"
                onClick={onSkip}
                className="w-full rounded-xl"
              >
                رد کردن و ادامه
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* OTP Input */}
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                کد تأیید به {contact} ارسال شد
              </p>
              
              <div className="flex justify-center" dir="ltr">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleVerifyOTP}
                className="w-full rounded-xl"
                disabled={otp.length !== 6}
              >
                تأیید کد
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep("contact")}
                className="w-full rounded-xl"
              >
                بازگشت
              </Button>
            </div>

            {/* Resend */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleSendOTP}
                className="text-sm text-primary hover:underline"
              >
                ارسال مجدد کد
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}