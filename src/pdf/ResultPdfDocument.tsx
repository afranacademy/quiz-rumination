import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { PDF_RTL } from "../theme/rtl";
import { ITEM_MIN_PRESENCE, listItemContainer } from "./theme/pagination";
import { PdfCtaLink } from "./components/PdfCtaLink";
import { formatPersianDate } from "@/utils/formatPersianDate";

// AFRAN Brand Colors (HEX only) - Corporate Report Style
const COLORS = {
  primary: "#48CAE4",
  primaryLight: "#90E0EF",
  primaryLighter: "#ADE8F4",
  primaryLightest: "#CAF0F8",
  primaryDark: "#0077B6",
  primaryDarkest: "#023E8A", // Dark navy for covers
  text: "#023E8A", // Dark navy text
  textLight: "#4A5568",
  textLighter: "#718096",
  border: "#E2E8F0",
  background: "#FFFFFF",
  coverBg: "#023E8A", // Dark navy cover
  coverText: "#FFFFFF", // White text on cover
};

const fontFamily = "Peyda";

const styles = StyleSheet.create({
  // Cover page styles
  coverPage: {
    flexDirection: "column",
    backgroundColor: COLORS.coverBg,
    padding: 0,
    fontFamily: fontFamily,
    direction: "rtl",
  },
  coverContent: {
    flexDirection: "column" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingVertical: 56, // Reduced from 80 for tighter cover layout
    paddingHorizontal: 60,
    // Removed minHeight: "100%" - let content determine height naturally
  },
  coverLogo: {
    width: 64,
    height: 64,
    marginBottom: 32,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: "bold" as const,
    color: COLORS.coverText,
    marginBottom: 16,
    textAlign: "center" as const,
    letterSpacing: 0.5,
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.primaryLight,
    marginBottom: 32,
    textAlign: "center" as const,
    lineHeight: 1.8,
    paddingHorizontal: 40,
  },
  coverDate: {
    fontSize: 11,
    color: COLORS.primaryLighter,
    textAlign: "center" as const,
  },
  coverFooter: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: COLORS.primaryLighter,
    textAlign: "center",
  },

  // Content page styles
  page: {
    flexDirection: "column",
    backgroundColor: COLORS.background,
    padding: 36, // Reduced from 50 for denser content pages
    fontFamily: fontFamily,
    direction: "rtl",
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: `2px solid ${COLORS.primaryDarkest}`,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold" as const,
    color: COLORS.primaryDarkest,
    textAlign: "right" as const,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold" as const,
    color: COLORS.primaryDarkest,
    marginBottom: 12,
    textAlign: "right" as const,
    paddingBottom: 8,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  itemCard: {
    backgroundColor: COLORS.background,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: 16,
    marginBottom: 10,
  },
  sectionTitleWrapper: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  itemTitleText: {
    fontSize: 13,
    fontWeight: "bold" as const,
    color: COLORS.text,
    marginBottom: 6,
    textAlign: "right" as const,
  },
  itemNumberPrefix: {
    fontSize: 13,
    fontWeight: "bold" as const,
    color: COLORS.primaryDarkest,
    backgroundColor: COLORS.primaryLightest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  numberBox: {
    width: 24,
    marginLeft: 8,
    textAlign: "center" as const,
  },
  itemTitleTextWrapper: {
    flex: 1,
    textAlign: "right" as const,
  },
  itemOptionLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: "right" as const,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 1.7,
    textAlign: "right" as const,
    marginBottom: 8,
  },
  textSmall: {
    fontSize: 10,
    color: COLORS.textLight,
    lineHeight: 1.6,
    textAlign: "right" as const,
    marginBottom: 6,
  },
  divider: {
    borderTop: `1px solid ${COLORS.border}`,
    marginVertical: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    paddingTop: 16,
    borderTop: `1px solid ${COLORS.border}`,
    fontSize: 9,
    color: COLORS.textLighter,
    textAlign: "center",
  },
  inviteLink: {
    marginTop: 16, // Reduced from 32 for denser content
    paddingTop: 16, // Reduced from 20
    borderTop: `2px solid ${COLORS.border}`,
  },
  inviteText: {
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 1.7,
    textAlign: "center",
    marginBottom: 8,
  },
  inviteUrl: {
    fontSize: 10,
    color: COLORS.primaryDark,
    textAlign: "center",
    textDecoration: "underline",
  },
  closingNote: {
    marginTop: 16,
    marginBottom: 16,
    padding: 18,
    backgroundColor: COLORS.primaryLightest,
    borderRadius: 4,
    border: `1px solid ${COLORS.primaryLight}`,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    left: 50,
    right: 50,
    fontSize: 9,
    color: COLORS.textLighter,
    textAlign: "center",
  },
});

interface MentalPatternItem {
  index: number;
  text: string;
  questionText: string;
  optionLabel: string;
  score: number;
}

interface ResultPdfDocumentProps {
  firstName?: string | null;
  items: MentalPatternItem[];
  now?: Date;
}

export const ResultPdfDocument: React.FC<ResultPdfDocumentProps> = ({
  firstName,
  items,
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
      {/* Cover Page - Corporate Report Style */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContent}>
          <Image
            src="/logo/logo afran white.png"
            style={styles.coverLogo}
          />
          <Text style={styles.coverTitle}>الگوی ذهنی من</Text>
          <Text style={styles.coverSubtitle}>
            {nameLine}این یک راهنمای ساده است که می‌تونی برای کسایی که دوست
            داری بدونی ذهنت درگیر نشخوار فکری، در موقعیت‌های مختلف چطور کار می‌کنه،
            براشون بفرستی.
          </Text>
          <Text style={styles.coverDate}>{dateStr}</Text>
        </View>
        <View style={styles.coverFooter}>
          <Text>آکادمی افران - آزمون سنجش نشخوار فکری</Text>
        </View>
      </Page>

      {/* Content Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>الگوی ذهنی من</Text>
        </View>

        <View wrap={false} style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitle}>این الگوها توی ذهن من دیده می‌شن:</Text>
        </View>

        {/* All 12 Items - Keep together, no page breaks */}
        {items.map((item) => {
          // Extract short title from question text (first few words)
          const questionTitle = item.questionText
            ? item.questionText.split("،")[0].split(".")[0].trim()
            : `سؤال ${item.index}`;

          return (
            <View
              key={item.index}
              wrap={false}
              minPresenceAhead={ITEM_MIN_PRESENCE}
              style={styles.itemCard}
            >
              {/* Number and title in separate Text blocks for proper RTL composition */}
              <View style={{ flexDirection: "row-reverse" as const, alignItems: "flex-start" as const, marginBottom: 6 }}>
                <Text style={[styles.itemNumberPrefix, styles.numberBox]}>{item.index}</Text>
                <Text style={[styles.itemTitleText, styles.itemTitleTextWrapper]}>{questionTitle}</Text>
              </View>
              {item.optionLabel && (
                <Text style={styles.itemOptionLabel}>
                  انتخاب شما: {item.optionLabel}
                </Text>
              )}
              <Text style={styles.text}>{item.text}</Text>
            </View>
          );
        })}

        {/* Closing Note */}
        <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.closingNote}>
          <Text style={styles.textSmall}>
            این الگوها به معنی مشکل یا تشخیص نیستند؛ فقط توصیفی از نحوه‌ی کار
            ذهن در مواجهه با فکرهای تکراری‌اند.
          </Text>
        </View>

        {/* CTA/Invite Link - Only at end, separated from content */}
        <PdfCtaLink />
        <Text style={styles.pageNumber}>1</Text>
      </Page>
    </Document>
  );
};
