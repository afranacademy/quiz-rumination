import type { MindPatternItem } from "./buildMindPattern";

export async function buildMindPatternPdfBlob(input: {
  firstName?: string;
  items: MindPatternItem[];
  quizUrl: string;
}): Promise<Blob> {
  const { firstName, items, quizUrl } = input;

  // Select 5-7 key highlights
  const selectedIndices = [0, 2, 4, 6, 8, 10, 11].filter(i => i < items.length);
  const highlights = selectedIndices.map(i => items[i]);

  // Build first-person bullet points (descriptions are already in first-person)
  const bulletPoints = highlights.map(item => item.description);

  // Create HTML content for PDF with beautiful design
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
      background: #fafafa;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 25px;
      border-bottom: 2px solid #e0e0e0;
    }
    h1 {
      font-size: 32px;
      margin: 15px 0;
      font-weight: 600;
      color: #1a1f2e;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 10px;
      line-height: 1.8;
    }
    .intro {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
      border-right: 3px solid #2d3442;
      font-size: 15px;
      line-height: 2.2;
      color: #2d3748;
    }
    .highlights {
      margin: 30px 0;
    }
    .highlights-title {
      font-size: 18px;
      font-weight: 600;
      color: #1a1f2e;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .highlight-item {
      margin: 18px 0;
      padding: 15px;
      background: #ffffff;
      border-radius: 8px;
      border-right: 3px solid #4a90e2;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .highlight-item::before {
      content: "• ";
      color: #4a90e2;
      font-weight: bold;
      font-size: 18px;
      margin-left: 5px;
    }
    .highlight-text {
      font-size: 14px;
      line-height: 2.2;
      color: #2d3748;
    }
    .footer-invitation {
      margin-top: 50px;
      padding: 25px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e8f0f8 100%);
      border-radius: 12px;
      border: 2px solid #4a90e2;
      text-align: center;
    }
    .footer-icon {
      font-size: 32px;
      margin-bottom: 15px;
    }
    .footer-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1f2e;
      margin-bottom: 12px;
    }
    .footer-text {
      font-size: 14px;
      line-height: 2.2;
      color: #4a5568;
      margin-bottom: 15px;
    }
    .footer-link {
      font-size: 14px;
      color: #4a90e2;
      text-decoration: none;
      word-break: break-all;
      display: inline-block;
      margin-top: 10px;
      padding: 8px 16px;
      background: #ffffff;
      border-radius: 6px;
      border: 1px solid #4a90e2;
    }
    .closing-note {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #718096;
      text-align: center;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>الگوی ذهنی من</h1>
    <div class="subtitle">این توضیح نشان می‌دهد ذهن من در موقعیت‌های مختلف چگونه کار می‌کند.</div>
    ${firstName ? `<div style="margin-top: 10px; font-size: 16px; color: #4a5568;">${firstName}</div>` : ""}
  </div>
  
  <div class="intro">
    این الگو توصیفی از نحوه‌ی کار ذهن من در مواجهه با فکرهای تکراری و موقعیت‌های مختلف است. این الگو برای خودشناسی طراحی شده و تشخیص بالینی محسوب نمی‌شود.
  </div>
  
  <div class="highlights">
    <div class="highlights-title">برخی از الگوهای ذهنی من:</div>
    ${bulletPoints.map(text => `
      <div class="highlight-item">
        <div class="highlight-text">${text}</div>
      </div>
    `).join("")}
  </div>
  
  <div class="footer-invitation">
    <div class="footer-icon">🧠</div>
    <div class="footer-title">این الگوی ذهنی حاصل آزمون «ذهن وراج» است.</div>
    <div class="footer-text">تو هم می‌تونی الگوی ذهنت رو بشناسی و نتیجه‌ات رو با دیگران به اشتراک بذاری.</div>
    <a href="${quizUrl}" class="footer-link">${quizUrl}</a>
  </div>
  
  <div class="closing-note">
    این الگو برای خودشناسی طراحی شده و تشخیص بالینی محسوب نمی‌شود.
  </div>
</body>
</html>
  `;

  // Create a blob with HTML content
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  
  return blob;
}
