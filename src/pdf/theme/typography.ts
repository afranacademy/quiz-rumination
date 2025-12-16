import { StyleSheet } from "@react-pdf/renderer";

/**
 * Typography styles for PDF documents
 */
export const PDF_TYPOGRAPHY = StyleSheet.create({
  // Cover page typography
  coverTitle: {
    fontSize: 36,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textAlign: "center" as const,
  },
  coverSubtitle: {
    fontSize: 14,
    lineHeight: 1.8,
    textAlign: "center" as const,
  },
  coverDate: {
    fontSize: 11,
    textAlign: "center" as const,
  },
  
  // Header typography
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "right" as const,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: "right" as const,
  },
  
  // Section typography
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "right" as const,
    paddingBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right" as const,
  },
  
  // Body typography
  body: {
    fontSize: 12,
    lineHeight: 1.7,
    textAlign: "right" as const,
  },
  bodySmall: {
    fontSize: 10,
    lineHeight: 1.6,
    textAlign: "right" as const,
  },
  bodyCenter: {
    fontSize: 12,
    lineHeight: 1.7,
    textAlign: "center" as const,
  },
  
  // Footer typography
  footer: {
    fontSize: 9,
    textAlign: "center" as const,
  },
  pageNumber: {
    fontSize: 9,
    textAlign: "center" as const,
  },
});

