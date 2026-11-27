import { findBoujoshoPrefecture } from "./boujosho-master";
import { capSummary, cleanText, type NewsDraft } from "./collect";
import { refineDraftCategory } from "./classify";

const USER_AGENT =
  "Mozilla/5.0 (compatible; OrchardNewsBot/1.0; +https://orchard-aa7.pages.dev/portal/)";

const FORECAST_LINK = /予察|発生予察|病害虫予報|病虫予報|虫観察|発生情報|予報情報|yosoku|yosatu/i;
function absoluteHttpUrl(value: string, base: string): string | null {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function parseNearbyDate(text: string, now: Date): string {
  const match = text.match(/(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})/);
  if (match) {
    const pad = (part: string) => part.padStart(2, "0");
    const iso = `${match[1]}-${pad(match[2])}-${pad(match[3])}T00:00:00+09:00`;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date(
    `${now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" })}T00:00:00+09:00`
  ).toISOString();
}

function extractAnchors(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const anchors: Array<{ href: string; text: string }> = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = absoluteHttpUrl(match[1], baseUrl);
    if (!href) continue;
    const text = cleanText(match[2]);
    if (!text) continue;
    anchors.push({ href, text });
  }
  return anchors;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,*/*",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`yosoku fetch ${response.status} ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const header = response.headers.get("content-type") || "";
  const charset = /charset=([^;\s]+)/i.exec(header)?.[1]?.toLowerCase() ?? "";
  const encoding = charset.includes("shift") || charset.includes("sjis")
    ? "shift_jis"
    : charset.includes("euc")
      ? "euc-jp"
      : "utf-8";
  return new TextDecoder(encoding).decode(buffer);
}

function isArticleCandidate(text: string, href: string): boolean {
  if (text.length < 4) return false;
  if (/^(トップ|ホーム|戻る|一覧|サイトマップ|お問い合わせ)$/i.test(text)) return false;
  if (/\.(pdf|jpg|png|gif)(\?|$)/i.test(href)) return true;
  return FORECAST_LINK.test(text) || FORECAST_LINK.test(href) || /予察|病虫|害虫|発生/.test(text);
}

export async function fetchYosokuDrafts(
  prefectureName: string,
  now = new Date()
): Promise<NewsDraft[]> {
  const entry = findBoujoshoPrefecture(prefectureName);
  if (!entry) return [];

  const sourceName = `${entry.name} 病害虫予察`;
  const homeHtml = await fetchText(entry.homePageUrl);
  const homeAnchors = extractAnchors(homeHtml, entry.homePageUrl);
  const indexLinks = homeAnchors
    .filter((a) => FORECAST_LINK.test(a.text) || FORECAST_LINK.test(a.href))
    .map((a) => a.href)
    .slice(0, 3);

  const pageUrls = indexLinks.length > 0 ? indexLinks : [entry.homePageUrl];
  const seenUrls = new Set<string>();
  const drafts: NewsDraft[] = [];

  for (const pageUrl of pageUrls) {
    let html: string;
    try {
      html = pageUrl === entry.homePageUrl ? homeHtml : await fetchText(pageUrl);
    } catch {
      continue;
    }
    for (const anchor of extractAnchors(html, pageUrl)) {
      if (!isArticleCandidate(anchor.text, anchor.href)) continue;
      if (seenUrls.has(anchor.href)) continue;
      seenUrls.add(anchor.href);
      const publishedAt = parseNearbyDate(anchor.text, now);
      const title = anchor.text.slice(0, 240);
      const category = refineDraftCategory("yosoku", title, "");
      drafts.push({
        category,
        title,
        summary: capSummary(title),
        sourceName,
        url: anchor.href,
        publishedAt,
      });
      if (drafts.length >= 20) break;
    }
    if (drafts.length >= 20) break;
  }

  return drafts;
}