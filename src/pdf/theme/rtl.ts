import { StyleSheet } from "@react-pdf/renderer";

/**
 * RTL (Right-to-Left) helper styles for Persian/Arabic PDFs
 * Provides reusable styles for proper RTL rendering in react-pdf
 * 
 * Core principle: Content-driven layout (print-style), NOT screen-style.
 * Avoid flex: 1 on content blocks to prevent empty vertical gaps.
 */
export const PDF_RTL = StyleSheet.create({
  // Base RTL page style with Peyda font
  rtlPage: {
    fontFamily: "Peyda",
    direction: "rtl" as const,
  },

  // RTL text alignment
  rtlText: {
    textAlign: "right" as const,
  },
  rtlTextCenter: {
    textAlign: "center" as const,
  },

  // RTL row layout (reversed flex direction)
  rowRtl: {
    flexDirection: "row-reverse" as const,
    alignItems: "center" as const,
  },
  rowRtlStart: {
    flexDirection: "row-reverse" as const,
    alignItems: "flex-start" as const,
  },
  rowRtlEnd: {
    flexDirection: "row-reverse" as const,
    alignItems: "flex-end" as const,
  },

  // RTL column layout (natural flow, no flex growth)
  colRtl: {
    flexDirection: "column" as const,
    alignItems: "stretch" as const,
  },

  // Vertical flow helpers (content-driven spacing)
  section: {
    marginBottom: 16,
  },
  paragraph: {
    marginBottom: 8,
  },
  tightParagraph: {
    marginBottom: 4,
  },

  // Gap alternatives using margins (react-pdf has limited gap support)
  // Values match the name (gap4 = 4px, gap6 = 6px, etc.)
  gap4: {
    marginLeft: 4,
  },
  gap6: {
    marginLeft: 6,
  },
  gap8: {
    marginLeft: 8,
  },
  gap12: {
    marginLeft: 12,
  },
  gapVertical4: {
    marginBottom: 4,
  },
  gapVertical6: {
    marginBottom: 6,
  },
  gapVertical8: {
    marginBottom: 8,
  },
  gapVertical12: {
    marginBottom: 12,
  },
});

