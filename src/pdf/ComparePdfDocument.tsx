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
import { PDF_RTL } from "../theme/rtl";
import { ITEM_MIN_PRESENCE } from "../theme/pagination";

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
    marginBottom: 16,
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
    marginBottom: 12,
  },
  cardHighlight: {
    backgroundColor: COLORS.primaryLightest,
    border: `1px solid ${COLORS.primaryLight}`,
  },
  text: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 1.9,
    textAlign: "right" as const,
    marginBottom: 8,
  },
  textSmall: {
    fontSize: 10,
    color: COLORS.textLight,
    lineHeight: 1.7,
    textAlign: "right" as const,
    marginBottom: 6,
  },
  textCenter: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 1.9,
    textAlign: "center",
    marginBottom: 10,
  },
  chip: {
    display: "inline-block",
    padding: "8px 16px",
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
    marginBottom: 12,
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
    marginVertical: 12, // Reduced from 20 for denser content
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
    marginBottom: 10,
    alignItems: "flex-start" as const,
  },
  bullet: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: "bold" as const,
  },
  inviteLink: {
    marginTop: 16, // Reduced from 32 for denser content
    paddingTop: 16, // Reduced from 20
    borderTop: `2px solid ${COLORS.border}`,
  },
  inviteText: {
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 1.8,
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

interface ComparePdfDocumentProps {
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
  generateCentralInterpretation: (
    dimension: DimensionKey,
    nameA: string,
    nameB: string,
    aLevel: "low" | "medium" | "high",
    bLevel: "low" | "medium" | "high",
    aScore: number,
    bScore: number,
    relation: "similar" | "different" | "very_different",
    direction: "a_higher" | "b_higher" | "equal"
  ) => string;
  generateNeutralBlendedInterpretation: () => string;
  generateMisunderstandingLoop: (
    dimension: DimensionKey,
    relation: "similar" | "different" | "very_different"
  ) => string[];
  getCombinedContextualTriggers: (
    dimension: DimensionKey,
    topDimensionB?: DimensionKey
  ) => string[];
  getSeenUnseenConsequences: (dimension: DimensionKey) => {
    unseen: string[];
    seen: string[];
  };
  generateEmotionalExperience: (
    dimension: DimensionKey,
    nameA: string,
    nameB: string,
    aLevel: "low" | "medium" | "high",
    bLevel: "low" | "medium" | "high",
    relation: "similar" | "different" | "very_different"
  ) => {
    shared?: string;
    forA: string;
    forB: string;
  };
  getConversationStarters: (
    dimension: DimensionKey,
    relation: "similar" | "different" | "very_different"
  ) => string[];
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
  DIMENSION_LABELS: Record<DimensionKey, string>;
  DIMENSION_DEFINITIONS: Record<DimensionKey, string>;
  LEVEL_LABELS: Record<"low" | "medium" | "high", string>;
  SIMILARITY_LABELS: Record<"low" | "medium" | "high", string>;
  SAFETY_STATEMENT: string;
}

const INVITE_LINK_TEXT =
  "اگر دوست داری الگوی ذهنی خودت رو دقیق‌تر بشناسی،\nمی‌تونی این آزمون سنجش نشخوار فکری رو تکمیل کنی:";
const INVITE_LINK_URL = "https://zaya.io/testruminationnewtest";

export const ComparePdfDocument: React.FC<ComparePdfDocumentProps> = ({
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
  generateCentralInterpretation,
  generateNeutralBlendedInterpretation,
  generateMisunderstandingLoop,
  getCombinedContextualTriggers,
  getSeenUnseenConsequences,
  generateEmotionalExperience,
  getConversationStarters,
  getMisunderstandingRiskText,
  getSimilarityComplementarySentence,
  getAlignmentLabel,
  generateDimensionSummary,
  DIMENSION_LABELS,
  DIMENSION_DEFINITIONS,
  LEVEL_LABELS,
  SIMILARITY_LABELS,
  SAFETY_STATEMENT,
}) => {
  const dateStr = new Date().toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dimensionKeys: DimensionKey[] = [
    "stickiness",
    "pastBrooding",
    "futureWorry",
    "interpersonal",
  ];

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
        <View style={styles.section}>
          <View style={[styles.card, styles.cardHighlight]}>
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>سبک‌های ذهنی</Text>
            {topDimensionA && (
              <View style={styles.card}>
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
              <View style={styles.card}>
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

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.inviteLink}>
            <Text style={styles.inviteText}>{INVITE_LINK_TEXT}</Text>
            <Text style={styles.inviteUrl}>{INVITE_LINK_URL}</Text>
          </View>
          <Text style={{ marginTop: 12, fontSize: 8 }}>
            آکادمی افران - آزمون سنجش نشخوار فکری
          </Text>
        </View>
        <Text style={styles.pageNumber}>1</Text>
      </Page>

      {/* Content Page 2: Dimension Map */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>نقشه‌ی ذهنی</Text>
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
                      padding: "4px 12px",
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>شباهت‌ها و تفاوت‌های کلیدی</Text>
          <View style={styles.card}>
            <Text style={styles.sectionSubtitle}>شباهت‌ها</Text>
            {similarities.length > 0 ? (
              similarities.map((key) => (
                <View key={key} style={styles.listItem}>
                  <Text style={styles.textSmall}>
                    <Text style={styles.bullet}>• </Text>
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
                  <Text style={styles.textSmall}>
                    <Text style={styles.bullet}>• </Text>
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

        <Text style={styles.pageNumber}>2</Text>
      </Page>

      {/* Additional pages for detailed content */}
      {(() => {
        const maxDelta = largestDiff?.delta || 0;
        const dimensionToUse =
          maxDelta < 0.8
            ? similarities[0] || dimensionKeys[0]
            : largestDiff?.key || dimensionKeys[0];
        if (!dimensionToUse) return null;

        const dim = comparison?.dimensions?.[dimensionToUse];
        if (!dim) return null;

        const relation =
          maxDelta < 0.8
            ? "similar"
            : (comparison?.dimensions?.[dimensionToUse]?.relation ??
                "similar");

        return (
          <>
            {/* Central Interpretation Page */}
            <Page size="A4" style={styles.page}>
              <Text style={styles.sectionTitle}>تفسیر مرکزی</Text>
              <View style={[styles.card, styles.cardHighlight]}>
                <Text style={styles.text}>
                  {maxDelta < 0.8
                    ? generateNeutralBlendedInterpretation()
                    : generateCentralInterpretation(
                        dimensionToUse,
                        nameA,
                        nameB,
                        dim.aLevel,
                        dim.bLevel,
                        dim.aScore,
                        dim.bScore,
                        relation,
                        dim.direction
                      )}
                </Text>
              </View>

              {/* Misunderstanding Loop */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {relation === "similar"
                    ? "وقتی این همسویی فعال می‌شود، معمولاً این چرخه شکل می‌گیرد:"
                    : "وقتی این تفاوت فعال می‌شود، معمولاً این چرخه شکل می‌گیرد:"}
                </Text>
                <View style={styles.card}>
                  {generateMisunderstandingLoop(dimensionToUse, relation).map(
                    (step, index) => (
                      <View key={index} style={styles.listItem}>
                        <Text style={styles.bullet}>{index + 1}.</Text>
                        <Text style={styles.textSmall}>{step}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>

              {/* Triggers */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>موقعیت‌های فعال‌ساز</Text>
                <View style={styles.card}>
                  {getCombinedContextualTriggers(
                    dimensionToUse,
                    topDimensionB
                  ).map((trigger, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.textSmall}>{trigger}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.pageNumber}>3</Text>
            </Page>

            {/* Consequences and Emotional Experience Page */}
            <Page size="A4" style={styles.page}>
              {/* Consequences */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  پیامد دیده نشدن / دیده شدن
                </Text>
                <View style={styles.row}>
                  <View style={[styles.col, styles.card]}>
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        { color: COLORS.red, marginBottom: 12 },
                      ]}
                    >
                      اگر دیده نشود
                    </Text>
                    {getSeenUnseenConsequences(dimensionToUse).unseen.map(
                      (item, idx) => (
                        <View key={idx} style={styles.listItem}>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={styles.textSmall}>{item}</Text>
                        </View>
                      )
                    )}
                  </View>
                  <View style={[styles.col, styles.card]}>
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        { color: COLORS.green, marginBottom: 12 },
                      ]}
                    >
                      اگر دیده شود
                    </Text>
                    {getSeenUnseenConsequences(dimensionToUse).seen.map(
                      (item, idx) => (
                        <View key={idx} style={styles.listItem}>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={styles.textSmall}>{item}</Text>
                        </View>
                      )
                    )}
                  </View>
                </View>
              </View>

              {/* Emotional Experience */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {relation === "similar"
                    ? "این همسویی ممکن است این‌طور حس شود"
                    : "این تفاوت ممکن است این‌طور حس شود"}
                </Text>
                <View style={styles.card}>
                  {(() => {
                    const emotionalExp = generateEmotionalExperience(
                      dimensionToUse,
                      nameA,
                      nameB,
                      dim.aLevel,
                      dim.bLevel,
                      relation
                    );
                    return emotionalExp.shared ? (
                      <Text style={styles.text}>{emotionalExp.shared}</Text>
                    ) : (
                      <>
                        <Text style={styles.text}>
                          <Text style={{ fontWeight: "bold" }}>{nameA}:</Text>{" "}
                          {emotionalExp.forA}
                        </Text>
                        <View style={styles.divider} />
                        <Text style={styles.text}>
                          <Text style={{ fontWeight: "bold" }}>{nameB}:</Text>{" "}
                          {emotionalExp.forB}
                        </Text>
                      </>
                    );
                  })()}
                </View>
              </View>

              {/* Conversation Starters */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>شروع گفت‌وگو</Text>
                <View style={styles.card}>
                  {getConversationStarters(dimensionToUse, relation).map(
                    (q, idx) => (
                      <View
                        key={idx}
                        style={[styles.card, { marginBottom: 12, padding: 12 }]}
                      >
                        <Text style={styles.textSmall}>{q}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>

              {/* Final Summary */}
              <View style={styles.section}>
                <View style={styles.card}>
                  <Text style={styles.textCenter}>
                    این صفحه قرار نیست چیزی را درست یا غلط کند.{"\n"}
                    فقط نشان می‌دهد ذهن‌ها چطور متفاوت واکنش نشان می‌دهند.{"\n"}
                    دیدن این تفاوت‌ها می‌تواند نقطه‌ی شروع فهم باشد، نه بحث.
                  </Text>
                </View>
              </View>

              {/* Safety Statement */}
              <View style={styles.section}>
                <View style={[styles.card, { backgroundColor: COLORS.primaryLightest }]}>
                  <Text style={styles.textSmall}>{SAFETY_STATEMENT}</Text>
                </View>
              </View>

              {/* Footer with invite link */}
              <View style={styles.footer}>
                <View style={styles.inviteLink}>
                  <Text style={styles.inviteText}>{INVITE_LINK_TEXT}</Text>
                  <Text style={styles.inviteUrl}>{INVITE_LINK_URL}</Text>
                </View>
                <Text style={{ marginTop: 12, fontSize: 8 }}>
                  آکادمی افران - آزمون سنجش نشخوار فکری
                </Text>
              </View>
              <Text style={styles.pageNumber}>4</Text>
            </Page>
          </>
        );
      })()}
    </Document>
  );
};
