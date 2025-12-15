export async function buildSummaryPdfBlob(input: {
  firstName?: string;
  badgeLabel: string;
  text: string;
  score: number;
  maxScore: number;
}): Promise<Blob> {
  const { firstName, badgeLabel, text, score, maxScore } = input;

  // Create HTML content for PDF with professional design
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
      font-family: 'Peyda', 'Tahoma', Arial, sans-serif;
      direction: rtl;
      text-align: right;
      line-height: 2;
      color: #1a1a1a;
      padding: 20px;
      background: #ffffff;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #2d3442;
      padding-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      margin: 15px 0;
      font-weight: bold;
      color: #1a1f2e;
    }
    .badge {
      display: inline-block;
      padding: 8px 20px;
      background: #2d3442;
      color: #ffffff;
      border-radius: 20px;
      font-size: 16px;
      font-weight: 600;
      margin: 10px 0;
    }
    .user-name {
      font-size: 16px;
      color: #4a5568;
      margin: 10px 0;
    }
    .content {
      margin: 30px 0;
      padding: 25px;
      background: #f8f9fa;
      border-radius: 12px;
      border-right: 4px solid #2d3442;
    }
    .content-text {
      font-size: 15px;
      line-height: 2.2;
      color: #2d3748;
      white-space: pre-line;
      text-align: right;
    }
    .score-section {
      margin-top: 30px;
      padding: 15px;
      background: #e8f0f8;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #cbd5e0;
    }
    .score-label {
      font-size: 13px;
      color: #4a5568;
      margin-bottom: 5px;
    }
    .score-value {
      font-size: 24px;
      font-weight: bold;
      color: #1a1f2e;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #cbd5e0;
      font-size: 12px;
      color: #718096;
      text-align: center;
      line-height: 1.8;
    }
    .footer-title {
      font-weight: bold;
      color: #4a5568;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>خلاصه نتیجه‌ی من</h1>
    <div class="badge">${badgeLabel}</div>
    ${firstName ? `<div class="user-name">${firstName}</div>` : ""}
  </div>
  
  <div class="content">
    <div class="content-text">${text}</div>
  </div>
  
  <div class="score-section">
    <div class="score-label">امتیاز</div>
    <div class="score-value">${score} از ${maxScore}</div>
  </div>
  
  <div class="footer">
    <div class="footer-title">آزمون سنجش نشخوار فکری (ذهن وراج)</div>
    <div>این فایل بخشی از آزمون سنجش نشخوار فکری افران است و تشخیص بالینی محسوب نمی‌شود.</div>
  </div>
  
  <div class="footer" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cbd5e0;">
    <div style="font-size: 12px; color: #4a5568; line-height: 1.8; text-align: center;">
      اگر دوست داری الگوی ذهنی خودت رو دقیق‌تر بشناسی،<br />
      می‌تونی این آزمون سنجش نشخوار فکری رو تکمیل کنی:<br />
      <a href="https://zaya.io/testruminationnewtest" style="color: #2d3442; text-decoration: underline; word-break: break-all;">https://zaya.io/testruminationnewtest</a>
    </div>
  </div>
</body>
</html>
  `;

  // Create a blob with HTML content
  // Users can print this to PDF using browser's print functionality
  // For a true PDF binary, we would need jsPDF or similar library
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  
  return blob;
}

