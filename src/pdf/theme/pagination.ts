import { StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS } from "./colors";

/**
 * Pagination helpers for react-pdf
 * Prevents widows/orphans and keeps content blocks together
 */

/**
 * Minimum presence ahead (in points) to keep an item on the current page
 * If less than this space remains, the item will move to the next page
 * Tuned for A4 pages with ~36px padding
 */
export const ITEM_MIN_PRESENCE = 120;

/**
 * Style for list item containers that should not break across pages
 */
export const listItemContainer = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: PDF_COLORS.background,
    border: `1px solid ${PDF_COLORS.border}`,
    borderRadius: 4,
  },
  containerHighlight: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: PDF_COLORS.primaryLightest,
    border: `1px solid ${PDF_COLORS.primaryLight}`,
    borderRadius: 4,
  },
});

/**
 * Usage pattern for keeping content together:
 * 
 * <View wrap={false} minPresenceAhead={ITEM_MIN_PRESENCE}>
 *   <Text>Content that should not split across pages</Text>
 * </View>
 * 
 * This ensures:
 * - wrap={false}: Prevents the View from breaking across pages
 * - minPresenceAhead: If less than this space remains, move entire block to next page
 */

