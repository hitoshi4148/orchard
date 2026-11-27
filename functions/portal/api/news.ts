import {
  addDaysToDateString,
  cleanText,
  collectDueSources,
  jstDateString,
  type NewsDraft,
} from "../../../src/news/collect";
import { fetchYosokuDrafts } from "../../../src/news/yosoku";
import { reverseGeocodeDetail } from "../../../src/geocode/reverse";

interface Env {
  NEWS_DB: D1Database;
}

interface NewsRow {
  category: string;
  title: string;
  summary: string;
  source_name: string;
  original_url: string;
  published_at: string;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS news_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    source_name TEXT NOT NULL,
    original_url TEXT NOT NULL UNIQUE,
    published_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_news_items_published ON news_items (published_at)`,
  `CREATE TABLE IF NOT EXISTS news_fetch_state (
    source_key TEXT PRIMARY KEY,
    fetched_on TEXT NOT NULL
  )`,
];

const UPSERT = `INSERT INTO news_items (
  category, title, summary, source_name, original_url, published_at
) VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(original_url) DO UPDATE SET
  summary = CASE
    WHEN length(excluded.summary) > 0 THEN excluded.summary
    ELSE news_items.summary
  END`;

async function ensureSchema(db: D1Database): Promise<void> {
  for (const sql of SCHEMA) {
    await db.prepare(sql).run();
  }
}

async function isDue(db: D1Database, sourceKey: string, today: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT fetched_on FROM news_fetch_state WHERE source_key = ?")
    .bind(sourceKey)
    .first<{ fetched_on: string }>();
  return row?.fetched_on !== today;
}

async function markFetched(db: D1Database, sourceKeys: string[], today: string): Promise<void> {
  if (sourceKeys.length === 0) return;
  const statement = db.prepare(
    `INSERT INTO news_fetch_state (source_key, fetched_on) VALUES (?, ?)
     ON CONFLICT(source_key) DO UPDATE SET fetched_on = excluded.fetched_on`
  );
  await db.batch(sourceKeys.map((sourceKey) => statement.bind(sourceKey, today)));
}

async function saveDrafts(db: D1Database, drafts: NewsDraft[]): Promise<void> {
  if (drafts.length === 0) return;
  const statement = db.prepare(UPSERT);
  const chunkSize = 20;
  for (let index = 0; index < drafts.length; index += chunkSize) {
    const chunk = drafts.slice(index, index + chunkSize);
    await db.batch(
      chunk.map((draft) =>
        statement.bind(
          draft.category,
          draft.title,
          draft.summary,
          draft.sourceName,
          draft.url,
          draft.publishedAt
        )
      )
    );
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.NEWS_DB;
  if (!db) {
    return Response.json(
      { success: false, error: "database unavailable" },
      { status: 500 }
    );
  }

  try {
    const url = new URL(context.request.url);
    let prefecture = (url.searchParams.get("prefecture") ?? "").trim();
    const latRaw = url.searchParams.get("lat");
    const lonRaw = url.searchParams.get("lon");
    const lat = latRaw !== null ? Number(latRaw) : NaN;
    const lon = lonRaw !== null ? Number(lonRaw) : NaN;
    if (!prefecture && Number.isFinite(lat) && Number.isFinite(lon)) {
      const detail = await reverseGeocodeDetail(lat, lon);
      prefecture = detail.prefecture;
    }

    const now = new Date();
    const asOf = jstDateString(now);
    await ensureSchema(db);

    context.waitUntil(
      (async () => {
        try {
          let collectPrefecture = prefecture;
          if (!collectPrefecture && Number.isFinite(lat) && Number.isFinite(lon)) {
            const detail = await reverseGeocodeDetail(lat, lon);
            collectPrefecture = detail.prefecture;
          }
          const { drafts, completed } = await collectDueSources(
            (sourceKey) => isDue(db, sourceKey, asOf),
            {
              prefecture: collectPrefecture || undefined,
              loadYosoku: fetchYosokuDrafts,
            },
            now
          );
          await saveDrafts(db, drafts);
          await markFetched(db, completed, asOf);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("news collect", message);
        }
      })()
    );

    const weekCutoff = new Date(
      `${addDaysToDateString(asOf, -7)}T00:00:00+09:00`
    ).toISOString();
    const prtimesCutoff = new Date(
      `${addDaysToDateString(asOf, -30)}T00:00:00+09:00`
    ).toISOString();
    const yosokuCutoff = new Date(
      `${addDaysToDateString(asOf, -90)}T00:00:00+09:00`
    ).toISOString();

    const result = await db
      .prepare(
        `SELECT category, title, summary, source_name, original_url, published_at
         FROM news_items
         WHERE (source_name = 'PR TIMES' AND published_at >= ?)
            OR (source_name LIKE '%病害虫予察%' AND published_at >= ?)
            OR (
              source_name != 'PR TIMES'
              AND source_name NOT LIKE '%病害虫予察%'
              AND published_at >= ?
            )
         ORDER BY published_at DESC
         LIMIT 120`
      )
      .bind(prtimesCutoff, yosokuCutoff, weekCutoff)
      .all<NewsRow>();

    const seen = new Set<string>();
    const items = [];
    for (const row of result.results ?? []) {
      const key = `${row.category}:${row.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let summary = cleanText(row.summary);
      if (row.category === "general" && summary.startsWith(row.title)) {
        summary = row.title;
      }
      items.push({
        category: row.category,
        title: row.title,
        summary,
        sourceName: row.source_name,
        url: row.original_url,
        publishedAt: row.published_at,
      });
    }

    return Response.json({
      success: true,
      asOf,
      prefecture: prefecture || null,
      yosokuEnabled: Boolean(prefecture),
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("news api", message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
};