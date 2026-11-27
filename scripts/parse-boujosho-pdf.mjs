import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getDocumentProxy } from "unpdf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pdfPath = process.argv[2] || join(root, "tmp-boujosho-14.pdf");
const outPath = join(root, "data", "news", "boujosho-prefectures.json");

const buf = readFileSync(pdfPath);
const pdf = await getDocumentProxy(new Uint8Array(buf));
const parts = [];
for (let page = 1; page <= pdf.numPages; page += 1) {
  const p = await pdf.getPage(page);
  const content = await p.getTextContent();
  parts.push(content.items.map((item) => item.str).join(""));
}
const text = parts.join("");

const urlRe = /https?:\/\/[^\s\u3000"'<>\u3040-\u9faf]+/g;

function cleanUrl(raw) {
  return raw.replace(/[）).,、]+$/, "");
}
const PREF_NAMES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

const entries = [];
for (const name of PREF_NAMES) {
  const idx = text.indexOf(name);
  if (idx < 0) {
    console.warn(`missing ${name}`);
    continue;
  }
  const slice = text.slice(idx, idx + 400);
  const urls = [...slice.matchAll(urlRe)].map((m) => cleanUrl(m[0]));
  const homePageUrl = urls[0];
  if (!homePageUrl) {
    console.warn(`no url for ${name}`);
    continue;
  }
  entries.push({ name, homePageUrl });
}

entries.sort((a, b) => a.name.localeCompare(b.name, "ja"));
if (entries.length < 40) {
  console.error(`Only parsed ${entries.length} prefectures — check PDF text`);
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ source: pdfPath, updated: new Date().toISOString().slice(0, 10), prefectures: entries }, null, 2));
console.log(`Wrote ${entries.length} prefectures to ${outPath}`);