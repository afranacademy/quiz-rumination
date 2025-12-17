---
name: یکپارچه‌سازی دعوت به آزمون
overview: یکپارچه‌سازی و تمیزسازی عملکرد دعوت به آزمون در سه کارت (خلاصه نتیجه، الگوی ذهنی، مقایسه ذهن‌ها) با ایجاد utilityهای مشترک و اصلاح باگ کپی الگوی ذهنی که فقط ۶-۷ مورد را کپی می‌کند.
todos:
  - id: "1"
    content: "ایجاد utilityهای مشترک در inviteCta.ts: buildInviteCta, buildInviteTextForShare, buildInviteTextForCopy, shareInvite, copyInvite"
    status: pending
  - id: "2"
    content: اصلاح buildMindPatternShareText برای استفاده از همه ۱۲ آیتم (حذف selectedIndices و استفاده از buildMindPatternText)
    status: pending
  - id: "3"
    content: اصلاح SocialShareSection برای استفاده از utilityهای جدید و اضافه کردن UI link
    status: pending
    dependencies:
      - "1"
  - id: "4"
    content: اصلاح MindPatternCard برای استفاده از utilityهای جدید و اضافه کردن UI link در modal
    status: pending
    dependencies:
      - "1"
      - "2"
  - id: "5"
    content: اصلاح buildCompareCardPayload برای استفاده از utilityهای جدید
    status: pending
    dependencies:
      - "1"
  - id: "6"
    content: اصلاح CompareResultPage برای استفاده از utilityهای جدید و اضافه کردن UI link
    status: pending
    dependencies:
      - "1"
      - "5"
  - id: "7"
    content: بهبود copyInvite برای پشتیبانی HTML clipboard (اختیاری - plain text اولویت دارد)
    status: pending
    dependencies:
      - "1"
---

# یکپارچه‌سازی دعوت به آزمون

## مشکلات فعلی

1. **URL در متن**: در همه جاها `formatInviteText(true)` URL را داخل متن قرار می‌دهد
2. **الگوی ذهنی ناقص**: `buildMindPatternShareText` فقط ۷ مورد از ۱۲ مورد را کپی می‌کند (خط ۱۰: `selectedIndices = [0, 2, 4, 6, 8, 10, 11]`)
3. **عدم یکپارچگی**: هر سه کارت به شکل متفاوتی share/copy را پیاده‌سازی کرده‌اند
4. **UI بدون لینک کلیک‌پذیر**: در UI فقط متن نمایش داده می‌شود، لینک کلیک‌پذیر نیست

## راه‌حل

### ۰. بررسی `shareOrCopyText`

- `shareOrCopyText` از قبل `{ title?, text, url? }` را می‌گیرد و درست کار می‌کند
- در Share API: `text` و `url` را جدا می‌فرستد ✅
- در Clipboard fallback: `text` و `url` را ترکیب می‌کند (`${text}\n\n${url}`)
- **نیازی به تغییر `shareOrCopyText` نیست**، فقط باید مطمئن شویم که در همه جاها درست استفاده می‌شود

### ۱. ایجاد Utilityهای مشترک در `src/utils/inviteCta.ts`

- **`buildInviteCta()`**: ساخت متن CTA برای نمایش در UI (بدون URL)
- **`buildInviteTextForShare()`**: ساخت متن برای Share API (فقط CTA تمیز، بدون URL)
- **`buildInviteTextForCopy()`**: ساخت متن برای Copy (CTA + URL در خط جدا)
- **`shareInvite()`**: wrapper برای `shareOrCopyText` که **حتماً** `text` (CTA تمیز) و `url` (INVITE_URL) را **جدا** می‌فرستد
  - استفاده: `shareInvite({ title?, contentText })` 
  - داخلاً: `shareOrCopyText({ title, text: buildInviteTextForShare(), url: CTA_URL })`
- **`copyInvite()`**: wrapper برای copy با خروجی plain text عالی (HTML clipboard بهبود اختیاری)

### ۲. اصلاح `buildMindPatternShareText`

- **حذف `selectedIndices`** و استفاده از همه ۱۲ آیتم
- استفاده از `buildMindPatternText` برای ساخت متن کامل از داده (نه DOM)
- **اضافه کردن guard/filter**: اگر بعضی آیتم‌ها null/undefined باشند، filter(Boolean) یا guard بزن تا متن نصفه نشود
- استفاده از utilityهای جدید برای invite

### ۳. اصلاح سه کارت

#### الف) خلاصه نتیجه (`SocialShareSection.tsx`)

- استفاده از `buildInviteTextForShare()` و `buildInviteTextForCopy()`
- در Share: **`text` = فقط CTA تمیز**، **`url` = INVITE_URL (جدا)**
- در Copy: متن کامل + CTA + URL در خط جدا
- در UI: **Button یا span استایل‌شده** با `onClick` → `window.open(INVITE_URL)` یا clipboard (نه anchor واقعی)

#### ب) الگوی ذهنی (`MindPatternCard.tsx` + `buildMindPatternShareText.ts`)

- اصلاح `buildMindPatternShareText` برای استفاده از **همه ۱۲ آیتم** (حذف selectedIndices)
- استفاده از `buildMindPatternText` برای ساخت از داده (نه DOM)
- **اضافه کردن guard/filter** برای null/undefined آیتم‌ها
- استفاده از utilityهای جدید
- در Share: **`text` = فقط CTA**، **`url` = INVITE_URL (جدا)**
- در UI modal: **Button یا span استایل‌شده** با onClick (نه anchor)

#### ج) کارت مقایسه (`CompareResultPage.tsx` + `payload.ts`)

- اصلاح `buildCompareCardPayload` برای استفاده از utilityهای جدید
- اصلاح `buildShareText` در `CompareResultPage`
- در Share: **`text` = فقط CTA**، **`url` = INVITE_URL (جدا)**
- در UI: **Button یا span استایل‌شده** با onClick (نه anchor)
- در PDF: استفاده از `PdfCtaLink` (قبلاً درست است)

### ۴. بهبود Clipboard API (اختیاری)

- در `copyInvite()`: **خروجی plain text باید همیشه عالی و کامل باشد**
- بهبود اختیاری: تلاش برای نوشتن هم `text/plain` و هم `text/html` (برای paste لینک‌دار در اپ‌های پشتیبان)
- Fallback به `text/plain` اگر HTML clipboard پشتیبانی نشود
- **توجه**: HTML clipboard بهبود است، نه وابستگی. Plain text اولویت دارد.

## فایل‌های تغییر یافته

1. `src/utils/inviteCta.ts` - اضافه کردن utilityهای جدید
2. `src/features/mindPattern/buildMindPatternShareText.ts` - اصلاح برای ۱۲ آیتم کامل
3. `src/features/quiz/components/SocialShareSection.tsx` - استفاده از utilityهای جدید + UI link
4. `src/features/quiz/components/MindPatternCard.tsx` - استفاده از utilityهای جدید + UI link
5. `src/domain/compare/payload.ts` - استفاده از utilityهای جدید
6. `src/pages/CompareResultPage.tsx` - استفاده از utilityهای جدید + UI link
7. `src/features/share/shareClient.ts` - بررسی که `shareOrCopyText` از `{ title?, text, url? }` پشتیبانی می‌کند (قبلاً دارد، باید مطمئن شویم)

## جزئیات پیاده‌سازی

### `buildInviteCta()` 

```typescript
// Returns: "تکمیل آزمون نشخوار فکری" (clickable text for UI)
```

### `buildInviteTextForShare()`

```typescript
// Returns: "تکمیل آزمون نشخوار فکری" (clean CTA, no URL)
// URL MUST be passed separately to shareOrCopyText in url field
// shareInvite() ensures: { text: CTA, url: INVITE_URL }
```

### `buildInviteTextForCopy()`

```typescript
// Returns: "تکمیل آزمون نشخوار فکری\nhttps://zaya.io/testruminationnewtest"
// CTA text + URL on separate line
```

### اصلاح `buildMindPatternShareText`

- **حذف `selectedIndices`** (خط ۱۰: `[0, 2, 4, 6, 8, 10, 11]`)
- استفاده از `buildMindPatternText` برای ساخت متن کامل با **همه ۱۲ آیتم**
- **اضافه کردن guard**: `items.filter(Boolean)` یا validation برای اطمینان از کامل بودن ۱۲ آیتم
- اضافه کردن invite با `buildInviteTextForCopy()`

### UI Link Component (Button/Span)

```tsx
// نه anchor واقعی، بلکه Button یا span استایل‌شده
<Button 
  variant="link" 
  className="text-primary hover:underline cursor-pointer"
  onClick={() => window.open(CTA_URL, '_blank')}
>
  {buildInviteCta()}
</Button>

// یا span برای layout‌های خاص
<span 
  className="text-primary hover:underline cursor-pointer"
  onClick={() => window.open(CTA_URL, '_blank')}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && window.open(CTA_URL, '_blank')}
>
  {buildInviteCta()}
</span>
```

**مزایا**:

- بدون underline/overflow مشکل‌ساز anchor
- کنترل کامل روی استایل
- سازگار با همه layout‌ها

## تست

- ✅ بررسی که در Share، **URL در فیلد `url` جدا** است و `text` فقط CTA تمیز است
- ✅ بررسی که در Copy، **همه ۱۲ آیتم** الگوی ذهنی کپی می‌شود (نه ۶-۷ مورد)
- ✅ بررسی که در UI، **Button/span کلیک‌پذیر** است (نه anchor) و URL نمایش داده نمی‌شود
- ✅ بررسی که guard برای null/undefined آیتم‌ها کار می‌کند
- ✅ بررسی PDF مقایسه که invite درست نمایش داده می‌شود
- ✅ بررسی که plain text copy همیشه کامل و عالی است (HTML clipboard بهبود اختیاری)