/**
 * 果樹園の地点（緯度・経度・地名）— 果樹園しごとと各病害リスク予報で共有
 */
const OrchardLocationCookie = (function () {
  const COOKIE_NAME = "orchardLocation";
  const PORTAL_SETTINGS_COOKIE = "portalSettings";
  const COOKIE_DAYS = 365;

  function getCookie(name) {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    if (!match) {
      return null;
    }
    return decodeURIComponent(match.split("=").slice(1).join("="));
  }

  function setCookie(name, value) {
    const date = new Date();
    date.setTime(date.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
  }

  function migrateFromLegacy() {
    if (getCookie(COOKIE_NAME)) {
      return;
    }
    const portalRaw = getCookie(PORTAL_SETTINGS_COOKIE);
    if (portalRaw) {
      try {
        const p = JSON.parse(portalRaw);
        const lat = String(p.lat ?? "").trim();
        const lon = String(p.lon ?? "").trim();
        if (lat && lon) {
          setCookie(
            COOKIE_NAME,
            JSON.stringify({
              lat,
              lon,
              locationName: String(p.locationName ?? "").trim(),
            })
          );
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const legacyLat = getCookie("forecast_lat");
    const legacyLon = getCookie("forecast_lon");
    if (legacyLat && legacyLon) {
      setCookie(
        COOKIE_NAME,
        JSON.stringify({
          lat: String(legacyLat).trim(),
          lon: String(legacyLon).trim(),
          locationName: "",
        })
      );
    }
  }

  function load() {
    migrateFromLegacy();
    const defaults = { lat: "", lon: "", locationName: "" };
    const raw = getCookie(COOKIE_NAME);
    if (!raw) {
      return { ...defaults };
    }
    try {
      const p = JSON.parse(raw);
      return {
        lat: String(p.lat ?? "").trim(),
        lon: String(p.lon ?? "").trim(),
        locationName: String(p.locationName ?? "").trim(),
      };
    } catch {
      return { ...defaults };
    }
  }

  function save(location) {
    const payload = {
      lat: String(location.lat ?? "").trim(),
      lon: String(location.lon ?? "").trim(),
      locationName: String(location.locationName ?? "").trim(),
    };
    setCookie(COOKIE_NAME, JSON.stringify(payload));
  }

  function hasCoordinates(location = load()) {
    return location.lat !== "" && location.lon !== "";
  }

  function formatLabel(location = load()) {
    if (location.locationName) {
      return location.locationName;
    }
    if (location.lat && location.lon) {
      return `緯度 ${location.lat} / 経度 ${location.lon}`;
    }
    return "未設定";
  }

  return {
    COOKIE_NAME,
    load,
    save,
    hasCoordinates,
    formatLabel,
  };
})();
