import type { PortalAdvisorSettings } from "./types";

export function generatePrefix(settings: PortalAdvisorSettings): string {
  const lat = settings.lat?.trim() ?? "";
  const lon = settings.lon?.trim() ?? "";
  const locationType = settings.locationType ?? "未指定";
  const greenType = settings.greenType ?? "未指定";
  const warmGrass = settings.warmGrass ?? "未指定";
  const coolGrass = settings.coolGrass ?? "未指定";
  const facilityName = settings.facilityName?.trim() ?? "";

  let prefix =
    "あなたは果樹園経営の専門家です。果実栽培、園地管理、病害虫対策、施肥、収穫・出荷まで、果樹園の現場で役立つ知見を有します。以下の情報を踏まえて回答してください。\n\n";

  if (facilityName) {
    prefix += `果樹園名: ${facilityName}\n`;
  }

  if (lat && lon) {
    prefix += `場所: 北緯${lat}度、東経${lon}度\n`;
  } else if (lat) {
    prefix += `場所: 北緯${lat}度\n`;
  } else if (lon) {
    prefix += `場所: 東経${lon}度\n`;
  }

  if (locationType !== "未指定") {
    prefix += `栽培タイプ: ${locationType}\n`;
  }

  if (greenType !== "未指定") {
    prefix += `植物タイプ: ${greenType}\n`;
  }

  if (warmGrass !== "未指定") {
    prefix += `林檎品種: ${warmGrass}\n`;
  }

  if (coolGrass !== "未指定") {
    prefix += `梨品種: ${coolGrass}\n`;
  }

  prefix +=
    "\n上記の情報を考慮して、以下の質問に専門的かつ具体的に回答してください。\n\n";

  return prefix;
}

export function generateSuffix(settings: PortalAdvisorSettings): string {
  const responseMode = settings.responseMode ?? "慎重に回答";

  let suffix = "\n\n回答の際は、以下の点に注意してください：\n";
  suffix += "- 果樹園の現場で実用的で具体的なアドバイスを提供してください\n";
  suffix += "- 必要に応じて季節、品種、栽培タイプ、地域の気候を考慮してください\n";
  suffix += "- 専門用語を使用する場合は簡潔に説明を加えてください\n";

  if (responseMode === "慎重に回答") {
    suffix += "\n特に慎重に検討し、複数の観点から回答してください。";
  }

  return suffix;
}

export function buildFullPrompt(
  message: string,
  settings: PortalAdvisorSettings
): string {
  return `${generatePrefix(settings)}\n\n${message}\n\n${generateSuffix(settings)}`;
}
