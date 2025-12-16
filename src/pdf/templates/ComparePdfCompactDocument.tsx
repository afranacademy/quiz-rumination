import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Comparison } from "@/domain/compare/types";
import type { DimensionKey } from "@/domain/quiz/types";
import { ITEM_MIN_PRESENCE } from "../theme/pagination";
import { PdfCtaLink } from "../components/PdfCtaLink";
import { formatPersianDate } from "@/utils/formatPersianDate";

// AFRAN Brand Colors (HEX only) - Corporate Report Style
const COLORS = {
  primary: "#48CAE4",
  primaryLight: "#90E0EF",
  primaryLighter: "#ADE8F4",
  primaryLightest: "#CAF0F8",
  primaryDark: "#0077B6",
  primaryDarkest: "#023E8A",
  text: "#023E8A",
  textLight: "#4A5568",
  textLighter: "#718096",
  border: "#E2E8F0",
  background: "#FFFFFF",
  coverBg: "#023E8A",
  coverText: "#FFFFFF",
  green: "#10B981",
  orange: "#F59E0B",
  red: "#EF4444",
};

const fontFamily = "Peyda";

// Alignment badge background colors (explicit, no alpha concatenation)
const ALIGN_BG = {
  aligned: "#D1FAE5",
  different: "#FEF3C7",
  veryDifferent: "#FEE2E2",
};

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
    paddingVertical: 56,
    paddingHorizontal: 60,
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
    letterSpacing: 0.5,
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
    padding: 36,
    fontFamily: fontFamily,
    direction: "rtl",
  },
  header: {
    marginBottom: 12,
    paddingBottom: 8,
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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: COLORS.primaryDarkest,
    marginBottom: 8,
    textAlign: "right" as const,
    paddingBottom: 6,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: "bold" as const,
    color: COLORS.text,
    marginBottom: 6,
    textAlign: "right" as const,
  },
  card: {
    backgroundColor: COLORS.background,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  sectionTitleWrapper: {
    marginBottom: 8,
    paddingBottom: 6,
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
    marginBottom: 6,
  },
  textSmall: {
    fontSize: 10,
    color: COLORS.textLight,
    lineHeight: 1.6,
    textAlign: "right" as const,
    marginBottom: 4,
  },
  textCenter: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 1.7,
    textAlign: "center",
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    fontSize: 10,
    marginHorizontal: 4,
    marginVertical: 3,
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
    width: "48%",
    paddingHorizontal: 6,
  },
  colSpacer: {
    width: 12,
  },
  divider: {
    borderTop: `1px solid ${COLORS.border}`,
    marginVertical: 8,
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
  conversationStarterItem: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    backgroundColor: COLORS.background,
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
  footerText: {
    marginTop: 8,
    fontSize: 8,
    color: COLORS.textLighter,
    textAlign: "center",
  },
});

interface ComparePdfCompactDocumentProps {
  nameA: string;
  nameB: string;
  comparison: Comparison;
  attemptA: {
    dimension_scores: Record<DimensionKey, number>;
  };
  attemptB: {
    dimension_scores: Record<DimensionKey, number>;
  };
  topDimensionA?: DimensionKey;
  topDimensionB?: DimensionKey;
  overallSimilarity: "low" | "medium" | "high";
  misunderstandingRisk: "low" | "medium" | "high";
  largestDiff?: {
    key: DimensionKey;
    delta: number;
  };
  similarities: DimensionKey[];
  differences: DimensionKey[];
  getDimensionNameForSnapshot: (key: DimensionKey) => string;
  generateMindSnapshot: (
    name: string,
    dimension: DimensionKey,
    scores: Record<DimensionKey, number>
  ) => string;
  getMisunderstandingRiskText: (risk: "low" | "medium" | "high") => string;
  getSimilarityComplementarySentence: (
    similarity: "low" | "medium" | "high"
  ) => string;
  getAlignmentLabel: (delta: number) => string;
  generateDimensionSummary: (
    relation: "similar" | "different" | "very_different",
    aLevel: "low" | "medium" | "high",
    bLevel: "low" | "medium" | "high"
  ) => string;
  getConversationStarters: (
    dimension: DimensionKey,
    relation: "similar" | "different" | "very_different"
  ) => string[];
  DIMENSION_LABELS: Record<DimensionKey, string>;
  DIMENSION_DEFINITIONS: Record<DimensionKey, string>;
  LEVEL_LABELS: Record<"low" | "medium" | "high", string>;
  SIMILARITY_LABELS: Record<"low" | "medium" | "high", string>;
  SAFETY_STATEMENT?: string;
  now?: Date;
}

export const ComparePdfCompactDocument: React.FC<
  ComparePdfCompactDocumentProps
> = ({
  nameA,
  nameB,
  comparison,
  attemptA,
  attemptB,
  topDimensionA,
  topDimensionB,
  overallSimilarity,
  misunderstandingRisk,
  largestDiff,
  similarities,
  differences,
  getDimensionNameForSnapshot,
  generateMindSnapshot,
  getMisunderstandingRiskText,
  getSimilarityComplementarySentence,
  getAlignmentLabel,
  generateDimensionSummary,
  getConversationStarters,
  DIMENSION_LABELS,
  DIMENSION_DEFINITIONS,
  LEVEL_LABELS,
  SIMILARITY_LABELS,
  SAFETY_STATEMENT,
  now,
}) => {
  const safeNow = now ?? new Date();
  const dateStr = formatPersianDate(safeNow);
  
  if (import.meta.env.DEV) {
    console.log("[PDF] now:", safeNow.toISOString(), formatPersianDate(safeNow));
  }

  const dimensionKeys: DimensionKey[] = [
    "stickiness",
    "pastBrooding",
    "futureWorry",
    "interpersonal",
  ];

  // Get dimension for conversation starters (use largest diff or first similarity)
  const dimensionForStarters =
    largestDiff?.key || similarities[0] || dimensionKeys[0];
  const dimForStarters = comparison?.dimensions?.[dimensionForStarters];
  const relationForStarters =
    dimForStarters?.relation || "similar";

  return (
    <Document>
      {/* Cover Page */}
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

      {/* Page 1: Overview */}
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
                marginBottom: 12,
                justifyContent: "center" as const,
              }}
            >
              <View style={[styles.chip, styles.chipPrimary]}>
                <Text>
                  شباهت کلی: {SIMILARITY_LABELS[overallSimilarity]}
                </Text>
              </View>
              <View style={[styles.chip, styles.chipOrange]}>
                <Text>
                  ریسک سوءتفاهم:{" "}
                  {misunderstandingRisk === "low"
                    ? "کم"
                    : misunderstandingRisk === "medium"
                    ? "متوسط"
                    : "زیاد"}
                </Text>
              </View>
            </View>
            <Text style={styles.textSmall}>
              {getMisunderstandingRiskText(misunderstandingRisk)}
            </Text>
            {largestDiff && (
              <Text style={styles.textCenter}>
                بزرگ‌ترین تفاوت ذهنی شما در:{" "}
                {getDimensionNameForSnapshot(largestDiff.key)}
              </Text>
            )}
            <Text style={styles.textSmall}>
              {getSimilarityComplementarySentence(overallSimilarity)}
            </Text>
          </View>
        </View>

        {/* Mind Profiles */}
        {(topDimensionA || topDimensionB) && (
          <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
            <View wrap={false} style={styles.sectionTitleWrapper}>
              <Text style={styles.sectionTitle}>سبک‌های ذهنی</Text>
            </View>
            {topDimensionA && (
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.card}>
                <Text style={styles.sectionSubtitle}>سبک ذهنی {nameA}</Text>
                <Text style={styles.text}>
                  {generateMindSnapshot(
                    nameA,
                    topDimensionA,
                    attemptA.dimension_scores
                  )}
                </Text>
              </View>
            )}
            {topDimensionB && (
              <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.card}>
                <Text style={styles.sectionSubtitle}>سبک ذهنی {nameB}</Text>
                <Text style={styles.text}>
                  {generateMindSnapshot(
                    nameB,
                    topDimensionB,
                    attemptB.dimension_scores
                  )}
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.pageNumber}>1</Text>
      </Page>

      {/* Page 2: Dimension Map + Similarities/Differences + CTA */}
      <Page size="A4" style={styles.page}>
        <View wrap={false} style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitle}>نقشه‌ی ذهنی</Text>
        </View>
        {dimensionKeys.map((key) => {
          const dim = comparison?.dimensions?.[key];
          if (!dim) return null;
          const isUnknown =
            isNaN(dim.delta ?? NaN) ||
            isNaN(dim.aScore ?? NaN) ||
            isNaN(dim.bScore ?? NaN);
          const alignment = isUnknown
            ? "نامشخص"
            : getAlignmentLabel(dim.delta ?? 0);

          // Determine background color for alignment badge
          const badgeBgColor =
            alignment === "همسو"
              ? ALIGN_BG.aligned
              : alignment === "متفاوت"
              ? ALIGN_BG.different
              : ALIGN_BG.veryDifferent;

          return (
            <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} key={key} style={styles.card}>
              {/* Header row - keep together */}
              <View wrap={false} style={styles.row}>
                <Text style={styles.sectionSubtitle}>
                  {DIMENSION_LABELS[key]}
                </Text>
                <Text
                  style={[
                    styles.textSmall,
                    {
                      backgroundColor: badgeBgColor,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
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
                    {isUnknown
                      ? "نامشخص"
                      : LEVEL_LABELS[dim.aLevel] || "نامشخص"}
                  </Text>
                </View>
                <View style={styles.colSpacer} />
                <View style={styles.col}>
                  <Text style={styles.textSmall}>
                    {nameB}:{" "}
                    {isUnknown
                      ? "نامشخص"
                      : LEVEL_LABELS[dim.bLevel] || "نامشخص"}
                  </Text>
                </View>
              </View>
              <Text style={styles.textSmall}>
                {isUnknown
                  ? "این بُعد قابل محاسبه نیست (داده ناقص است)."
                  : generateDimensionSummary(
                      dim.relation,
                      dim.aLevel,
                      dim.bLevel
                    )}
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
            {similarities.length > 0 ? (
              similarities.map((key) => (
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
            {differences.length > 0 ? (
              differences.map((key) => (
                <View key={key} style={styles.listItem}>
                  <Text style={[styles.bullet, styles.bulletBox]}>•</Text>
                  <Text style={[styles.textSmall, styles.listText]}>
                    {DIMENSION_LABELS[key]}
                    {comparison?.dimensions?.[key]?.relation ===
                      "very_different" && " (خیلی متفاوت)"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.textSmall}>
                در این نتایج، تفاوت چشمگیری بین شما دیده نشد. این یعنی در چند
                الگوی کلیدی، واکنش ذهنی‌تان شبیه‌تر است.
              </Text>
            )}
          </View>
        </View>

        {/* Conversation Starters - Simple list, not nested cards */}
        <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
          <View wrap={false} style={styles.sectionTitleWrapper}>
            <Text style={styles.sectionTitle}>شروع گفت‌وگو</Text>
          </View>
          {getConversationStarters(
            dimensionForStarters,
            relationForStarters
          ).map((q, idx) => (
            <View wrap={false} minPresenceAhead={60} key={idx} style={styles.conversationStarterItem}>
              <Text style={styles.textSmall}>{q}</Text>
            </View>
          ))}
        </View>

        {/* Safety Statement (if provided and space allows) */}
        {SAFETY_STATEMENT && (
          <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.section}>
            <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={[styles.card, { backgroundColor: COLORS.primaryLightest }]}>
              <Text style={styles.textSmall}>{SAFETY_STATEMENT}</Text>
            </View>
          </View>
        )}

        {/* CTA/Invite Link - Only at end, separated from content */}
        <PdfCtaLink />
        <Text style={styles.pageNumber}>2</Text>
      </Page>
    </Document>
  );
};

