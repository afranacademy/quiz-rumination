export async function shareOrCopyText(opts: {
  title?: string;
  text: string;
  url?: string;
}): Promise<{ method: "share" | "copy"; ok: boolean; error?: string }> {
  const { title, text, url } = opts;
  
  // Combine text and url for clipboard fallback
  const fullText = url ? `${text}\n\n${url}` : text;
  
  // Try Web Share API first
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || undefined,
        text: text,
        url: url || undefined,
      });
      return { method: "share", ok: true };
    } catch (error: unknown) {
      // User canceled or share failed - fallback to copy
      if (error instanceof Error && error.name === "AbortError") {
        // User canceled - don't treat as error, just return
        return { method: "share", ok: false, error: "canceled" };
      }
      // Other error - fallback to copy
    }
  }
  
  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(fullText);
    return { method: "copy", ok: true };
  } catch (error) {
    return {
      method: "copy",
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy text:", error);
    return false;
  }
}
