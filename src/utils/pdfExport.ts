import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
 * A4 dimensions in pixels at 96 DPI
 */
const A4_WIDTH_PX = 794; // 210mm * 96dpi / 25.4mm
const A4_HEIGHT_PX = 1123; // 297mm * 96dpi / 25.4mm
const A4_PADDING_PX = 24; // ~6mm padding

/**
 * Invite link text and URL (consistent across all outputs)
 */
export const INVITE_LINK_TEXT = "اگر دوست داری الگوی ذهنی خودت رو دقیق‌تر بشناسی،\nمی‌تونی این آزمون سنجش نشخوار فکری رو تکمیل کنی:";
export const INVITE_LINK_URL = "https://zaya.io/testruminationnewtest";

/**
 * Properties to inline from computed styles
 */
const STYLE_PROPERTIES_TO_INLINE = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRadius",
  "borderWidth",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "direction",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "display",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "maxWidth",
  "minWidth",
  "boxShadow",
  "opacity",
  "whiteSpace",
  "overflow",
  "overflowX",
  "overflowY",
  "textOverflow",
] as const;

/**
 * Creates a detached clone with stylesheets removed and computed styles inlined
 * This bypasses OKLCH/OKLAB parsing by html2canvas
 */
function createDetachedCloneWithInlineStyles(
  originalElement: HTMLElement
): {
  clone: HTMLElement;
  cleanup: () => void;
} {
  // Create offscreen wrapper (not iframe to avoid CORS)
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = `${A4_WIDTH_PX}px`;
  wrapper.style.height = "auto";
  wrapper.style.overflow = "visible";
  wrapper.style.backgroundColor = "#ffffff";
  wrapper.setAttribute("data-pdf-export-wrapper", "true");
  document.body.appendChild(wrapper);

  // Clone the element
  const clone = originalElement.cloneNode(true) as HTMLElement;

  // Get all elements (original and clone) for style mapping
  const originalElements = [originalElement, ...Array.from(originalElement.querySelectorAll("*"))];
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll("*"))];

  // Inline computed styles from original to clone
  originalElements.forEach((originalEl, index) => {
    const cloneEl = cloneElements[index] as HTMLElement;
    if (!cloneEl) return;

    // Skip elements marked to ignore
    if (cloneEl.hasAttribute("data-html2canvas-ignore") || cloneEl.hasAttribute("data-pdf-ignore")) {
      cloneEl.style.display = "none";
      return;
    }

    // Get computed style from original element (browser converts OKLCH to RGB)
    const computed = window.getComputedStyle(originalEl);

    // Inline all important style properties
    STYLE_PROPERTIES_TO_INLINE.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== "none" && value !== "normal" && value !== "auto") {
        // CRITICAL: Check if value contains OKLCH/OKLAB and convert to RGB
        // Even computed styles might return OKLCH strings in some browsers
        let safeValue = value;
        if (value.includes("oklch") || value.includes("oklab")) {
          // Force conversion: create a temp element, set the value, read back as RGB
          const tempEl = document.createElement("div");
          tempEl.style.setProperty(prop, value);
          document.body.appendChild(tempEl);
          const computedValue = window.getComputedStyle(tempEl).getPropertyValue(prop);
          document.body.removeChild(tempEl);
          
          // If still contains OKLCH, use a safe fallback
          if (computedValue && !computedValue.includes("oklch") && !computedValue.includes("oklab")) {
            safeValue = computedValue;
          } else {
            // Fallback to safe defaults for color properties
            if (prop.includes("color") && prop !== "borderColor") {
              safeValue = "#111111"; // Dark text
            } else if (prop === "backgroundColor") {
              safeValue = "#ffffff"; // White background
            } else if (prop === "borderColor") {
              safeValue = "rgba(0, 0, 0, 0.2)"; // Subtle border
            } else {
              // Skip this property if we can't convert it safely
              return;
            }
          }
        }
        cloneEl.style.setProperty(prop, safeValue, "important");
      }
    });

    // Force RTL and text alignment
    cloneEl.style.setProperty("direction", "rtl", "important");
    cloneEl.style.setProperty("text-align", "right", "important");

    // Force font family
    cloneEl.style.setProperty("font-family", '"Vazirmatn", "PeydaWeb", "Tahoma", Arial, sans-serif', "important");

    // Remove max-height constraints and fix overflow
    // Check both inline style and Tailwind classes
    const hasMaxHeight = cloneEl.style.maxHeight || 
                        Array.from(cloneEl.classList).some(c => c.startsWith("max-h-"));
    if (hasMaxHeight) {
      cloneEl.style.setProperty("max-height", "none", "important");
    }
    
    // Check for overflow classes
    const hasOverflow = Array.from(cloneEl.classList).some(c => 
      c.includes("overflow-y-auto") || 
      c.includes("overflow-hidden") || 
      c.includes("overflow-auto")
    );
    if (hasOverflow || cloneEl.style.overflow === "hidden" || cloneEl.style.overflowY === "auto") {
      cloneEl.style.setProperty("overflow", "visible", "important");
      cloneEl.style.setProperty("overflow-y", "visible", "important");
      cloneEl.style.setProperty("overflow-x", "visible", "important");
    }
    if (cloneEl.classList.contains("truncate") || cloneEl.classList.contains("line-clamp-")) {
      cloneEl.style.setProperty("white-space", "normal", "important");
      cloneEl.style.setProperty("text-overflow", "clip", "important");
      cloneEl.style.setProperty("-webkit-line-clamp", "unset", "important");
    }

    // Fix text wrapping
    cloneEl.style.setProperty("overflow-wrap", "anywhere", "important");
    cloneEl.style.setProperty("word-break", "break-word", "important");

    // Remove backdrop-filter and filters
    cloneEl.style.setProperty("backdrop-filter", "none", "important");
    cloneEl.style.setProperty("-webkit-backdrop-filter", "none", "important");
    cloneEl.style.setProperty("filter", "none", "important");
    cloneEl.style.setProperty("-webkit-filter", "none", "important");
    cloneEl.style.setProperty("mix-blend-mode", "normal", "important");

    // Ensure opacity is 1 for text readability
    if (computed.opacity && parseFloat(computed.opacity) < 1) {
      cloneEl.style.setProperty("opacity", "1", "important");
      // Darken color if opacity was low
      const color = computed.color;
      if (color && !color.startsWith("rgb")) {
        cloneEl.style.setProperty("color", "#111111", "important");
      }
    }
  });

  // Set root clone styles
  clone.style.width = `${A4_WIDTH_PX - A4_PADDING_PX * 2}px`;
  clone.style.padding = `${A4_PADDING_PX}px`;
  clone.style.margin = "0";
  clone.style.backgroundColor = "#ffffff";
  clone.style.direction = "rtl";
  clone.style.textAlign = "right";
  clone.style.position = "relative";
  clone.style.overflow = "visible";
  clone.style.maxHeight = "none";

  // Inject minimal inline style (no external stylesheets - this prevents OKLCH parsing)
  const fontStyle = document.createElement("style");
  fontStyle.textContent = `
    * {
      font-family: "Vazirmatn", "PeydaWeb", "Tahoma", Arial, sans-serif !important;
      direction: rtl !important;
      text-align: right !important;
    }
  `;
  clone.appendChild(fontStyle);

  // Append clone to wrapper
  wrapper.appendChild(clone);

  // Cleanup function
  const cleanup = () => {
    if (wrapper.parentNode) {
      document.body.removeChild(wrapper);
    }
  };

  return { clone, cleanup };
}

/**
 * Adds invite link footer to the clone element
 */
function addInviteLinkFooter(clone: HTMLElement): void {
  const footer = document.createElement("div");
  footer.style.marginTop = "32px";
  footer.style.paddingTop = "24px";
  footer.style.borderTop = "1px solid rgba(0, 0, 0, 0.1)";
  footer.style.textAlign = "center";
  footer.style.fontSize = "12px";
  footer.style.color = "#4a5568";
  footer.style.lineHeight = "1.8";

  const text = document.createElement("div");
  text.textContent = INVITE_LINK_TEXT;
  text.style.marginBottom = "8px";

  const link = document.createElement("a");
  link.href = INVITE_LINK_URL;
  link.textContent = INVITE_LINK_URL;
  link.style.color = "#2d3442";
  link.style.textDecoration = "underline";
  link.style.wordBreak = "break-all";
  link.style.display = "block";

  footer.appendChild(text);
  footer.appendChild(link);
  clone.appendChild(footer);
}

/**
 * Generates PDF blob from element using html2canvas with OKLCH-safe approach
 */
export async function generatePdfBlobFromElement(
  element: HTMLElement,
  opts: {
    fileBaseName: string;
    mode: "compare" | "pattern" | "summary";
  title?: string;
  }
): Promise<Blob> {
  const { fileBaseName, mode, title } = opts;

  // Validate element
  if (!element || !element.parentNode) {
    throw new Error("Element is not attached to DOM");
  }

  if (import.meta.env.DEV) {
    console.log("[pdfExport] Starting PDF generation:", {
      elementId: element.id,
      mode,
      fileBaseName,
    });
  }

  // Wait for fonts to load
  await document.fonts.ready;

  // Create detached clone with inline styles
  const { clone, cleanup } = createDetachedCloneWithInlineStyles(element);

  try {
    // Add invite link footer for pattern and summary modes
    if (mode === "pattern" || mode === "summary") {
      addInviteLinkFooter(clone);
    }

    // Wait for layout to settle
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Capture with html2canvas
    // CRITICAL: Use windowStyles: false to prevent html2canvas from parsing document stylesheets
    // This completely bypasses OKLCH/OKLAB parsing since html2canvas won't read stylesheets
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: import.meta.env.DEV,
      allowTaint: false,
      foreignObjectRendering: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
      // CRITICAL: Don't parse window/document stylesheets - only use inline styles
      windowStyles: false,
      // Ignore all style and link elements to prevent any stylesheet parsing
      ignoreElements: (element) => {
        const tagName = element.tagName?.toLowerCase();
        if (tagName === "style" || tagName === "link") {
          return true;
        }
        return false;
      },
      onclone: (clonedDoc, clonedElement) => {
        // Remove all stylesheets from cloned document (extra safety)
        const stylesheets = clonedDoc.querySelectorAll("link[rel='stylesheet'], style");
        stylesheets.forEach((sheet) => {
          sheet.remove();
        });

        // Remove any remaining style tags that might contain OKLCH
        const allStyles = clonedDoc.querySelectorAll("style");
        allStyles.forEach((style) => {
          style.remove();
        });

        // Ensure all elements have inline styles (already applied in clone)
        // Force background white for root
        if (clonedElement instanceof HTMLElement) {
          clonedElement.style.setProperty("background-color", "#ffffff", "important");
        }

        // Double-check: remove any inline styles that might contain OKLCH
        const allElements = clonedElement.querySelectorAll("*");
        allElements.forEach((el) => {
          if (el instanceof HTMLElement) {
            // Check all style properties for OKLCH
            const style = el.style;
            for (let i = 0; i < style.length; i++) {
              const prop = style[i];
              const value = style.getPropertyValue(prop);
              if (value && (value.includes("oklch") || value.includes("oklab"))) {
                // Remove OKLCH values - they should have been converted to RGB already
                style.removeProperty(prop);
              }
            }
          }
        });
      },
    });

  if (import.meta.env.DEV) {
    console.log("[pdfExport] Canvas captured:", {
      width: canvas.width,
      height: canvas.height,
    });
  }

    // Generate PDF from canvas
    return generatePdfFromCanvas(canvas, fileBaseName, title);
  } finally {
    cleanup();
  }
}

/**
 * Generates PDF blob from canvas with proper A4 multi-page slicing
 */
function generatePdfFromCanvas(
  canvas: HTMLCanvasElement,
  fileBaseName: string,
  title?: string
): Blob {
  // A4 dimensions in pixels (matching canvas scale)
  const contentWidthPx = A4_WIDTH_PX - A4_PADDING_PX * 2;
  const contentHeightPx = A4_HEIGHT_PX - A4_PADDING_PX * 2;
  const marginPx = A4_PADDING_PX;

  // Create PDF with pixel units
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [A4_WIDTH_PX, A4_HEIGHT_PX],
    compress: true,
  });

  // Set white background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX, "F");

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const aspectRatio = canvasWidth / canvasHeight;

  // Calculate dimensions to fit content width
  let pdfImgWidth = contentWidthPx;
  let pdfImgHeight = contentWidthPx / aspectRatio;

  // Calculate pages needed
  const pagesNeeded = Math.ceil(pdfImgHeight / contentHeightPx);

  if (import.meta.env.DEV) {
    console.log("[pdfExport] PDF generation:", {
      canvasWidth,
      canvasHeight,
      pdfImgWidth,
      pdfImgHeight,
      pagesNeeded,
    });
  }

  // Add title if provided
  if (title) {
    pdf.setFontSize(16);
    pdf.setTextColor(17, 17, 17);
    pdf.text(title, marginPx, marginPx);
    pdfImgHeight = pdfImgHeight - 20; // Adjust for title
  }

  // Split canvas across multiple pages
  if (pagesNeeded === 1) {
    // Single page
    pdf.addImage(
      canvas.toDataURL("image/png", 1.0),
      "PNG",
      marginPx,
      marginPx + (title ? 20 : 0),
      pdfImgWidth,
      pdfImgHeight
    );
  } else {
    // Multi-page: slice canvas
    const pageHeightPx = Math.ceil(canvasHeight / pagesNeeded);
    
    for (let page = 0; page < pagesNeeded; page++) {
      if (page > 0) {
        pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX, "F");
      }

      const sourceY = page * pageHeightPx;
      const sourceHeight = page === pagesNeeded - 1 
        ? canvasHeight - sourceY
        : pageHeightPx;

      // Create page canvas slice
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvasWidth;
      pageCanvas.height = sourceHeight;
      const pageCtx = pageCanvas.getContext("2d");
      
      if (pageCtx) {
        pageCtx.fillStyle = "#ffffff";
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvasWidth,
          sourceHeight,
          0,
          0,
          canvasWidth,
          sourceHeight
        );
      }

      const pageImgData = pageCanvas.toDataURL("image/png", 1.0);
      const pageDisplayHeight = (sourceHeight / canvasHeight) * pdfImgHeight;
      
      pdf.addImage(
        pageImgData,
        "PNG",
        marginPx,
        marginPx + (title && page === 0 ? 20 : 0),
        pdfImgWidth,
        pageDisplayHeight
      );
    }
  }

  if (import.meta.env.DEV) {
    console.log("[pdfExport] PDF generated:", {
      pages: pagesNeeded,
      filename: fileBaseName,
    });
  }

  return pdf.output("blob");
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
  filename: string,
  shareMeta: { title: string; text: string }
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
            console.log("[pdfExport] PDF shared successfully");
          }

          return { method: "share", success: true };
        } else {
          // canShare returned false - file sharing not supported
          if (import.meta.env.DEV) {
            console.log("[pdfExport] canShare returned false, file sharing not supported");
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
            console.log("[pdfExport] PDF shared successfully (direct, no canShare)");
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
                console.log("[pdfExport] File sharing not supported by browser");
              }
              // Fall through to download
            } else {
              // Other error - fall through to download
              if (import.meta.env.DEV) {
                console.warn("[pdfExport] Share error:", directError.name, directError.message);
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
        console.warn("[pdfExport] Share failed, falling back to download:", error);
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
