import { COURSE_LINK, EPISODE0_LINK } from "@/constants/links";

/**
 * Single source of truth for external links used throughout the application
 * @deprecated Use constants/links.ts instead
 */
export const LINKS = {
  MIND_CHATTER_COURSE: COURSE_LINK,
  EPISODE_ZERO: EPISODE0_LINK,
} as const;

