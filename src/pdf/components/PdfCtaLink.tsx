import React from "react";
import { View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS } from "../theme/colors";
import { ITEM_MIN_PRESENCE } from "../theme/pagination";
import { CTA_INTRO_TEXT, CTA_TEXT, CTA_URL } from "../../utils/inviteCta";

const styles = StyleSheet.create({
  ctaContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: `2px solid ${PDF_COLORS.border}`,
    alignItems: "center" as const,
  },
  ctaText: {
    fontSize: 11,
    color: PDF_COLORS.textLight,
    lineHeight: 1.7,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  ctaButton: {
    backgroundColor: PDF_COLORS.primaryLightest,
    border: `2px solid ${PDF_COLORS.primaryDark}`,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    textAlign: "center" as const,
    alignSelf: "center" as const,
    width: "auto",
    minWidth: 200,
    maxWidth: "90%",
    marginBottom: 4,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: "bold" as const,
    color: PDF_COLORS.primaryDarkest,
    textAlign: "center" as const,
  },
  footerText: {
    marginTop: 8,
    fontSize: 8,
    color: PDF_COLORS.textLighter,
    textAlign: "center" as const,
  },
});

interface PdfCtaLinkProps {
  showFooterText?: boolean;
}

/**
 * Reusable CTA link component for PDFs
 * Renders a button-like link with proper styling and no visible URL
 */
export const PdfCtaLink: React.FC<PdfCtaLinkProps> = ({
  showFooterText = true,
}) => {
  return (
    <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE} style={styles.ctaContainer}>
      <Text style={styles.ctaText}>{CTA_INTRO_TEXT}</Text>
      <Link src={CTA_URL} style={styles.ctaButton}>
        <Text style={styles.ctaButtonText}>{CTA_TEXT}</Text>
      </Link>
      {showFooterText && (
        <Text style={styles.footerText}>
          آکادمی افران - آزمون سنجش نشخوار فکری
        </Text>
      )}
    </View>
  );
};

