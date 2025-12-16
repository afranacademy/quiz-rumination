import { Font } from "@react-pdf/renderer";

/**
 * @deprecated DO NOT USE THIS FILE FOR @react-pdf/renderer
 * 
 * This file uses WOFF fonts which are not recommended for react-pdf.
 * Use TTF/OTF fonts instead via src/pdf/buildPdf.ts
 * 
 * IMPORTANT: Do not use WOFF fonts in react-pdf; use TTF/OTF only.
 * The correct font registration is in src/pdf/buildPdf.ts using:
 * - Peyda-Regular.ttf
 * - Peyda-Bold.ttf
 * - Family name: "Peyda"
 * 
 * This file is kept for reference only and may be removed in the future.
 */

// Cache to prevent multiple registrations
let fontRegistered = false;

/**
 * @deprecated Use src/pdf/buildPdf.ts registerPeydaFont() instead
 * Registers PeydaWeb font for @react-pdf/renderer (WOFF - NOT RECOMMENDED)
 * This must be called before rendering any PDF documents
 * Uses direct URLs to avoid DataView errors with WOFF files
 */
export async function registerPeydaWebFont(): Promise<void> {
  // Skip if already registered
  if (fontRegistered) {
    return;
  }

  try {
    const getFontUrl = (filename: string) => {
      if (typeof window !== "undefined") {
        return `${window.location.origin}/fonts/${filename}`;
      }
      return `/fonts/${filename}`;
    };

    // Register with direct URLs - @react-pdf/renderer handles WOFF files better this way
    Font.register({
      family: "PeydaWeb",
      fonts: [
        {
          src: getFontUrl("PeydaWeb-Regular.woff"),
          fontWeight: 400,
        },
        {
          src: getFontUrl("PeydaWeb-Medium.woff"),
          fontWeight: 500,
        },
        {
          src: getFontUrl("PeydaWeb-Bold.woff"),
          fontWeight: 700,
        },
      ],
    });

    fontRegistered = true;

    if (import.meta.env.DEV) {
      console.log("[pdfFonts] PeydaWeb font registered successfully");
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[pdfFonts] Error registering PeydaWeb font:", error);
    }
    // Don't throw - let it fall back to system fonts
    // The PDF will still work, just without custom font
  }
}

