/**
 * ローカル .dev.vars の値を Cloudflare Pages (orchard) の Production Secret に反映。
 * 値は標準出力に出さない。
 *
 *   npm run secrets:pages
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const PROJECT = "orchard";
const KEYS = ["GEMINI_API_KEY", "GEMINI_MODEL", "GOOGLE_OAUTH_CLIENT_ID"] as const;

function parseDevVars(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function main() {
  const devPath = join(process.cwd(), ".dev.vars");
  if (!existsSync(devPath)) {
    console.error(".dev.vars がありません。README の手順で作成してください。");
    process.exit(1);
  }
  const vars = parseDevVars(devPath);
  let updated = 0;
  for (const key of KEYS) {
    const value = vars[key]?.trim();
    if (!value) {
      console.log(`skip ${key} (empty)`);
      continue;
    }
    const res = spawnSync(
      "npx",
      ["wrangler", "pages", "secret", "put", key, "--project-name", PROJECT],
      {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
        encoding: "utf8",
        shell: true,
      }
    );
    if (res.status !== 0) {
      console.error(`failed: ${key}`);
      process.exit(res.status ?? 1);
    }
    console.log(`ok ${key}`);
    updated += 1;
  }
  if (updated === 0) {
    console.error("更新する Secret がありません（.dev.vars を確認）");
    process.exit(1);
  }
  console.log(
    `\n${updated} 件を Pages Production Secret に反映しました。最新デプロイで Functions が参照します。`
  );
}

main();
