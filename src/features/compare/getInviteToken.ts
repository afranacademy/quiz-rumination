/**
 * Helper functions for managing compare invite token persistence
 * Token is only set in the invite route (/compare/invite/:token)
 * and read in QuizPage submit handler
 */

const INVITE_TOKEN_STORAGE_KEY = "compare_invite_token";

/**
 * Get invite token from URL query parameter (invite=...)
 * @param searchParams - URLSearchParams or window.location.search
 * @returns Trimmed token or null
 */
export function getInviteTokenFromUrl(searchParams?: URLSearchParams | string): string | null {
  const params = typeof searchParams === "string" 
    ? new URLSearchParams(searchParams)
    : searchParams || new URLSearchParams(window.location.search);
  
  const token = params.get("invite")?.trim() || null;
  return token;
}

/**
 * Get invite token from sessionStorage
 * @returns Trimmed token or null
 */
export function getInviteTokenFromStorage(): string | null {
  const token = sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY)?.trim() || null;
  return token;
}

/**
 * Store invite token in sessionStorage
 * Only call this from the invite route page (/compare/invite/:token)
 * @param token - The invite token to store
 */
export function storeInviteToken(token: string): void {
  const trimmedToken = token.trim();
  sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, trimmedToken);
  
  if (import.meta.env.DEV) {
    console.log("[getInviteToken] Stored invite token:", {
      token: trimmedToken.substring(0, 12) + "...",
      length: trimmedToken.length,
      key: INVITE_TOKEN_STORAGE_KEY,
    });
  }
}

/**
 * Get invite token safely: URL query param first, then sessionStorage fallback
 * @param searchParams - Optional URLSearchParams or search string
 * @returns Trimmed token or null
 */
export function getInviteTokenSafe(searchParams?: URLSearchParams | string): string | null {
  // Priority: URL query param > sessionStorage
  const tokenFromUrl = getInviteTokenFromUrl(searchParams);
  if (tokenFromUrl) {
    // If found in URL, also store it in sessionStorage for persistence
    storeInviteToken(tokenFromUrl);
    return tokenFromUrl;
  }
  
  return getInviteTokenFromStorage();
}

/**
 * Clear invite token from sessionStorage
 * Use this when compare flow is complete or cancelled
 */
export function clearInviteToken(): void {
  sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
  
  if (import.meta.env.DEV) {
    console.log("[getInviteToken] Cleared invite token from storage");
  }
}

