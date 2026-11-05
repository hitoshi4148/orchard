import { KAJYU_PAGE_URL, KAJYU_PDF_BASE } from "./constants";

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

export async function fetchPdfBytes(pdfUrl: string): Promise<Uint8Array> {
  const pdfRes = await fetch(pdfUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!pdfRes.ok) {
    throw new Error(`MAFF kajyu PDF fetch failed (${pdfRes.status})`);
  }
  return new Uint8Array(await pdfRes.arrayBuffer());
}
