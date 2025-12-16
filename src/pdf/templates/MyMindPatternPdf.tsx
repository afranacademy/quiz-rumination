import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { PDF_COLORS } from "../theme/colors";
import { PDF_TYPOGRAPHY } from "../theme/typography";
import { PDF_LAYOUT } from "../theme/layout";
import { PDF_RTL } from "../theme/rtl";
import { ITEM_MIN_PRESENCE } from "../theme/pagination";
import { PdfBrandHeader } from "../components/PdfBrandHeader";
import { PdfCtaLink } from "../components/PdfCtaLink";
import { formatPersianDate } from "@/utils/formatPersianDate";

// Font registration is handled in buildPdf.ts
// This ensures fonts are registered before PDF generation

// Base page style with Peyda font and RTL
const basePageStyle = StyleSheet.create({
  page: {
    ...PDF_LAYOUT.contentPage,
    ...PDF_RTL.rtlPage,
  },
  coverPage: {
    ...PDF_LAYOUT.coverPage,
    ...PDF_RTL.rtlPage,
  },
});

interface MyMindPatternPdfProps {
  firstName?: string | null;
  now?: Date;
  // Data will be added later - skeleton for now
}

/**
 * My Mind Pattern PDF Template
 * Corporate manual style with branded header and clean layout
 */
export const MyMindPatternPdf: React.FC<MyMindPatternPdfProps> = ({
  firstName,
  now,
}) => {
  const safeNow = now ?? new Date();
  const dateStr = formatPersianDate(safeNow);
  
  if (import.meta.env.DEV) {
    console.log("[PDF] now:", safeNow.toISOString(), formatPersianDate(safeNow));
  }

  const nameLine = firstName ? `${firstName}، ` : "";

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={basePageStyle.coverPage}>
        <View style={PDF_LAYOUT.coverContent}>
          <Image
            src="/logo/logo afran white.png"
            style={{
              width: 64,
              height: 64,
              marginBottom: 32,
            }}
          />
          <Text
            style={[
              PDF_TYPOGRAPHY.coverTitle,
              PDF_RTL.rtlTextCenter,
              { color: PDF_COLORS.coverText, marginBottom: 16 },
            ]}
          >
            الگوی ذهنی من
          </Text>
          <Text
            style={[
              PDF_TYPOGRAPHY.coverSubtitle,
              PDF_RTL.rtlTextCenter,
              {
                color: PDF_COLORS.primaryLight,
                marginBottom: 32,
                paddingHorizontal: 40,
              },
            ]}
          >
            {nameLine}این یک راهنمای ساده است که می‌تونی برای کسایی که دوست
            داری بدونی ذهنت درگیر نشخوار فکری، در موقعیت‌های مختلف چطور کار می‌کنه،
            براشون بفرستی.
          </Text>
          <Text
            style={[
              PDF_TYPOGRAPHY.coverDate,
              PDF_RTL.rtlTextCenter,
              { color: PDF_COLORS.primaryLighter },
            ]}
          >
            {dateStr}
          </Text>
        </View>
        <View style={PDF_LAYOUT.footer}>
          <Text
            style={[
              PDF_TYPOGRAPHY.footer,
              PDF_RTL.rtlTextCenter,
              { color: PDF_COLORS.primaryLighter },
            ]}
          >
            آکادمی افران - آزمون سنجش نشخوار فکری
          </Text>
        </View>
      </Page>

      {/* Content Page */}
      <Page size="A4" style={basePageStyle.page}>
        <PdfBrandHeader title="الگوی ذهنی من" />

        {/* Cover Card */}
        <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={[PDF_LAYOUT.card, PDF_LAYOUT.cardHighlight, PDF_RTL.section]}>
          <Text
            style={[
              PDF_TYPOGRAPHY.sectionTitle,
              PDF_RTL.rtlText,
              { color: PDF_COLORS.primaryDarkest, marginBottom: 12 },
            ]}
          >
            این الگوها توی ذهن من دیده می‌شن:
          </Text>
          <Text
            style={[
              PDF_TYPOGRAPHY.body,
              PDF_RTL.rtlText,
              PDF_RTL.paragraph,
              { color: PDF_COLORS.text },
            ]}
          >
            {/* Placeholder content - will be replaced with actual data */}
            محتوای الگوی ذهنی در اینجا نمایش داده خواهد شد.
          </Text>
        </View>

        {/* Placeholder section */}
        <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={PDF_RTL.section}>
          <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={PDF_LAYOUT.card}>
            <Text
              style={[
                PDF_TYPOGRAPHY.bodySmall,
                PDF_RTL.rtlText,
                { color: PDF_COLORS.textLight },
              ]}
            >
              این الگوها به معنی مشکل یا تشخیص نیستند؛ فقط توصیفی از نحوه‌ی کار
              ذهن در مواجهه با فکرهای تکراری‌اند.
            </Text>
          </View>
        </View>

        {/* CTA/Invite Link - Only at end, separated from content */}
        <PdfCtaLink />
        <Text style={[PDF_TYPOGRAPHY.pageNumber, PDF_LAYOUT.pageNumber, { color: PDF_COLORS.textLighter }]}>
          1
        </Text>
      </Page>
    </Document>
  );
};

