import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { DimensionKey } from "@/domain/quiz/types";
import type { CompareNarratives } from "@/features/compare/getCompareNarratives";
// import { DIMENSIONS } from "@/domain/quiz/dimensions"; // Unused
// PDF_RTL imported but unused - removed to fix module resolution
// import { PDF_RTL } from "../theme/rtl";
import { ITEM_MIN_PRESENCE } from "./theme/pagination";
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
  green: "#10B981",
  orange: "#F59E0B",
  red: "#EF4444",
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
    fontWeight: "bold",
    color: COLORS.coverText,
    marginBottom: 16,
    textAlign: "center",
    // letterSpacing removed to prevent Persian word breaking
  },
  coverSubtitle: {
    fontSize: 16,
    color: COLORS.primaryLight,
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 1.6,
  },
  coverNames: {
    fontSize: 20,
    color: COLORS.coverText,
    marginTop: 24,
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "bold",
  },
  coverTagline: {
    fontSize: 12,
    color: COLORS.primaryLighter,
    marginTop: 8,
    textAlign: "center",
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
    marginBottom: 4,
    textAlign: "right" as const,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "right" as const,
    lineHeight: 1.6,
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
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "right" as const,
  },
  card: {
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
  cardHighlight: {
    backgroundColor: COLORS.primaryLightest,
    border: `1px solid ${COLORS.primaryLight}`,
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
  textCenter: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 1.7,
    textAlign: "center",
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    fontSize: 10,
    marginHorizontal: 6,
    marginVertical: 4,
    fontWeight: "bold",
  },
  chipPrimary: {
    backgroundColor: COLORS.primaryLightest,
    color: COLORS.primaryDark,
  },
  chipOrange: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },
  row: {
    flexDirection: "row-reverse" as const,
    alignItems: "flex-start" as const,
    marginBottom: 8,
  },
  col: {
    width: "48%", // Fixed width instead of flex: 1
    paddingHorizontal: 8,
  },
  colSpacer: {
    width: 12, // Fixed spacer between columns
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
  listItem: {
    flexDirection: "row-reverse" as const,
    marginBottom: 6,
    alignItems: "flex-start" as const,
  },
  bullet: {
    fontSize: 10,
    color: COLORS.primaryDark,
    fontWeight: "bold" as const,
  },
  bulletBox: {
    width: 12,
    marginLeft: 6,
    textAlign: "center" as const,
  },
  numberBox: {
    width: 18,
    marginLeft: 6,
    textAlign: "center" as const,
  },
  listText: {
    flex: 1,
    textAlign: "right" as const,
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

// Constants for dimension labels (same as UI)
const DIMENSION_LABELS: Record<DimensionKey, string> = {
  stickiness: "چسبندگی فکری",
  pastBrooding: "بازگشت به گذشته",
  futureWorry: "نگرانی آینده",
  interpersonal: "حساسیت بین‌فردی",
};

const DIMENSION_DEFINITIONS: Record<DimensionKey, string> = {
  stickiness: "تمایل ذهن به ماندن روی فکرها بعد از پایان موقعیت",
  pastBrooding: "بازگشت ذهن به اتفاق‌ها یا گفت‌وگوهای قبلی",
  futureWorry: "درگیری ذهن با آینده و پیش‌بینی رویدادها",
  interpersonal: "حساسیت به نشانه‌های رفتاری در رابطه‌ها",
};

const LEVEL_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

interface ComparePdfDocumentProps {
  narratives: CompareNarratives;
  nameA: string;
  nameB: string;
  now?: Date;
}

export const ComparePdfDocument: React.FC<ComparePdfDocumentProps> = ({
  narratives,
  nameA,
  nameB,
  now,
}) => {
  const safeNow = now ?? new Date();
  const dateStr = formatPersianDate(safeNow);
  
  if (import.meta.env.DEV) {
    console.log("[PDF] now:", safeNow.toISOString(), formatPersianDate(safeNow));
  }

  // const dimensionKeys: readonly DimensionKey[] = DIMENSIONS; // Unused

  return (
    <Document>
      {/* Cover Page - Corporate Report Style */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContent}>
          <Image
            src="/logo/logo afran white.png"
            style={styles.coverLogo}
          />
          <Text style={styles.coverTitle}>ذهن ما کنار هم</Text>
          <Text style={styles.coverSubtitle}>
            برای فهم بهتر تفاوت‌ها، نه قضاوت
          </Text>
          <Text style={styles.coverNames}>
            {nameA} × {nameB}
          </Text>
          <Text style={styles.coverTagline}>
            ترجمه‌ی تفاوت‌های ذهنی به زبان رابطه
          </Text>
          <Text style={styles.coverDate}>{dateStr}</Text>
        </View>
        <View style={styles.coverFooter}>
          <Text>آکادمی افران - آزمون سنجش نشخوار فکری</Text>
        </View>
      </Page>

      {/* Content Page 1: Overview */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ذهن ما کنار هم</Text>
          <Text style={styles.headerSubtitle}>
            ترجمه‌ی تفاوت‌های ذهنی به زبان رابطه
          </Text>
        </View>

        {/* Snapshot Section */}
        <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
          <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={[styles.card, styles.cardHighlight]}>
            <View
              style={{
                flexDirection: "row-reverse" as const,
                flexWrap: "wrap" as const,
                marginBottom: 16,
                justifyContent: "center" as const,
              }}
            >
              <View style={[styles.chip, styles.chipPrimary]}>
                <Text>
                  شباهت کلی: {narratives.meta.similarityLabel}
                </Text>
              </View>
              <View style={[styles.chip, styles.chipOrange]}>
                <Text>
                  ریسک سوءتفاهم: {narratives.meta.riskLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.textSmall}>
              {narratives.meta.riskLabel}
            </Text>
            <Text style={styles.textCenter}>
              {narratives.dominantDifference.headline}
            </Text>
            <Text style={styles.textSmall}>
              {narratives.similarityComplementarySentence}
            </Text>
          </View>
        </View>

        {/* Mind Profiles section removed - using unified narratives only */}

        {/* CTA removed from page 1 - will appear only at end */}
        <Text style={styles.pageNumber}>1</Text>
      </Page>

      {/* Content Page 2: Dimension Map */}
      <Page size="A4" style={styles.page}>
        <View wrap={false} style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitle}>نقشه‌ی ذهنی</Text>
        </View>
        {narratives.mentalMap.map((mapItem) => {
          const key = mapItem.dimension;
          const isUnknown = mapItem.isUnknown;
          const relation = mapItem.relation;
          const alignment = isUnknown
            ? "نامشخص"
            : relation === "similar"
            ? "همسو"
            : relation === "different"
            ? "متفاوت"
            : relation === "very_different"
            ? "خیلی متفاوت"
            : "نامشخص";

          return (
            <View
              key={key}
              wrap={false}
              minPresenceAhead={ITEM_MIN_PRESENCE}
              style={styles.card}
            >
              <View style={styles.row}>
                <Text style={styles.sectionSubtitle}>
                  {DIMENSION_LABELS[key]}
                </Text>
                <Text
                  style={[
                    styles.textSmall,
                    {
                      backgroundColor:
                        alignment === "همسو"
                          ? COLORS.green + "20"
                          : alignment === "متفاوت"
                          ? COLORS.orange + "20"
                          : COLORS.red + "20",
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 4,
                      fontWeight: "bold" as const,
                    },
                  ]}
                >
                  {alignment}
                </Text>
              </View>
              <Text style={styles.textSmall}>
                {DIMENSION_DEFINITIONS[key]}
              </Text>
              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.textSmall}>
                    {nameA}:{" "}
                    {isUnknown || mapItem.aLevel === null
                      ? "نامشخص"
                      : LEVEL_LABELS[mapItem.aLevel] || "نامشخص"}
                  </Text>
                </View>
                <View style={styles.colSpacer} />
                <View style={styles.col}>
                  <Text style={styles.textSmall}>
                    {nameB}:{" "}
                    {isUnknown || mapItem.bLevel === null
                      ? "نامشخص"
                      : LEVEL_LABELS[mapItem.bLevel] || "نامشخص"}
                  </Text>
                </View>
              </View>
              <Text style={styles.textSmall}>
                {isUnknown
                  ? "این بُعد قابل محاسبه نیست (داده ناقص است)."
                  : narratives.mentalMapByDimension[key] || mapItem.text}
              </Text>
            </View>
          );
        })}

        {/* Similarities and Differences */}
        <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
          <View wrap={false} style={styles.sectionTitleWrapper}>
            <Text style={styles.sectionTitle}>شباهت‌ها و تفاوت‌های کلیدی</Text>
          </View>
          <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.card}>
            <Text style={styles.sectionSubtitle}>شباهت‌ها</Text>
            {narratives.similarities.length > 0 ? (
              narratives.similarities.map((key) => (
                <View key={key} style={styles.listItem}>
                  <Text style={[styles.bullet, styles.bulletBox]}>•</Text>
                  <Text style={[styles.textSmall, styles.listText]}>
                    {DIMENSION_LABELS[key]}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.textSmall}>
                همسویی کامل کمتر دیده می‌شود؛ این نشانه‌ی تفاوت سبک‌هاست، نه
                مشکل.
              </Text>
            )}
            <View style={styles.divider} />
            <Text style={styles.sectionSubtitle}>تفاوت‌ها</Text>
            {narratives.differences.length > 0 ? (
              narratives.differences.map((key) => {
                const mapItem = narratives.mentalMap.find(m => m.dimension === key);
                const isVeryDifferent = mapItem?.relation === "very_different";
                return (
                  <View key={key} style={styles.listItem}>
                    <Text style={[styles.bullet, styles.bulletBox]}>•</Text>
                    <Text style={[styles.textSmall, styles.listText]}>
                      {DIMENSION_LABELS[key]}
                      {isVeryDifferent && " (خیلی متفاوت)"}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.textSmall}>
                در این نتایج، تفاوت چشمگیری بین شما دیده نشد. این یعنی در چند
                الگوی کلیدی، واکنش ذهنی‌تان شبیه‌تر است.
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.pageNumber}>2</Text>
      </Page>

      {/* Additional pages for detailed content */}
      {(() => {
        // Use dominant dimension from narratives (no recomputation)
        const dimensionToUse = narratives.meta.dominantDimension;
        const mapItem = narratives.mentalMap.find(m => m.dimension === dimensionToUse);
        if (!mapItem) return null;

        return (
          <>
            {/* Central Interpretation Page */}
            <Page size="A4" style={styles.page}>
              <View wrap={false} style={styles.sectionTitleWrapper}>
                <Text style={styles.sectionTitle}>تفسیر مرکزی</Text>
              </View>
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={[styles.card, styles.cardHighlight]}>
                <Text style={styles.text}>
                  {narratives.dominantDifferenceText}
                </Text>
              </View>

              {/* Misunderstanding Loop */}
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
                <View wrap={false} style={styles.sectionTitleWrapper}>
                  <Text style={styles.sectionTitle}>
                    {narratives.loop.title}
                  </Text>
                </View>
                <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.card}>
                  {narratives.loop.steps.map(
                    (step, index) => (
                      <View key={index} style={styles.listItem}>
                        <Text style={[styles.bullet, styles.numberBox]}>{`${index + 1}.`}</Text>
                        <Text style={[styles.textSmall, styles.listText]}>{step}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>

              {/* Triggers */}
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
                <View wrap={false} style={styles.sectionTitleWrapper}>
                  <Text style={styles.sectionTitle}>موقعیت‌های فعال‌ساز</Text>
                </View>
                <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.card}>
                  {narratives.triggers.list.map((trigger, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={[styles.bullet, styles.bulletBox]}>•</Text>
                      <Text style={[styles.textSmall, styles.listText]}>{trigger}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.pageNumber}>3</Text>
            </Page>

            {/* Consequences and Emotional Experience Page */}
            <Page size="A4" style={styles.page}>
              {/* Consequences */}
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
                <View wrap={false} style={styles.sectionTitleWrapper}>
                  <Text style={styles.sectionTitle}>
                    پیامد دیده نشدن / دیده شدن
                  </Text>
                </View>
                <View style={styles.row}>
                  <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={[styles.col, styles.card]}>
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        { color: COLORS.red, marginBottom: 12 },
                      ]}
                    >
                      اگر دیده نشود
                    </Text>
                    {(narratives as any).seenUnseenConsequences?.unseen?.map(
                      (item: string, idx: number) => (
                        <View key={idx} style={styles.listItem}>
                          <Text style={[styles.bullet, styles.bulletBox]}>•</Text>
                          <Text style={[styles.textSmall, styles.listText]}>{item}</Text>
                        </View>
                      )
                    ) || []}
                  </View>
                  <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={[styles.col, styles.card]}>
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        { color: COLORS.green, marginBottom: 12 },
                      ]}
                    >
                      اگر دیده شود
                    </Text>
                    {(narratives as any).seenUnseenConsequences?.seen?.map(
                      (item: string, idx: number) => (
                        <View key={idx} style={styles.listItem}>
                          <Text style={[styles.bullet, styles.bulletBox]}>•</Text>
                          <Text style={[styles.textSmall, styles.listText]}>{item}</Text>
                        </View>
                      )
                    ) || []}
                  </View>
                </View>
              </View>

              {/* Emotional Experience */}
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
                <View wrap={false} style={styles.sectionTitleWrapper}>
                  <Text style={styles.sectionTitle}>
                    {mapItem.relation === "similar"
                      ? "این همسویی ممکن است این‌طور حس شود"
                      : "این تفاوت ممکن است این‌طور حس شود"}
                  </Text>
                </View>
                <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.card}>
                  {narratives.feltExperienceText ? (
                    <Text style={styles.text}>{narratives.feltExperienceText}</Text>
                  ) : null}
                </View>
              </View>

              {/* Conversation Starters */}
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
                <View wrap={false} style={styles.sectionTitleWrapper}>
                  <Text style={styles.sectionTitle}>شروع گفت‌وگو</Text>
                </View>
                {(narratives as any).conversationStarters && (narratives as any).conversationStarters.length > 0 && (
                  <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.card}>
                    {((narratives as any).conversationStarters as string[]).map(
                      (q: string, idx: number) => (
                        <View
                          wrap={false}
                          minPresenceAhead={60}
                          key={idx}
                          style={[styles.card, { marginBottom: 8, padding: 12 }]}
                        >
                          <Text style={styles.textSmall}>{q}</Text>
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>

              {/* Final Summary */}
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
                <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.card}>
                  <Text style={styles.textCenter}>
                    این صفحه قرار نیست چیزی را درست یا غلط کند.{"\n"}
                    فقط نشان می‌دهد ذهن‌ها چطور متفاوت واکنش نشان می‌دهند.{"\n"}
                    دیدن این تفاوت‌ها می‌تواند نقطه‌ی شروع فهم باشد، نه بحث.
                  </Text>
                </View>
              </View>

              {/* Safety Statement */}
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
                <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={[styles.card, { backgroundColor: COLORS.primaryLightest }]}>
                  <Text style={styles.textSmall}>{narratives.safetyText}</Text>
                </View>
              </View>

              {/* CTA/Invite Link - Only at end, separated from content */}
              <PdfCtaLink />
              <Text style={styles.pageNumber}>4</Text>
            </Page>
          </>
        );
      })()}
    </Document>
  );
};
