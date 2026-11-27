import {
  CATEGORY_RANK,
  classifyOrchardNews,
  refineDraftCategory,
  type OrchardNewsCategory,
} from "./classify";

export interface NewsDraft {
  category: OrchardNewsCategory;
  title: string;
  summary: string;
  sourceName: string;
  url: string;
  publishedAt: string;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; OrchardNewsBot/1.0; +https://orchard-aa7.pages.dev/portal/)";

const GOOGLE_QUERY =
  "果樹 OR 果樹園 OR りんご OR ぶどう OR もも OR キウイ OR 日本なし OR 果実農業";
const GOOGLE_NEWS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent(GOOGLE_QUERY) +
  "&hl=ja&gl=JP&ceid=JP:ja";

/** 一般タブ用。果樹クエリとは別フィード（タイトルに作物語が無ければ general に分類）。 */
const GOOGLE_AG_QUERY =
  "農業 OR 農林水産 OR 農政 OR 農村 OR 食料 OR スマート農業 OR 産地 OR 農協 OR 食農";
const GOOGLE_AG_NEWS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent(GOOGLE_AG_QUERY) +
  "&hl=ja&gl=JP&ceid=JP:ja";

const PRTIMES_SEARCH = "https://prtimes.jp/api/keyword_search.php/search";
const PRTIMES_LOOKBACK_DAYS = 30;
const PRTIMES_MAX_PAGES = 12;

const KEYWORDS: Array<{ word: string; hint: OrchardNewsCategory }> = [
  { word: "果樹園", hint: "fruit" },
  { word: "りんご", hint: "ringo" },
  { word: "日本なし", hint: "nashi" },
  { word: "ぶどう", hint: "budo" },
  { word: "もも", hint: "momo" },
  { word: "キウイ", hint: "kiwi" },
  { word: "果樹農業", hint: "fruit" },
  { word: "スマート農業 果樹", hint: "fruit" },
  { word: "農業", hint: "general" },
  { word: "農林水産", hint: "general" },
];

export function jstDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function isPublishedWithinDays(iso: string, now: Date, days: number): boolean {
  const published = new Date(iso);
  if (Number.isNaN(published.getTime())) return false;
  const today = jstDateString(now);
  const day = jstDateString(published);
  return day >= addDaysToDateString(today, -days) && day <= today;
}

export function isPublishedWithinWeek(iso: string, now: Date): boolean {
  return isPublishedWithinDays(iso, now, 7);
}

function isPrtimesInWindow(iso: string, now: Date): boolean {
  return isPublishedWithinDays(iso, now, PRTIMES_LOOKBACK_DAYS);
}

export function cleanText(value: string): string {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function capSummary(value: string, max = 200): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function tagText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return cleanText(match[1]);
}

function absoluteHttpUrl(value: string, base?: string): string | null {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function mergeDraft(map: Map<string, NewsDraft>, draft: NewsDraft): void {
  const prev = map.get(draft.url);
  if (!prev) {
    map.set(draft.url, draft);
    return;
  }
  if (CATEGORY_RANK[draft.category] < CATEGORY_RANK[prev.category]) {
    map.set(draft.url, {
      ...draft,
      summary: draft.summary || prev.summary,
    });
    return;
  }
  if (!prev.summary && draft.summary) prev.summary = draft.summary;
}

export function extractPrtimesSummary(html: string): string {
  const subtitleBlock = html.match(
    /<h2\b[^>]*\bid="press-release-subtitle"[^>]*>[\s\S]*?<\/h2>/i
  );
  const subtitle = subtitleBlock ? cleanText(subtitleBlock[0]) : "";
  const bodyTag = html.match(/<[^>]*\bid="press-release-body"[^>]*>/i);
  const lead =
    bodyTag && bodyTag.index !== undefined
      ? cleanText(html.slice(bodyTag.index + bodyTag[0].length, bodyTag.index + bodyTag[0].length + 8000))
      : "";
  let text = subtitle;
  if (lead && lead !== subtitle) {
    text = subtitle ? `${subtitle} ${lead}` : lead;
  }
  return capSummary(text);
}

export function parsePrtimesReleasedAt(text: string, now: Date): string | null {
  const value = text.trim();
  const absolute = value.match(
    /^(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s*(\d{1,2})時(\d{1,2})分)?/
  );
  if (absolute) {
    const pad = (part: string) => part.padStart(2, "0");
    const iso = `${absolute[1]}-${pad(absolute[2])}-${pad(absolute[3])}T${pad(absolute[4] || "0")}:${pad(absolute[5] || "0")}:00+09:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  let deltaMs: number | null = null;
  const minutes = value.match(/^(\d+)分前$/);
  const hours = value.match(/^(\d+)時間前$/);
  const days = value.match(/^(\d+)日前$/);
  if (minutes) deltaMs = Number(minutes[1]) * 60_000;
  else if (hours) deltaMs = Number(hours[1]) * 3_600_000;
  else if (days) deltaMs = Number(days[1]) * 86_400_000;
  else if (value === "昨日") deltaMs = 86_400_000;
  else if (value === "たった今" || value === "数秒前") deltaMs = 0;

  if (deltaMs === null) return null;
  return new Date(now.getTime() - deltaMs).toISOString();
}

function parseGoogleNewsRss(xml: string, now: Date, maxItems: number): NewsDraft[] {
  const drafts: NewsDraft[] = [];
  for (const block of xml.split(/<item\b/i).slice(1)) {
    const sourceName = tagText(block, "source") || "Googleニュース";
    let title = tagText(block, "title");
    const suffix = ` - ${sourceName}`;
    if (sourceName && title.endsWith(suffix)) {
      title = title.slice(0, -suffix.length).trim();
    }
    const link = absoluteHttpUrl(tagText(block, "link"));
    const published = new Date(tagText(block, "pubDate"));
    if (!title || !link || Number.isNaN(published.getTime())) continue;
    const publishedAt = published.toISOString();
    if (!isPublishedWithinWeek(publishedAt, now)) continue;
    let summary = tagText(block, "description");
    if (summary.startsWith(title)) summary = title;
    const category = classifyOrchardNews(title, summary);
    drafts.push({
      category,
      title: title.slice(0, 240),
      summary: capSummary(summary),
      sourceName,
      url: link,
      publishedAt,
    });
  }
  const seen = new Set<string>();
  return drafts
    .filter((draft) => {
      if (seen.has(draft.title)) return false;
      seen.add(draft.title);
      return true;
    })
    .slice(0, maxItems);
}

export function parseGoogleNews(xml: string, now: Date): NewsDraft[] {
  return parseGoogleNewsRss(xml, now, 40);
}

export function parseGoogleAgNews(xml: string, now: Date): NewsDraft[] {
  return parseGoogleNewsRss(xml, now, 35);
}

interface PrRelease {
  title?: string;
  release_url?: string;
  released_at?: string;
  april_fools_badge?: string;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml,application/rss+xml,*/*",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`fetch ${response.status} ${url}`);
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

async function fetchKeywordPage(word: string, page: number): Promise<PrRelease[]> {
  const endpoint = new URL(PRTIMES_SEARCH);
  endpoint.searchParams.set("keyword", word);
  endpoint.searchParams.set("page", String(page));
  endpoint.searchParams.set("limit", "40");
  const response = await fetch(endpoint.href, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`prtimes ${response.status} ${word}`);
  }
  const json = (await response.json()) as { data?: { release_list?: PrRelease[] } };
  return json.data?.release_list ?? [];
}

function draftFromRelease(
  release: PrRelease,
  hint: OrchardNewsCategory,
  word: string,
  now: Date
): NewsDraft | null {
  const title = (release.title ?? "").trim();
  if (!title.includes(word)) return null;
  if (release.april_fools_badge && release.april_fools_badge !== "NormalRelease") return null;
  const url = release.release_url
    ? absoluteHttpUrl(release.release_url, "https://prtimes.jp")
    : null;
  const publishedAt = release.released_at
    ? parsePrtimesReleasedAt(release.released_at, now)
    : null;
  if (!url || !publishedAt || !isPrtimesInWindow(publishedAt, now)) return null;
  const category = refineDraftCategory(hint, title, "");
  return {
    category,
    title: title.slice(0, 240),
    summary: "",
    sourceName: "PR TIMES",
    url,
    publishedAt,
  };
}

async function fetchKeywordDrafts(
  word: string,
  hint: OrchardNewsCategory,
  now: Date
): Promise<NewsDraft[]> {
  const drafts: NewsDraft[] = [];
  for (let page = 1; page <= PRTIMES_MAX_PAGES; page += 1) {
    const releases = await fetchKeywordPage(word, page);
    for (const release of releases) {
      const draft = draftFromRelease(release, hint, word, now);
      if (draft) drafts.push(draft);
    }
    const oldest = releases[releases.length - 1];
    const oldestAt = oldest?.released_at
      ? parsePrtimesReleasedAt(oldest.released_at, now)
      : null;
    const stillInsideWindow =
      releases.length >= 40 && oldestAt !== null && isPrtimesInWindow(oldestAt, now);
    if (!stillInsideWindow) break;
  }
  return drafts;
}

async function fillPrtimesSummaries(drafts: NewsDraft[], budget: { left: number }): Promise<void> {
  const pending = drafts
    .filter((draft) => draft.sourceName === "PR TIMES" && !draft.summary)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  for (const draft of pending) {
    if (budget.left <= 0) break;
    budget.left -= 1;
    try {
      const html = await fetchText(draft.url);
      draft.summary = extractPrtimesSummary(html);
      draft.category = refineDraftCategory(draft.category, draft.title, draft.summary);
    } catch (error) {
      console.error("prtimes summary", draft.url, error);
    }
  }
}

async function runSource(
  sourceKey: string,
  load: () => Promise<NewsDraft[]>
): Promise<{ sourceKey: string; drafts: NewsDraft[] } | null> {
  try {
    return { sourceKey, drafts: await load() };
  } catch (error) {
    console.error(sourceKey, error);
    if (sourceKey === "google-news" || sourceKey === "google-news:ag") {
      return { sourceKey, drafts: [] };
    }
    return null;
  }
}

export interface CollectOptions {
  prefecture?: string;
  loadYosoku?: (prefecture: string) => Promise<NewsDraft[]>;
}

export async function collectDueSources(
  due: (sourceKey: string) => Promise<boolean>,
  options: CollectOptions = {},
  now = new Date()
): Promise<{ drafts: NewsDraft[]; completed: string[] }> {
  const jobs: Array<Promise<{ sourceKey: string; drafts: NewsDraft[] } | null>> = [];

  for (const keyword of KEYWORDS) {
    const sourceKey = `prtimes:${keyword.word}:month`;
    if (!(await due(sourceKey))) continue;
    jobs.push(
      runSource(sourceKey, () => fetchKeywordDrafts(keyword.word, keyword.hint, now))
    );
  }
  if (await due("google-news")) {
    jobs.push(runSource("google-news", async () => parseGoogleNews(await fetchText(GOOGLE_NEWS), now)));
  }
  if (await due("google-news:ag")) {
    jobs.push(
      runSource("google-news:ag", async () =>
        parseGoogleAgNews(await fetchText(GOOGLE_AG_NEWS), now)
      )
    );
  }

  const prefecture = options.prefecture?.trim();
  if (prefecture && options.loadYosoku) {
    const yosokuKey = `yosoku:${prefecture}`;
    if (await due(yosokuKey)) {
      jobs.push(
        runSource(yosokuKey, () => options.loadYosoku!(prefecture))
      );
    }
  }

  const map = new Map<string, NewsDraft>();
  const completed: string[] = [];
  for (const result of await Promise.all(jobs)) {
    if (!result) continue;
    result.drafts.forEach((draft) => mergeDraft(map, draft));
    completed.push(result.sourceKey);
  }

  const drafts = [...map.values()];
  await fillPrtimesSummaries(drafts, { left: 8 });
  return { drafts, completed };
}