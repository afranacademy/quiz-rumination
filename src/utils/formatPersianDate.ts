/**
 * Formats a date in Persian (Jalali) calendar format
 * Output: «روز + ماه فارسی + سال»
 * Example: «۲۵ آذر ۱۴۰۴»
 * 
 * Uses Intl.DateTimeFormat with Persian calendar explicitly
 */

export function formatPersianDate(date: Date): string {
  const persianMonths = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];

  // Use Intl.DateTimeFormat with Persian calendar explicitly
  const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  // Format to parts to get individual components
  const parts = formatter.formatToParts(date);
  
  const dayPart = parts.find((p) => p.type === "day");
  const monthPart = parts.find((p) => p.type === "month");
  const yearPart = parts.find((p) => p.type === "year");

  if (!dayPart || !monthPart || !yearPart) {
    // Fallback if parts are missing
    return formatPersianDateFallback(date);
  }

  // Convert to numbers (they might be in Persian digits)
  const persianToWestern: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };
  
  const toWestern = (str: string) =>
    str.replace(/[۰-۹]/g, (d) => persianToWestern[d] || d);

  const dayNum = parseInt(toWestern(dayPart.value), 10);
  const monthNum = parseInt(toWestern(monthPart.value), 10);
  const yearNum = parseInt(toWestern(yearPart.value), 10);

  // Get Persian month name
  const monthName = persianMonths[monthNum - 1] || "";

  // Convert to Persian digits
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const toPersian = (num: number) =>
    num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);

  const dayPersian = toPersian(dayNum);
  const yearPersian = toPersian(yearNum);

  return `${dayPersian} ${monthName} ${yearPersian}`;
}

/**
 * Fallback formatter if Intl.DateTimeFormat fails
 */
function formatPersianDateFallback(date: Date): string {
  // Simple fallback - just return current date in a basic format
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const toPersian = (num: number) =>
    num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
  
  return `${toPersian(date.getDate())} ${toPersian(date.getMonth() + 1)} ${toPersian(date.getFullYear())}`;
}

