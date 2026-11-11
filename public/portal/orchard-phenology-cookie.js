/**
 * 生育期の共有 Cookie（agromap 系レガシー名）
 * ポータル TOP の GDD 入力とは別 — 病害リスク・外部ツールが読み書き
 */
const OrchardPhenologyCookie = (function () {
  const COOKIE_DAYS = 365;

  /** りんご緑弁日（黒星・升孢子 GDD バイオフィックス） */
  const APPLE_GREEN_TIP = "agromap_apple_green_tip_date";

  function getCookie(name) {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    if (!match) return null;
    try {
      return decodeURIComponent(match.split("=").slice(1).join("=")).trim();
    } catch {
      return null;
    }
  }

  function setCookie(name, value) {
    if (!value) {
      return;
    }
    const date = new Date();
    date.setTime(date.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
  }

  function isYmd(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  }

  return {
    APPLE_GREEN_TIP_COOKIE: APPLE_GREEN_TIP,
    readAppleGreenTip() {
      const v = getCookie(APPLE_GREEN_TIP);
      return isYmd(v) ? v : "";
    },
    writeAppleGreenTip(ymd) {
      const trimmed = String(ymd || "").trim();
      if (!isYmd(trimmed)) return;
      setCookie(APPLE_GREEN_TIP, trimmed);
    },
    clearAppleGreenTip() {
      const date = new Date();
      date.setTime(date.getTime() - 86400000);
      document.cookie = `${APPLE_GREEN_TIP}=; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
    },
  };
})();
