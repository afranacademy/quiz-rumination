import type { LikertValue } from "../types";

export async function buildMindPatternPdfBlob(input: {
  firstName?: string;
  bulletPoints: string[];
}): Promise<Blob> {
  const { firstName, bulletPoints } = input;

  // Create HTML content for PDF
  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 2cm;
      size: A4;
    }
    body {
      font-family: 'Peyda', Arial, sans-serif;
      direction: rtl;
      text-align: right;
      line-height: 1.8;
      color: #1a1a1a;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
    }
    .logo {
      max-width: 120px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 24px;
      margin: 10px 0;
      font-weight: bold;
    }
    .intro {
      margin: 20px 0;
      font-size: 14px;
      line-height: 2;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin: 25px 0 15px 0;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 15px 0;
    }
    li {
      margin: 12px 0;
      padding-right: 20px;
      font-size: 13px;
      line-height: 2;
    }
    li::before {
      content: "• ";
      color: #4a90e2;
      font-weight: bold;
      margin-left: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      font-size: 11px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>الگوی ذهنی من</h1>
    ${firstName ? `<p style="margin: 10px 0; font-size: 14px;">${firstName}</p>` : ""}
  </div>
  
  <div class="intro">
    ${firstName ? `${firstName}، ` : ""}این یک راهنمای ساده است که می‌تونی برای کسایی که دوست داری بدونن ذهنم درگیر نشخوار فکری، در موقعیت‌های مختلف چطور کار می‌کنه، براشون بفرستی.
  </div>
  
  <div class="section-title">این الگوها توی ذهن من دیده می‌شن:</div>
  
  <ul>
    ${bulletPoints.map((point) => `<li>${point}</li>`).join("")}
  </ul>
  
  <div class="footer">
    این فایل بخشی از آزمون سنجش نشخوار فکری افران است و تشخیص بالینی محسوب نمی‌شود.
  </div>
</body>
</html>
  `;

  // TODO: Replace with proper PDF generation library (jsPDF, pdfmake, etc.)
  // For now, create a formatted text file that can be easily converted to PDF
  const textContent = [
    "الگوی ذهنی من",
    "",
    firstName ? `${firstName}` : "",
    "",
    "این یک راهنمای ساده است که می‌تونی برای کسایی که دوست داری بدونن ذهنم درگیر نشخوار فکری، در موقعیت‌های مختلف چطور کار می‌کنه، براشون بفرستی.",
    "",
    "این الگوها توی ذهن من دیده می‌شن:",
    "",
    ...bulletPoints.map((point, index) => `${index + 1}. ${point}`),
    "",
    "این الگوها به معنی مشکل یا تشخیص نیستند؛ فقط توصیفی از نحوه‌ی کار ذهن در مواجهه با فکرهای تکراری‌اند.",
    "",
    "این فایل بخشی از آزمون سنجش نشخوار فکری افران است و تشخیص بالینی محسوب نمی‌شود.",
  ].join("\n");

  // Return as text blob (can be upgraded to PDF with library)
  // To upgrade: install jsPDF or pdfmake and generate proper PDF binary
  return new Blob([textContent], { type: "text/plain;charset=utf-8" });
}
