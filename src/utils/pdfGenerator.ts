import { pdf, type DocumentProps } from "@react-pdf/renderer";
// import { toast } from "sonner"; // Unused
import type { ReactElement } from "react";
// Import buildPdf to trigger font registration (Peyda TTF fonts)
// This ensures fonts are registered before PDF generation
import "../pdf/buildPdf";

/**
 * Sanitizes a name for use in filenames
 */
function sanitizeFilename(name: string | null | undefined): string {
  if (!name) return "unknown";
  return name
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

/**
 * Generates a PDF blob from a React PDF Document component
 */
export async function generatePdfBlob(
  document: ReactElement<DocumentProps>
): Promise<Blob> {
  try {
    // Font registration is handled in src/pdf/buildPdf.ts
    // For PDFs using this utility, ensure fonts are registered via buildPdf.ts first
    // or import and call registerPeydaFont from buildPdf.ts if needed
    
    const blob = await pdf(document).toBlob();
    return blob;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[pdfGenerator] Error generating PDF:", error);
    }
    throw new Error(
      `خطا در تولید PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Downloads a PDF blob
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Shares a PDF file if supported, otherwise downloads it
 * Returns method used and success status
 */
export async function sharePdf(
  blob: Blob,
  filename: string
): Promise<{ method: "share" | "download"; success: boolean; error?: string }> {
  // Check if file sharing is supported
  if (typeof navigator.share !== "undefined") {
    try {
      const file = new File([blob], filename, { type: "application/pdf" });

      // First check if we can share files (more reliable check)
      if (navigator.canShare) {
        const canShareFiles = navigator.canShare({ files: [file] });
        if (canShareFiles) {
          await navigator.share({
            files: [file],
          });

          if (import.meta.env.DEV) {
            console.log("[pdfGenerator] PDF shared successfully");
          }

          return { method: "share", success: true };
        } else {
          // canShare returned false - file sharing not supported
          if (import.meta.env.DEV) {
            console.log(
              "[pdfGenerator] canShare returned false, file sharing not supported"
            );
          }
          // Fall through to download
        }
      } else {
        // No canShare method - try direct share (some browsers support it)
        try {
          await navigator.share({
            files: [file],
          });

          if (import.meta.env.DEV) {
            console.log(
              "[pdfGenerator] PDF shared successfully (direct, no canShare)"
            );
          }

          return { method: "share", success: true };
        } catch (directError: unknown) {
          if (directError instanceof Error) {
            if (directError.name === "AbortError") {
              return { method: "share", success: false, error: "canceled" };
            }
            // Check if it's a "not supported" error
            const errorMsg = directError.message.toLowerCase();
            if (
              directError.name === "NotSupportedError" ||
              errorMsg.includes("not supported") ||
              errorMsg.includes("not allowed")
            ) {
              if (import.meta.env.DEV) {
                console.log(
                  "[pdfGenerator] File sharing not supported by browser"
                );
              }
              // Fall through to download
            } else {
              // Other error - fall through to download
              if (import.meta.env.DEV) {
                console.warn(
                  "[pdfGenerator] Share error:",
                  directError.name,
                  directError.message
                );
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return { method: "share", success: false, error: "canceled" };
      }

      if (import.meta.env.DEV) {
        console.warn(
          "[pdfGenerator] Share failed, falling back to download:",
          error
        );
      }
    }
  }

  // Fallback to download
  downloadPdf(blob, filename);
  return { method: "download", success: true };
}

/**
 * Generates filename for compare PDF
 */
export function generateComparePdfFilename(
  nameA: string | null,
  nameB: string | null
): string {
  const sanitizedA = sanitizeFilename(nameA);
  const sanitizedB = sanitizeFilename(nameB);
  const date = new Date().toISOString().split("T")[0];
  return `afran-compare-${sanitizedA}-${sanitizedB}-${date}.pdf`;
}

/**
 * Generates filename for result PDF
 */
export function generateResultPdfFilename(): string {
  const date = new Date().toISOString().split("T")[0];
  return `afran-result-${date}.pdf`;
}

