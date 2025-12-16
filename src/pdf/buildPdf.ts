import { pdf } from "@react-pdf/renderer";
import { Font } from "@react-pdf/renderer";
import React from "react";

// Import TTF fonts using Vite's ?url suffix for production-safe asset URLs
// Vite will handle bundling and provide the correct URL at build time
import peydaRegularUrl from "../assets/fonts/Peyda-Regular.ttf?url";
import peydaBoldUrl from "../assets/fonts/Peyda-Bold.ttf?url";

// Register Peyda font once when module loads
// Using Vite asset URLs ensures fonts are properly bundled and accessible
let fontRegistered = false;

function registerPeydaFont() {
  if (fontRegistered) {
    return;
  }

  try {
    Font.register({
      family: "Peyda",
      fonts: [
        {
          src: peydaRegularUrl,
          fontWeight: 400,
        },
        {
          src: peydaBoldUrl,
          fontWeight: 700,
        },
      ],
    });

    fontRegistered = true;

    if (import.meta.env.DEV) {
      console.log("[buildPdf] Peyda font registered with Vite asset URLs");
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[buildPdf] Error registering Peyda font:", error);
      console.warn("[buildPdf] PDF will fall back to system fonts");
    }
    // Don't throw - let it fall back to system fonts
    // PDF will still work, just without custom font
  }
}

// Register font immediately when module loads
// This ensures fonts are available for all PDF generation (both buildPdf.ts and pdfGenerator.ts)
registerPeydaFont();

/**
 * Generates a PDF blob from a React PDF Document component
 * @param document - React element representing the PDF document
 * @returns Promise that resolves to a Blob
 */
export async function buildPdfBlob(
  document: React.ReactElement
): Promise<Blob> {
  // Font is already registered at module load time
  // registerPeydaFont() is called when this module is imported

  try {
    const blob = await pdf(document).toBlob();
    return blob;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[buildPdf] Error generating PDF:", error);
    }
    throw new Error(
      `خطا در تولید PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Downloads a PDF blob as a file
 * @param blob - PDF blob to download
 * @param filename - Name of the file (should include .pdf extension)
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up after a delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Convenience function to build and download a PDF
 * @param document - React element representing the PDF document
 * @param filename - Name of the file (should include .pdf extension)
 */
export async function buildAndDownloadPdf(
  document: React.ReactElement,
  filename: string
): Promise<void> {
  const blob = await buildPdfBlob(document);
  downloadBlob(blob, filename);
}

