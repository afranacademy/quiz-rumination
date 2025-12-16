import { StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS } from "./colors";

/**
 * Layout styles for PDF documents
 */
export const PDF_LAYOUT = StyleSheet.create({
  // Page styles
  coverPage: {
    flexDirection: "column" as const,
    backgroundColor: PDF_COLORS.coverBg,
    padding: 0,
    direction: "rtl" as const,
  },
  contentPage: {
    flexDirection: "column" as const,
    backgroundColor: PDF_COLORS.background,
    padding: 36, // Reduced from 50 for denser content pages
    direction: "rtl" as const,
  },
  
  // Cover content (content-driven, no flex growth)
  // Only used on cover pages - reduced padding for better balance
  coverContent: {
    flexDirection: "column" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingVertical: 56, // Reduced from 80 for tighter cover layout
    paddingHorizontal: 60,
    // Removed minHeight: "100%" - let content determine height naturally
  },
  coverLogo: {
    width: 100,
    height: 100,
    marginBottom: 40,
  },
  
  // Header (intrinsic height, no flex growth)
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: `2px solid ${PDF_COLORS.primaryDarkest}`,
  },
  
  // Sections (content-driven spacing)
  section: {
    marginBottom: 12,
  },
  sectionDivider: {
    borderBottom: `1px solid ${PDF_COLORS.border}`,
  },
  
  // Cards (intrinsic height, wrap content)
  card: {
    backgroundColor: PDF_COLORS.background,
    border: `1px solid ${PDF_COLORS.border}`,
    borderRadius: 4,
    padding: 16, // Reduced from 18 for tighter spacing
    marginBottom: 10,
  },
  cardHighlight: {
    backgroundColor: PDF_COLORS.primaryLightest,
    border: `1px solid ${PDF_COLORS.primaryLight}`,
  },
  
  // Dividers
  divider: {
    borderTop: `1px solid ${PDF_COLORS.border}`,
    marginVertical: 8,
  },
  
  // Lists
  listItem: {
    flexDirection: "row" as const,
    marginBottom: 10,
    alignItems: "flex-start" as const,
  },
  bullet: {
    fontSize: 14,
    marginLeft: 12,
    marginTop: 2,
    fontWeight: "bold" as const,
  },
  
  // Footer
  footer: {
    position: "absolute" as const,
    bottom: 30,
    left: 50,
    right: 50,
    paddingTop: 16,
    borderTop: `1px solid ${PDF_COLORS.border}`,
  },
  pageNumber: {
    position: "absolute" as const,
    bottom: 20,
    left: 50,
    right: 50,
  },
  
  // Invite link section
  inviteLink: {
    marginTop: 16, // Reduced from 32 for denser content
    paddingTop: 16, // Reduced from 20
    borderTop: `2px solid ${PDF_COLORS.border}`,
  },
  
  // Row/Column layouts (avoid flex: 1 on content)
  row: {
    flexDirection: "row-reverse" as const, // RTL default
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  col: {
    // Remove flex: 1 to prevent forced growth
    paddingHorizontal: 12,
  },
});

