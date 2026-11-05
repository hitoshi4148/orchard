import { extractText, getDocumentProxy } from "unpdf";
import { KAJYU_PAGE_URL, KAJYU_PDF_BASE } from "./constants";
import { parseKajyuPdfText } from "./parse";
import type { RetailKajyuDataset } from "./types";

const USER_AGENT = "orchard-portal/1.0 (maff-retail-kajyu)";

export async function fetchLatestKajyuPdfUrl(): Promise<string> {
  const res = await fetch(KAJYU_PAGE_URL, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`MAFF kajyu page fetch failed (${res.status})`);
  }
  const html = await res.text();
  const match = html.match(/href="\.\/attach\/pdf\/(kajyu-\d+\.pdf)"/i);
  if (!match) {
    throw new Error("Latest kajyu PDF link not found on MAFF page");
  }
  return `${KAJYU_PDF_BASE}attach/pdf/${match[1]}`;
}

export async function fetchRetailKajyuDataset(): Promise<RetailKajyuDataset> {
  const pdfUrl = await fetchLatestKajyuPdfUrl();
  const pdfRes = await fetch(pdfUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!pdfRes.ok) {
    throw new Error(`MAFF kajyu PDF fetch failed (${pdfRes.status})`);
  }
  const bytes = new Uint8Array(await pdfRes.arrayBuffer());
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
