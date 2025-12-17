/**
 * Single source of truth for external links used throughout the application
 */

// Base URL for the application (landing page)
// In browser: uses window.location.origin
// In server/PDF: uses VITE_APP_URL env var or fallback
const APP_BASE_URL = import.meta.env.VITE_APP_URL || 
  (typeof window !== "undefined" ? window.location.origin : "https://afran.academy");

// Test link (for inviting users to take the rumination test)
// Points to landing page where name and phone are collected
export const TEST_LINK = `${APP_BASE_URL}/`;

// Course link (for the "دوره ذهن‌وراج" CTA button)
// Used in: medium level, high level, and Compare page
export const COURSE_LINK = "https://zaya.io/testruminationnewtest";

// Episode 0 (free episode CTA)
export const EPISODE0_LINK = "https://zaya.io/epizod0zeneveraj";

