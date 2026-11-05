import { extractText, getDocumentProxy } from "unpdf";
import { KAJYU_PAGE_URL } from "./constants";
import { fetchLatestKajyuPdfUrl, fetchPdfBytes } from "./maff-fetch";
import { parseKajyuPdfText } from "./parse";
import type { RetailKajyuDataset } from "./types";

/** Node / deploy sync — static unpdf import (not used in Workers). */
export async function fetchRetailKajyuDataset(): Promise<RetailKajyuDataset> {
  const pdfUrl = await fetchLatestKajyuPdfUrl();
  const bytes = await fetchPdfBytes(pdfUrl);
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  if (!text?.trim()) {
    throw new Error("MAFF kajyu PDF had no extractable text");
  }

  return parseKajyuPdfText(text, {
    sourcePageUrl: KAJYU_PAGE_URL,
    pdfUrl,
    fetchedAt: new Date().toISOString(),
  });
}

export { fetchLatestKajyuPdfUrl } from "./maff-fetch";
