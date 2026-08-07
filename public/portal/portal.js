const COOKIE_NAME = "portalSettings";
const SPRAY_CACHE_KEY = "portalSprayForecastCache";
const SPRAY_CACHE_TTL_MS = 60 * 60 * 1000;
const DASHBOARD_API = "/portal/api/dashboard";
const GDD_API = "/portal/api/gdd";
const CHAT_API = "/portal/api/chat";
const GEOCODE_API = "/portal/api/geocode";
const DAFB_GAUGE_CONFIG = {
  primomax: {
    maxDays: 60,
    windowStart: 20,
    windowEnd: 40,
    alertAfter: 40,
    windowStartLabel: "摘花開始(20D)",
    windowEndLabel: "摘花終了(40D)",
  },
  greenfield: {
    maxDays: 80,
    windowStart: 20,
    windowEnd: 60,
    alertAfter: 60,
    windowStartLabel: "摘花開始(20D)",
    windowEndLabel: "摘花終了(60D)",
  },
};
const AGROMAP_COOKIE_DAYS = 365;
const LOCATION_NOT_SET_MESSAGE =
  "果樹園の場所が未設定です。右上の「⚙ 設定」から緯度・経度を入力してください";

const API_RETRYABLE_STATUSES = new Set([502, 503, 504, 520, 524, 525]);
const API_MAX_INFRA_RETRIES = 5;
const API_RETRY_BASE_MS = 2000;

function isHtmlApiBody(text) {
  const trimmed = text.trimStart();
  return trimmed.startsWith("<") || trimmed.startsWith("<!");
}

function apiRetryDelayMs(attempt) {
  const base = API_RETRY_BASE_MS * 2 ** attempt;
  const jitter = Math.random() * 400;
  return base + jitter;
}

function shouldRetryInfraResponse(status, text) {
  if (API_RETRYABLE_STATUSES.has(status)) {
    return true;
  }
  return isHtmlApiBody(text);
}

function buildApiJsonError(status, text) {
  if (isHtmlApiBody(text)) {
    const isLocalDevHost =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const hint = isLocalDevHost
      ? "開発時は orchard で npm run dev を実行し、http://127.0.0.1:8790/portal/ から開いてください（Live Server 等の静的サーバーでは API が動きません）。"
      : "サーバーが HTML を返しました。https://www.turf-tools.jp/portal/ から開き直すか、しばらく待って再読み込みしてください。";
    return new Error(`API 応答が JSON ではありません。${hint}`);
  }

  return new Error(
    `API 応答の解析に失敗しました（${status}）: ${text.slice(0, 120)}`
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchApiJson(url, init = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= API_MAX_INFRA_RETRIES; attempt += 1) {
    const response = await fetch(url, init);
    const text = await response.text();

    if (shouldRetryInfraResponse(response.status, text)) {
      lastError = buildApiJsonError(response.status, text);
      if (attempt < API_MAX_INFRA_RETRIES) {
        await sleep(apiRetryDelayMs(attempt));
        continue;
      }
      throw lastError;
    }

    try {
      return JSON.parse(text);
    } catch {
      throw buildApiJsonError(response.status, text);
    }
  }

  throw lastError ?? new Error("API 応答の取得に失敗しました。");
}

const HARVEST_GDD_CONFIG = {
  warm: {
    label: "ふじ",
    baseTemp: 5,
    maxGdd: 5000,
    windowStart: 3500,
    windowEnd: 4000,
    alertAfter: 4000,
  },
  cool: {
    label: "幸水",
    baseTemp: 5,
    maxGdd: 3500,
    windowStart: 2000,
    windowEnd: 2500,
    alertAfter: 2500,
  },
};

function getHarvestGddConfig(type) {
  return HARVEST_GDD_CONFIG[type];
}

const WEATHER_ICONS = {
  晴れ: "☀️",
  くもり: "☁️",
  弱い雨: "🌦️",
  雨強め: "🌧️",
};

function setCookie(name, value, days = 30) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie =
    name + "=" + encodeURIComponent(value) + ";expires=" + date.toUTCString() + ";path=/";
}

function setAgromapCookie(name, value) {
  const date = new Date();
  date.setTime(date.getTime() + AGROMAP_COOKIE_DAYS * 24 * 60 * 60 * 1000);
  document.cookie =
    name +
    "=" +
    encodeURIComponent(value) +
    ";expires=" +
    date.toUTCString() +
    ";path=/;SameSite=Lax";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const parts = document.cookie.split(";");
  for (const part of parts) {
    let c = part;
    while (c.charAt(0) === " ") c = c.substring(1);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

function getDefaultSettings() {
  return {
    facilityName: "",
    lat: "",
    lon: "",
    locationType: "未指定",
    greenType: "未指定",
    warmGrass: "未指定",
    coolGrass: "未指定",
    locationName: "",
    responseMode: "慎重に回答",
  };
}

function formatPortalTitle(facilityName, locationName = "") {
  const name = facilityName.trim();
  const place = locationName.trim();
  const placePart = place ? `(${place})` : "";
  const prefix = name ? `${name}${placePart}` : placePart;
  return prefix ? `${prefix}果実園しごとポータル` : "果実園しごとポータル";
}

function updatePortalTitle(settings = loadSettings()) {
  const prefixEl = document.getElementById("portal-title-prefix");
  const name = (settings.facilityName ?? "").trim();
  const place = (settings.locationName ?? "").trim();
  const placePart = place ? `(${place})` : "";
  const prefix = name ? `${name}${placePart}` : placePart;

  if (prefixEl) {
    prefixEl.textContent = prefix;
    prefixEl.classList.toggle("hidden", !prefix);
  }

  // GA4 のページタイトル集計を施設名・地名で分割しないため、document.title は固定のままにする。
  document.title = "果実園しごとポータル";
}

const WARM_GRASS_LEGACY = {
  "未指定(C4)": "未指定",
  ノシバ: "未指定",
  高麗芝: "未指定",
  バミューダ: "未指定",
  パスパラム: "未指定",
};

const COOL_GRASS_LEGACY = {
  "未指定(C3)": "未指定",
  ベントグラス: "未指定",
  クリーピングベントグラス: "未指定",
  ペレニアルライグラス: "未指定",
  ケンタッキーブルーグラス: "未指定",
  トールフェスク: "未指定",
  ベント: "未指定",
  ニューベント: "未指定",
  ライグラス: "未指定",
  ブルーグラス: "未指定",
  フェスク: "未指定",
};

const LOCATION_TYPE_LEGACY = {
  ゴルフコース: "露地栽培",
  グラウンド: "露地栽培",
};

const GREEN_TYPE_LEGACY = {
  暖地型: "未指定",
  寒地型: "未指定",
};

const VALID_LOCATION_TYPES = new Set(["未指定", "ハウス栽培", "露地栽培"]);
const VALID_GREEN_TYPES = new Set(["未指定", "仁科類", "核果類", "漿果類", "柑橘類"]);
const VALID_WARM_GRASS = new Set([
  "未指定",
  "ぐんま名月",
  "陽光",
  "おぜの紅",
  "紅鶴",
  "あかぎ",
  "スリムレッド",
]);
const VALID_COOL_GRASS = new Set(["未指定", "幸水", "豊水", "あきづき", "新高", "群馬N2号"]);

function normalizeSettings(settings) {
  const normalized = normalizeGrassSettings({ ...settings });

  normalized.locationType =
    LOCATION_TYPE_LEGACY[normalized.locationType] ?? normalized.locationType;
  if (!VALID_LOCATION_TYPES.has(normalized.locationType)) {
    normalized.locationType = "未指定";
  }

  normalized.greenType = GREEN_TYPE_LEGACY[normalized.greenType] ?? normalized.greenType;
  if (!VALID_GREEN_TYPES.has(normalized.greenType)) {
    normalized.greenType = "未指定";
  }

  if (!VALID_WARM_GRASS.has(normalized.warmGrass)) {
    normalized.warmGrass = "未指定";
  }
  if (!VALID_COOL_GRASS.has(normalized.coolGrass)) {
    normalized.coolGrass = "未指定";
  }

  return normalized;
}

function normalizeGrassSettings(settings) {
  return {
    ...settings,
    warmGrass: WARM_GRASS_LEGACY[settings.warmGrass] ?? settings.warmGrass,
    coolGrass: COOL_GRASS_LEGACY[settings.coolGrass] ?? settings.coolGrass,
  };
}

function loadSettings() {
  const defaults = getDefaultSettings();

  const legacyLat = getCookie("forecast_lat");
  const legacyLon = getCookie("forecast_lon");
  if (legacyLat && legacyLon) {
    defaults.lat = legacyLat;
    defaults.lon = legacyLon;
  }

  const raw = getCookie(COOKIE_NAME);
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = normalizeSettings({ ...defaults, ...JSON.parse(raw) });
    if (!parsed.responseMode) {
      parsed.responseMode = "慎重に回答";
    }
    return parsed;
  } catch {
    return defaults;
  }
}

function saveSettings(settings) {
  setCookie(COOKIE_NAME, JSON.stringify(settings));
}

function formatLocationKey(lat, lon) {
  return `${parseFloat(lat).toFixed(4)},${parseFloat(lon).toFixed(4)}`;
}

function cacheSprayForecast(lat, lon, results) {
  try {
    sessionStorage.setItem(
      SPRAY_CACHE_KEY,
      JSON.stringify({
        locationKey: formatLocationKey(lat, lon),
        fetchedAt: Date.now(),
        results,
      }),
    );
  } catch {
    /* sessionStorage unavailable */
  }
}

function hasLocation(settings) {
  return settings.lat !== "" && settings.lon !== "";
}

function applySettingsToForm(settings) {
  document.getElementById("settings-facility-name").value = settings.facilityName ?? "";
  document.getElementById("settings-lat").value = settings.lat;
  document.getElementById("settings-lon").value = settings.lon;

  document
    .querySelector(`input[name="locationType"][value="${settings.locationType}"]`)
    ?.click();
  document
    .querySelector(`input[name="greenType"][value="${settings.greenType}"]`)
    ?.click();

  document.getElementById("warmGrass").value = settings.warmGrass;
  document.getElementById("coolGrass").value = settings.coolGrass;
  document
    .querySelector(`input[name="responseMode"][value="${settings.responseMode ?? "慎重に回答"}"]`)
    ?.click();
}

function readSettingsFromForm() {
  const previous = loadSettings();
  return {
    facilityName: document.getElementById("settings-facility-name").value.trim(),
    lat: document.getElementById("settings-lat").value.trim(),
    lon: document.getElementById("settings-lon").value.trim(),
    locationType: document.querySelector('input[name="locationType"]:checked').value,
    greenType: document.querySelector('input[name="greenType"]:checked').value,
    warmGrass: document.getElementById("warmGrass").value,
    coolGrass: document.getElementById("coolGrass").value,
    responseMode: document.querySelector('input[name="responseMode"]:checked').value,
    locationName: previous.locationName,
  };
}

function openSettingsModal() {
  applySettingsToForm(loadSettings());
  document.getElementById("settings-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeSettingsModal() {
  document.getElementById("settings-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function showLocationStatus(message, isError = false) {
  const el = document.getElementById("location-status");
  el.textContent = message;
  el.className = "location-status" + (isError ? " error" : "");
}

function renderWeatherPlaceholder(message) {
  const area = document.getElementById("weather-area");
  area.innerHTML = `<p class="weather-placeholder">${message}</p>`;
}

function formatHourLabel(hour) {
  return `${hour}時`;
}

function formatDayTitle(dateKey, dayIndex) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[dt.getDay()];
  const prefix = dayIndex === 0 ? "今日" : dayIndex === 1 ? "明日" : "";
  const dateText = `${month}/${day}(${weekday})`;
  return prefix ? `${prefix} ${dateText}` : dateText;
}

function getJstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function renderDiseaseRiskPanels(forecast) {
  DiseaseRiskUI.renderDiseaseRiskPanels(document.getElementById("disease-risk-area"), forecast);
}

function renderWeatherWidget(hourly, days) {
  const area = document.getElementById("weather-area");

  if (hourly.length === 0) {
    renderWeatherPlaceholder("該当する天気予報が見つかりませんでした。");
    return;
  }

  const dayMap = new Map(days.map((day, index) => [day.dateKey, { ...day, index }]));
  const grouped = new Map();

  hourly.forEach((row) => {
    if (!grouped.has(row.dateKey)) {
      grouped.set(row.dateKey, []);
    }
    grouped.get(row.dateKey).push(row);
  });

  let html = '<div class="weather-widget"><div class="weather-scroll">';

  grouped.forEach((rows, dateKey) => {
    const day = dayMap.get(dateKey);
    if (!day) {
      return;
    }

    const icon = WEATHER_ICONS[day.condition] || "☁️";

    html += `<div class="weather-day-block">
      <div class="weather-day-summary">
        <div class="weather-day-main">
          <div class="weather-day-date">${formatDayTitle(dateKey, day.index)}</div>
          <div class="weather-day-icon">${icon}</div>
        </div>
        <div class="weather-day-stats">
          <span class="weather-day-stat">平均気温 ${day.avgTemp.toFixed(1)}°C</span>
          <span class="weather-day-stat">平均湿度 ${Math.round(day.avgHumidity)}%</span>
          <span class="weather-day-stat">平均風速 ${day.avgWind.toFixed(1)}m/s</span>
        </div>
      </div>
      <div class="weather-hour-row">`;

    rows.forEach((row) => {
      const hourIcon = WEATHER_ICONS[row.condition] || "☁️";
      html += `<div class="weather-hour-cell">
        <div class="weather-hour-time">${formatHourLabel(row.hour)}</div>
        <div class="weather-hour-icon">${hourIcon}</div>
        <div class="weather-hour-temp">${row.temp.toFixed(0)}°</div>
        <div class="weather-hour-meta">${Math.round(row.humidity)}%</div>
        <div class="weather-hour-meta">${row.wind.toFixed(1)}m/s</div>
        <div class="weather-hour-precip">${row.precip.toFixed(1)}mm</div>
      </div>`;
    });

    html += "</div></div>";
  });

  html += "</div></div>";
  area.innerHTML = html;
}

async function fetchLocationName(lat, lon) {
  const data = await fetchApiJson(
    `${GEOCODE_API}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
  );

  if (!data.success) {
    throw new Error(data.error || "地名の取得に失敗しました");
  }

  return data.name || "";
}

async function ensureLocationName(settings) {
  if (settings.locationName || !hasLocation(settings)) {
    return settings;
  }

  try {
    settings.locationName = await fetchLocationName(settings.lat, settings.lon);
    if (settings.locationName) {
      saveSettings(settings);
    }
  } catch {
    // 地名取得失敗時も天気予報は表示する
  }

  return settings;
}

async function loadPortalData() {
  let settings = loadSettings();

  if (!hasLocation(settings)) {
    updatePortalTitle(settings);
    renderWeatherPlaceholder(LOCATION_NOT_SET_MESSAGE);
    renderDiseaseRiskPlaceholder(LOCATION_NOT_SET_MESSAGE);
    renderGddPlaceholder(LOCATION_NOT_SET_MESSAGE);
    renderGpPlaceholder(LOCATION_NOT_SET_MESSAGE);
    return;
  }

  settings = await ensureLocationName(settings);
  updatePortalTitle(settings);

  const weatherLoading = document.getElementById("weather-loading");
  const insightsLoading = document.getElementById("disease-risk-loading");
  const weatherError = document.getElementById("weather-error");
  const diseaseError = document.getElementById("disease-risk-error");
  const gddError = document.getElementById("gdd-error");
  const gpError = document.getElementById("gp-chart-error");

  weatherLoading.classList.remove("hidden");
  insightsLoading.classList.remove("hidden");
  weatherError.classList.add("hidden");
  diseaseError.classList.add("hidden");
  gddError.classList.add("hidden");
  gpError.classList.add("hidden");
  renderWeatherPlaceholder("");
  renderDiseaseRiskPlaceholder("");
  renderGddPlaceholder("");
  renderGpPlaceholder("");

  const params = new URLSearchParams({
    lat: settings.lat,
    lon: settings.lon,
    warmGrass: settings.warmGrass,
    coolGrass: settings.coolGrass,
  });

  const gddPromise = refreshAllGdd(settings);

  try {
    const data = await fetchApiJson(`${DASHBOARD_API}?${params.toString()}`);

    if (!data.success) {
      throw new Error(data.error || "データの取得に失敗しました");
    }

    renderWeatherWidget(data.weather.hourly, data.weather.days);
    renderDiseaseRiskPanels({
      tomorrow: data.diseaseRisk.tomorrow,
      dayAfterTomorrow: data.diseaseRisk.dayAfterTomorrow,
    });
    renderGpChart(data.growthPotential);
    if (data.sprayForecast) {
      cacheSprayForecast(settings.lat, settings.lon, data.sprayForecast);
    }
  } catch (err) {
    weatherError.textContent = err.message;
    diseaseError.textContent = err.message;
    gpError.textContent = err.message;
    weatherError.classList.remove("hidden");
    diseaseError.classList.remove("hidden");
    gpError.classList.remove("hidden");
    renderWeatherPlaceholder("天気予報を表示できませんでした。");
    renderDiseaseRiskPlaceholder("病害リスクを表示できませんでした。");
    renderGpPlaceholder("GPを表示できませんでした。");
  } finally {
    await gddPromise;
    weatherLoading.classList.add("hidden");
    insightsLoading.classList.add("hidden");
  }
}

function getCurrentLocation() {
  if (!navigator.geolocation) {
    showLocationStatus("このブラウザは位置情報をサポートしていません", true);
    return;
  }

  showLocationStatus("位置情報を取得中...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude.toFixed(4);
      const lon = position.coords.longitude.toFixed(4);
      document.getElementById("settings-lat").value = lat;
      document.getElementById("settings-lon").value = lon;

      showLocationStatus("地名を取得中...");
      try {
        const name = await fetchLocationName(lat, lon);
        showLocationStatus(
          name ? `現在地を取得しました（${name}）` : "現在地を取得しました"
        );
      } catch {
        showLocationStatus("現在地を取得しました（地名は取得できませんでした）");
      }
    },
    (err) => {
      showLocationStatus("位置情報の取得に失敗しました: " + err.message, true);
    }
  );
}

async function handleSaveSettings() {
  const settings = readSettingsFromForm();

  if (!settings.lat || !settings.lon) {
    showLocationStatus("緯度と経度を入力してください", true);
    return;
  }

  showLocationStatus("地名を取得中...");
  try {
    settings.locationName = await fetchLocationName(settings.lat, settings.lon);
  } catch {
    settings.locationName = "";
  }

  saveSettings(settings);
  updatePortalTitle(settings);
  WorkMemoUI.updateFacilityName(settings.facilityName);
  showLocationStatus(
    settings.locationName
      ? `設定を保存しました（${settings.locationName}）`
      : "設定を保存しました"
  );

  const btn = document.getElementById("save-settings-btn");
  const originalText = btn.textContent;
  btn.textContent = "保存しました";
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
    closeSettingsModal();
    loadPortalData();
  }, 600);
}

function renderDiseaseRiskPlaceholder(message) {
  const area = document.getElementById("disease-risk-area");
  area.innerHTML = `<p class="weather-placeholder">${message}</p>`;
}

function renderGpPlaceholder(message) {
  const area = document.getElementById("gp-chart-area");
  area.innerHTML = `<p class="weather-placeholder">${message}</p>`;
}

function buildGpSeriesPoints(monthlyGp, padLeft, padTop, chartWidth, chartHeight) {
  return monthlyGp.map((gp, index) => {
    const value = gp ?? 0;
    const x = padLeft + (index / 11) * chartWidth;
    const y = padTop + chartHeight - value * chartHeight;
    return { x, y, value: gp, month: index + 1 };
  });
}

function buildSmoothCurvePath(points) {
  if (points.length === 0) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(index - 1, 0)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(index + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

function getTodayChartX(padLeft, chartWidth, date = new Date()) {
  const { year, month, day } = getJstDateParts(date);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthProgress = month - 1 + (day - 1) / daysInMonth;
  return padLeft + (monthProgress / 11) * chartWidth;
}

function formatTodayChartLabel(date = new Date()) {
  const { month, day } = getJstDateParts(date);
  return `${month}/${day}`;
}

function buildTodayAnnotationSvg(padLeft, padTop, chartWidth, chartHeight) {
  const x = getTodayChartX(padLeft, chartWidth);
  const label = formatTodayChartLabel();
  const lineBottom = padTop + chartHeight;
  const labelBoxHeight = 13;
  const labelGap = 4;
  const labelBoxTop = Math.max(2, padTop - labelGap - labelBoxHeight);
  const labelTextY = labelBoxTop + labelBoxHeight - 3;

  return `<g class="gp-today-annotation" aria-label="今日 ${label}">
    <line x1="${x.toFixed(1)}" y1="${padTop.toFixed(1)}" x2="${x.toFixed(1)}" y2="${lineBottom.toFixed(1)}" class="gp-today-line"></line>
    <rect x="${(x - 17).toFixed(1)}" y="${labelBoxTop.toFixed(1)}" width="34" height="${labelBoxHeight}" rx="3" class="gp-today-label-bg"></rect>
    <text x="${x.toFixed(1)}" y="${labelTextY.toFixed(1)}" class="gp-today-label" text-anchor="middle">${label}</text>
  </g>`;
}

const GP_SERIES_STYLES = {
  warm: {
    lineClass: "gp-line-warm",
    pointClass: "gp-point-warm",
    legendClass: "gp-legend-warm",
    showPoints: true,
  },
  cool: {
    lineClass: "gp-line-cool",
    pointClass: "gp-point-cool",
    legendClass: "gp-legend-cool",
    showPoints: true,
  },
  warmDefault: {
    lineClass: "gp-line-warm-default",
    pointClass: "gp-point-warm-default",
    legendClass: "gp-legend-warm-default",
    showPoints: false,
  },
  coolDefault: {
    lineClass: "gp-line-cool-default",
    pointClass: "gp-point-cool-default",
    legendClass: "gp-legend-cool-default",
    showPoints: false,
  },
};

function buildGpChartSvg(data) {
  const width = 420;
  const height = 148;
  const padLeft = 32;
  const padRight = 8;
  const padTop = 14;
  const padBottom = 22;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const monthLabels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  const gridLines = [0, 0.5, 1]
    .map((tick) => {
      const y = padTop + chartHeight - tick * chartHeight;
      const label = `${Math.round(tick * 100)}%`;
      return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${(padLeft + chartWidth).toFixed(1)}" y2="${y.toFixed(1)}" class="gp-grid-line"></line>
        <text x="${padLeft - 6}" y="${(y + 4).toFixed(1)}" class="gp-axis-label" text-anchor="end">${label}</text>`;
    })
    .join("");

  const monthTicks = monthLabels
    .map((label, index) => {
      const x = padLeft + (index / 11) * chartWidth;
      return `<text x="${x.toFixed(1)}" y="${(height - 8).toFixed(1)}" class="gp-month-label" text-anchor="middle">${label}</text>`;
    })
    .join("");

  const seriesPaths = data.series
    .map((series) => {
      const style = GP_SERIES_STYLES[series.key] ?? GP_SERIES_STYLES.warm;
      const points = buildGpSeriesPoints(
        series.monthlyGp,
        padLeft,
        padTop,
        chartWidth,
        chartHeight
      );
      const curvePath = buildSmoothCurvePath(points);
      const markers = style.showPoints
        ? points
            .map((point) => {
              if (point.value === null || Number.isNaN(point.value)) {
                return "";
              }
              const percent = Math.round(point.value * 100);
              return `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3" class="${style.pointClass}"></circle>
                <title>${series.label} ${point.month}月: ${percent}%</title>`;
            })
            .join("")
        : "";

      return `<path d="${curvePath}" class="gp-line ${style.lineClass}"></path>${markers}`;
    })
    .join("");

  const todayAnnotation = buildTodayAnnotationSvg(padLeft, padTop, chartWidth, chartHeight);

  return `<svg class="gp-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="成長能(Growth Potential) グラフ">
    ${gridLines}
    ${seriesPaths}
    ${todayAnnotation}
    ${monthTicks}
  </svg>`;
}

function renderGpChart(data) {
  const area = document.getElementById("gp-chart-area");
  const legendHtml = data.series
    .map((series) => {
      const style = GP_SERIES_STYLES[series.key] ?? GP_SERIES_STYLES.warm;
      return `<span class="gp-legend-item ${style.legendClass}">${series.label}</span>`;
    })
    .join("");

  const tableHeaders = data.series
    .map((series) => `<th>${series.label}</th>`)
    .join("");

  const gpTableRows = data.monthlyTemperatures
    .map((temp, index) => {
      const tempText = temp === null ? "—" : `${temp.toFixed(1)}℃`;
      const gpCells = data.series
        .map((series) => {
          const gp = series.monthlyGp[index];
          const gpText = gp === null ? "—" : `${Math.round(gp * 100)}%`;
          return `<td>${gpText}</td>`;
        })
        .join("");
      return `<tr>
        <td>${index + 1}月</td>
        <td>${tempText}</td>
        ${gpCells}
      </tr>`;
    })
    .join("");

  const footerText = data.series
    .map(
      (series) =>
        `${series.label} 育成適温 ${series.optimum}℃ / 分散 ${series.variance}`
    )
    .join(" — ");

  area.innerHTML = `<div class="gp-chart-panel">
    <h3 class="gp-chart-title">成長能(Growth Potential)</h3>
    <p class="gp-chart-subtitle">${data.year}年 月平均気温</p>
    <div class="gp-chart-legend">${legendHtml}</div>
    <div class="gp-chart-body">
      ${buildGpChartSvg(data)}
    </div>
    <details class="gp-chart-details">
      <summary>月別データ</summary>
      <table class="gp-chart-table">
        <thead>
          <tr><th>月</th><th>気温</th>${tableHeaders}</tr>
        </thead>
        <tbody>${gpTableRows}</tbody>
      </table>
    </details>
    <p class="gp-chart-footer">${footerText}</p>
  </div>`;
}

function getYesterdayDateKeyJst() {
  const { year, month, day } = getJstDateParts();
  const todayUtc = Date.UTC(year, month - 1, day);
  const yesterdayUtc = todayUtc - 24 * 60 * 60 * 1000;
  const y = new Date(yesterdayUtc);
  const m = y.getUTCMonth() + 1;
  const d = y.getUTCDate();
  return `${y.getUTCFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function dateKeyToUtcMs(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function calculateDafb(fullBloomDateKey) {
  if (!fullBloomDateKey) {
    return null;
  }
  const bloomMs = dateKeyToUtcMs(fullBloomDateKey);
  const yesterdayMs = dateKeyToUtcMs(getYesterdayDateKeyJst());
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((yesterdayMs - bloomMs) / dayMs));
}

function pctOfDafbMax(days, maxDays) {
  return Math.min(100, Math.max(0, (days / maxDays) * 100));
}

function renderDafbGaugeScale(scaleEl, mode) {
  if (!scaleEl) {
    return;
  }

  const config = DAFB_GAUGE_CONFIG[mode];
  const ticks = [
    { value: 0, label: "0", edge: "start" },
    {
      value: config.windowStart,
      label: config.windowStartLabel ?? String(config.windowStart),
      mid: true,
    },
    {
      value: config.windowEnd,
      label: config.windowEndLabel ?? String(config.windowEnd),
      mid: true,
    },
    { value: config.maxDays, label: String(config.maxDays), edge: "end" },
  ];

  scaleEl.innerHTML = "";
  ticks.forEach((tick) => {
    const span = document.createElement("span");
    span.textContent = tick.label;
    span.style.left = `${pctOfDafbMax(tick.value, config.maxDays)}%`;
    if (tick.edge === "start") {
      span.className = "scale-start";
    } else if (tick.edge === "end") {
      span.className = "scale-end";
    } else if (tick.mid) {
      span.className = "scale-mid";
    }
    scaleEl.appendChild(span);
  });
}

function renderDafbGauge(trackEl, dafb, mode) {
  trackEl.innerHTML = "";
  const scaleEl = trackEl.parentElement.querySelector(".gdd-gauge-scale");
  renderDafbGaugeScale(scaleEl, mode);

  const config = DAFB_GAUGE_CONFIG[mode];
  const totalPct = pctOfDafbMax(dafb, config.maxDays);
  const pStart = pctOfDafbMax(config.windowStart, config.maxDays);
  const pEnd = pctOfDafbMax(config.windowEnd, config.maxDays);
  const pAlert = pctOfDafbMax(config.alertAfter, config.maxDays);

  function addSeg(cls, leftPct, widthPct) {
    if (widthPct <= 0) {
      return;
    }
    const el = document.createElement("div");
    el.className = `gdd-gauge-seg ${cls}`;
    el.style.left = `${leftPct}%`;
    el.style.width = `${widthPct}%`;
    trackEl.appendChild(el);
  }

  function addMark(value) {
    const mark = document.createElement("div");
    mark.className = "gdd-gauge-mark";
    mark.style.left = `${pctOfDafbMax(value, config.maxDays)}%`;
    trackEl.appendChild(mark);
  }

  addMark(config.windowStart);
  addMark(config.alertAfter);

  const end = totalPct;
  if (dafb <= config.windowStart) {
    addSeg("gdd-seg-normal", 0, end);
  } else if (dafb <= config.windowEnd) {
    addSeg("gdd-seg-normal", 0, pStart);
    addSeg("gdd-seg-window", pStart, end - pStart);
  } else {
    addSeg("gdd-seg-normal", 0, pStart);
    addSeg("gdd-seg-window", pStart, pEnd - pStart);
    addSeg("gdd-seg-over", pAlert, end - pAlert);
  }
}

function buildGddPanelHtml() {
  return `<div class="gdd-panel">
    <h3 class="gdd-title">摘果適時・収穫時期予測</h3>
    <p class="gdd-subtitle">満開日から昨日まで（満開後日数DAFB）</p>
    <div class="gdd-block" id="gdd-block-primomax">
      <div class="gdd-name">
        <span class="gdd-name-text">早生・日本ナシ(幸水など)</span>
        <span class="gdd-info-anchor">
          <button type="button" class="gdd-info-btn" aria-label="早生・日本ナシの摘果適期について">i</button>
          <span class="gdd-info-popover" role="tooltip">
            <p class="gdd-info-lead">満開後日数（DAFB）をもとに、摘果作業の適期を目安として表示します。</p>
            <table class="gdd-info-table">
              <thead>
                <tr>
                  <th scope="col">DAFB（日）</th>
                  <th scope="col">目安</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>0〜20</td><td>摘果適期前</td></tr>
                <tr><td>20〜40</td><td>摘果適期</td></tr>
                <tr><td>40超</td><td>適期超過（要確認）</td></tr>
              </tbody>
            </table>
            <p class="gdd-info-foot">品種・樹勢・天候により適期は前後します。現場の状況もあわせて判断してください。</p>
          </span>
        </span>
      </div>
      <div class="gdd-controls">
        <label for="date-primomax" class="gdd-date-label">満開日</label>
        <input type="date" id="date-primomax" aria-label="早生・日本ナシの満開日">
        <div class="gdd-gauge-wrap">
          <div class="gdd-gauge-track" id="gauge-primomax"></div>
          <div class="gdd-gauge-scale" id="scale-primomax"></div>
        </div>
      </div>
    </div>
    <div class="gdd-block" id="gdd-block-greenfield">
      <div class="gdd-name">
        <span class="gdd-name-text">晩生・リンゴ(ふじなど)</span>
        <span class="gdd-info-anchor">
          <button type="button" class="gdd-info-btn" aria-label="晩生・リンゴの摘果適期について">i</button>
          <span class="gdd-info-popover" role="tooltip">
            <p class="gdd-info-lead">満開後日数（DAFB）をもとに、摘果作業の適期を目安として表示します。</p>
            <table class="gdd-info-table">
              <thead>
                <tr>
                  <th scope="col">DAFB（日）</th>
                  <th scope="col">目安</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>0〜20</td><td>摘果適期前</td></tr>
                <tr><td>20〜60</td><td>摘果適期</td></tr>
                <tr><td>60超</td><td>適期超過（要確認）</td></tr>
              </tbody>
            </table>
            <p class="gdd-info-foot">品種・樹勢・天候により適期は前後します。現場の状況もあわせて判断してください。</p>
          </span>
        </span>
      </div>
      <div class="gdd-controls">
        <label for="date-greenfield" class="gdd-date-label">満開日</label>
        <input type="date" id="date-greenfield" aria-label="晩生・リンゴの満開日">
        <div class="gdd-gauge-wrap">
          <div class="gdd-gauge-track" id="gauge-greenfield"></div>
          <div class="gdd-gauge-scale" id="scale-greenfield"></div>
        </div>
      </div>
    </div>
    <div class="gdd-section-divider"></div>
    <h4 class="gdd-section-title">収穫適時積算温度</h4>
    <p class="gdd-subtitle gdd-subtitle--germination">満開日からの積算温度</p>
    <div class="gdd-block" id="gdd-block-germ-warm">
      <div class="gdd-name" id="germ-warm-name">ふじ</div>
      <div class="gdd-controls">
        <label for="date-germ-warm" class="gdd-date-label">満開日</label>
        <input type="date" id="date-germ-warm" aria-label="ふじの満開日">
        <div class="gdd-gauge-wrap">
          <div class="gdd-gauge-track" id="gauge-germ-warm"></div>
          <div class="gdd-gauge-scale" id="scale-germ-warm"></div>
        </div>
      </div>
    </div>
    <div class="gdd-block" id="gdd-block-germ-cool">
      <div class="gdd-name" id="germ-cool-name">幸水</div>
      <div class="gdd-controls">
        <label for="date-germ-cool" class="gdd-date-label">満開日</label>
        <input type="date" id="date-germ-cool" aria-label="幸水の満開日">
        <div class="gdd-gauge-wrap">
          <div class="gdd-gauge-track" id="gauge-germ-cool"></div>
          <div class="gdd-gauge-scale" id="scale-germ-cool"></div>
        </div>
      </div>
    </div>
  </div>`;
}

function updateHarvestGddLabels() {
  const warmNameEl = document.getElementById("germ-warm-name");
  const coolNameEl = document.getElementById("germ-cool-name");

  if (warmNameEl) {
    warmNameEl.textContent = HARVEST_GDD_CONFIG.warm.label;
  }
  if (coolNameEl) {
    coolNameEl.textContent = HARVEST_GDD_CONFIG.cool.label;
  }
}

function formatHarvestScaleLabel(value) {
  return value.toLocaleString("ja-JP");
}

function pctOfHarvestMax(gdd, maxGdd) {
  return Math.min(100, Math.max(0, (gdd / maxGdd) * 100));
}

function renderHarvestGddGaugeScale(scaleEl, type) {
  if (!scaleEl) {
    return;
  }

  const config = getHarvestGddConfig(type);
  const pStart = pctOfHarvestMax(config.windowStart, config.maxGdd);
  const pEnd = pctOfHarvestMax(config.windowEnd, config.maxGdd);

  scaleEl.innerHTML = "";
  scaleEl.className = "gdd-gauge-scale gdd-harvest-scale";

  const layout = document.createElement("div");
  layout.className = "gdd-harvest-scale-layout";

  const createMark = (title, value, leftPct, anchor) => {
    const mark = document.createElement("div");
    mark.className = `gdd-harvest-scale-mark gdd-harvest-scale-mark--${anchor}`;
    mark.style.left = `${leftPct}%`;
    mark.innerHTML = `<span class="gdd-harvest-scale-label-title">${title}</span><span class="gdd-harvest-scale-label-value">${formatHarvestScaleLabel(value)}</span>`;
    return mark;
  };

  const edgeStart = document.createElement("span");
  edgeStart.className = "gdd-harvest-scale-edge gdd-harvest-scale-edge--start";
  edgeStart.textContent = "0";
  layout.appendChild(edgeStart);

  layout.appendChild(createMark("収穫目安", config.windowStart, pStart, "start"));
  layout.appendChild(createMark("収穫終了", config.windowEnd, pEnd, "end"));

  const edgeEnd = document.createElement("span");
  edgeEnd.className = "gdd-harvest-scale-edge gdd-harvest-scale-edge--end";
  edgeEnd.textContent = formatHarvestScaleLabel(config.maxGdd);
  layout.appendChild(edgeEnd);

  scaleEl.appendChild(layout);
}

function renderHarvestGddGauge(trackEl, gdd, type) {
  trackEl.innerHTML = "";
  const scaleEl = trackEl.parentElement.querySelector(".gdd-gauge-scale");
  renderHarvestGddGaugeScale(scaleEl, type);

  const config = getHarvestGddConfig(type);
  const totalPct = pctOfHarvestMax(gdd, config.maxGdd);
  const pStart = pctOfHarvestMax(config.windowStart, config.maxGdd);
  const pEnd = pctOfHarvestMax(config.windowEnd, config.maxGdd);
  const pAlert = pctOfHarvestMax(config.alertAfter, config.maxGdd);

  function addSeg(cls, leftPct, widthPct) {
    if (widthPct <= 0) {
      return;
    }
    const el = document.createElement("div");
    el.className = `gdd-gauge-seg ${cls}`;
    el.style.left = `${leftPct}%`;
    el.style.width = `${widthPct}%`;
    trackEl.appendChild(el);
  }

  function addMark(value) {
    const mark = document.createElement("div");
    mark.className = "gdd-gauge-mark";
    mark.style.left = `${pctOfHarvestMax(value, config.maxGdd)}%`;
    trackEl.appendChild(mark);
  }

  addMark(config.windowStart);
  addMark(config.alertAfter);

  const end = totalPct;
  if (gdd <= config.windowStart) {
    addSeg("gdd-seg-normal", 0, end);
  } else if (gdd <= config.windowEnd) {
    addSeg("gdd-seg-normal", 0, pStart);
    addSeg("gdd-seg-window", pStart, end - pStart);
  } else {
    addSeg("gdd-seg-normal", 0, pStart);
    addSeg("gdd-seg-window", pStart, pEnd - pStart);
    addSeg("gdd-seg-over", pAlert, end - pAlert);
  }
}

function renderGddPlaceholder(message) {
  const area = document.getElementById("gdd-area");
  if (message) {
    area.innerHTML = `<p class="weather-placeholder">${message}</p>`;
    return;
  }

  if (!area.querySelector(".gdd-panel") || !area.querySelector("#gdd-block-germ-warm")) {
    area.innerHTML = buildGddPanelHtml();
    initGddPanelEvents();
  }

  updateHarvestGddLabels();
}

function initGddPanelEvents() {
  const primoDate = getCookie("agromap_primomax_date");
  const greenDate = getCookie("agromap_greenfield_date");
  const warmSeedDate = getCookie("agromap_warm_seeding_date");
  const coolSeedDate = getCookie("agromap_cool_seeding_date");
  const primoInput = document.getElementById("date-primomax");
  const greenInput = document.getElementById("date-greenfield");
  const warmSeedInput = document.getElementById("date-germ-warm");
  const coolSeedInput = document.getElementById("date-germ-cool");

  if (primoDate) {
    primoInput.value = primoDate;
  }
  if (greenDate) {
    greenInput.value = greenDate;
  }
  if (warmSeedDate) {
    warmSeedInput.value = warmSeedDate;
  }
  if (coolSeedDate) {
    coolSeedInput.value = coolSeedDate;
  }

  renderDafbGaugeScale(document.getElementById("scale-primomax"), "primomax");
  renderDafbGaugeScale(document.getElementById("scale-greenfield"), "greenfield");
  renderHarvestGddGaugeScale(document.getElementById("scale-germ-warm"), "warm");
  renderHarvestGddGaugeScale(document.getElementById("scale-germ-cool"), "cool");

  primoInput.addEventListener("change", () => {
    if (primoInput.value) {
      setAgromapCookie("agromap_primomax_date", primoInput.value);
    }
    updateProductGdd("primomax", loadSettings());
  });

  greenInput.addEventListener("change", () => {
    if (greenInput.value) {
      setAgromapCookie("agromap_greenfield_date", greenInput.value);
    }
    updateProductGdd("greenfield", loadSettings());
  });

  warmSeedInput.addEventListener("change", () => {
    if (warmSeedInput.value) {
      setAgromapCookie("agromap_warm_seeding_date", warmSeedInput.value);
    }
    updateGerminationGdd("warm", loadSettings());
  });

  coolSeedInput.addEventListener("change", () => {
    if (coolSeedInput.value) {
      setAgromapCookie("agromap_cool_seeding_date", coolSeedInput.value);
    }
    updateGerminationGdd("cool", loadSettings());
  });
}

async function fetchProductGdd(lat, lon, startDate, baseTemp = 0) {
  const params = new URLSearchParams({
    lat,
    lon,
    start_date: startDate,
    base_temp: String(baseTemp),
  });
  const data = await fetchApiJson(`${GDD_API}?${params.toString()}`);
  if (!data.success) {
    throw new Error(data.error || "GDD取得に失敗しました");
  }
  return data.gdd;
}

async function updateProductGdd(product, settings) {
  const dateEl = document.getElementById(`date-${product}`);
  const gaugeEl = document.getElementById(`gauge-${product}`);
  const scaleEl = document.getElementById(`scale-${product}`);
  const gddError = document.getElementById("gdd-error");
  const startDate = dateEl?.value;
  const mode = product === "primomax" ? "primomax" : "greenfield";

  if (!dateEl || !gaugeEl) {
    return;
  }

  if (!startDate) {
    gaugeEl.innerHTML = "";
    renderDafbGaugeScale(scaleEl, mode);
    return;
  }

  const dafb = calculateDafb(startDate);
  renderDafbGauge(gaugeEl, dafb, mode);
  gddError.classList.add("hidden");
}

async function updateGerminationGdd(type, settings) {
  const dateEl = document.getElementById(`date-germ-${type}`);
  const gaugeEl = document.getElementById(`gauge-germ-${type}`);
  const scaleEl = document.getElementById(`scale-germ-${type}`);
  const gddError = document.getElementById("gdd-error");
  const startDate = dateEl?.value;
  const config = getHarvestGddConfig(type);

  if (!dateEl || !gaugeEl) {
    return;
  }

  if (!startDate) {
    gaugeEl.innerHTML = "";
    renderHarvestGddGaugeScale(scaleEl, type);
    return;
  }

  if (!hasLocation(settings)) {
    return;
  }

  try {
    const gdd = await fetchProductGdd(
      settings.lat,
      settings.lon,
      startDate,
      config.baseTemp
    );
    renderHarvestGddGauge(gaugeEl, gdd, type);
    gddError.classList.add("hidden");
  } catch (err) {
    gaugeEl.innerHTML = "";
    renderHarvestGddGaugeScale(scaleEl, type);
    gddError.textContent = err.message;
    gddError.classList.remove("hidden");
  }
}

async function refreshAllGdd(settings = loadSettings()) {
  renderGddPlaceholder("");

  updateHarvestGddLabels();

  updateProductGdd("primomax", settings);
  updateProductGdd("greenfield", settings);

  if (!hasLocation(settings)) {
    return;
  }

  await Promise.all([
    updateGerminationGdd("warm", settings),
    updateGerminationGdd("cool", settings),
  ]);
}

function validatePortalRacSearch(pesticideKeyword, targetKeyword) {
  const pesticide = pesticideKeyword.trim();
  const target = targetKeyword.trim();
  const hasOneCharKeyword =
    (pesticide.length > 0 && pesticide.length < 2) ||
    (target.length > 0 && target.length < 2);

  if ((!pesticide && !target) || hasOneCharKeyword) {
    return { ok: false, message: "2文字以上で検索してください" };
  }

  return { ok: true, pesticide, target };
}

function initPortalRacSearch() {
  const form = document.getElementById("portal-rac-search-form");
  const errorEl = document.getElementById("portal-rac-search-error");
  if (!form || !errorEl) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const pesticideInput = document.getElementById("portal-rac-pesticide");
    const targetInput = document.getElementById("portal-rac-target");
    const result = validatePortalRacSearch(
      pesticideInput?.value ?? "",
      targetInput?.value ?? ""
    );

    if (!result.ok) {
      errorEl.textContent = result.message;
      errorEl.classList.remove("hidden");
      return;
    }

    errorEl.classList.add("hidden");
    errorEl.textContent = "";

    const params = new URLSearchParams();
    if (result.pesticide) {
      params.set("pesticide", result.pesticide);
    }
    if (result.target) {
      params.set("target", result.target);
    }

    const query = params.toString();
    window.location.href = query ? `/portal/rac/?${query}` : "/portal/rac/";
  });
}

function initGddInfoPopovers() {
  if (window.__gddInfoPopoversInit) {
    return;
  }
  window.__gddInfoPopoversInit = true;

  const infoBtnSelector = ".gdd-info-btn, .series-info-btn";
  const infoAnchorSelector = ".gdd-info-anchor, .series-info-anchor";

  document.addEventListener("click", (event) => {
    const btn = event.target.closest(infoBtnSelector);
    if (btn) {
      event.preventDefault();
      event.stopPropagation();
      const anchor = btn.closest(infoAnchorSelector);
      if (!anchor) {
        return;
      }
      const isOpen = anchor.classList.contains("is-open");
      document.querySelectorAll(`${infoAnchorSelector}.is-open`).forEach((openAnchor) => {
        openAnchor.classList.remove("is-open");
      });
      if (!isOpen) {
        anchor.classList.add("is-open");
      }
      return;
    }

    if (!event.target.closest(infoAnchorSelector)) {
      document.querySelectorAll(`${infoAnchorSelector}.is-open`).forEach((anchor) => {
        anchor.classList.remove("is-open");
      });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(`${infoAnchorSelector}.is-open`).forEach((anchor) => {
        anchor.classList.remove("is-open");
      });
    }
  });
}

function initPortalBrandInfo() {
  const anchor = document.querySelector(".portal-brand-info-anchor");
  const btn = anchor?.querySelector(".portal-brand-info-btn");
  if (!anchor || !btn) {
    return;
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    anchor.classList.toggle("is-open");
  });

  document.addEventListener("click", (event) => {
    if (!anchor.contains(event.target)) {
      anchor.classList.remove("is-open");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      anchor.classList.remove("is-open");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("settings-open-btn").addEventListener("click", openSettingsModal);
  document.getElementById("settings-close-btn").addEventListener("click", closeSettingsModal);
  document.getElementById("settings-backdrop").addEventListener("click", closeSettingsModal);
  document.getElementById("get-current-location-btn").addEventListener("click", getCurrentLocation);
  document.getElementById("save-settings-btn").addEventListener("click", handleSaveSettings);
  DiseaseRiskUI.init();
  DiseaseRiskUI.bindLogicButtons(document.getElementById("disease-risk-area"));
  WorkMemoUI.init(document.getElementById("work-memo-area"), loadSettings());

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSettingsModal();
      DiseaseRiskUI.closeDiseaseLogicModal();
    }
  });

  loadPortalData();
  updatePortalTitle(loadSettings());
  initPortalRacSearch();
  initPortalBrandInfo();
  initGddInfoPopovers();
  initAdvisorChat();
});

function getAdvisorSettingsPayload() {
  const settings = loadSettings();
  return {
    facilityName: settings.facilityName,
    lat: settings.lat,
    lon: settings.lon,
    locationType: settings.locationType,
    greenType: settings.greenType,
    warmGrass: settings.warmGrass,
    coolGrass: settings.coolGrass,
    responseMode: settings.responseMode ?? "慎重に回答",
  };
}

function expandAdvisorChat() {
  const messagesEl = document.getElementById("ai-advisor-messages");
  if (!messagesEl || messagesEl.classList.contains("expanded")) {
    return;
  }
  messagesEl.classList.remove("collapsed");
  messagesEl.classList.add("expanded");
}

function scrollAdvisorMessageIntoView(messagesEl, messageDiv, align = "start") {
  if (align === "end") {
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return;
  }

  const containerRect = messagesEl.getBoundingClientRect();
  const messageRect = messageDiv.getBoundingClientRect();
  messagesEl.scrollTop += messageRect.top - containerRect.top;
}

function addAdvisorMessage(content, isUser = false) {
  const messagesEl = document.getElementById("ai-advisor-messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `ai-advisor-message ${isUser ? "ai-advisor-user" : "ai-advisor-bot"}`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "ai-advisor-message-content";

  if (isUser) {
    contentDiv.textContent = content;
  } else if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
    contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
  } else {
    contentDiv.textContent = content;
  }

  messageDiv.appendChild(contentDiv);
  messagesEl.appendChild(messageDiv);
  scrollAdvisorMessageIntoView(messagesEl, messageDiv, isUser ? "end" : "start");
}

async function sendAdvisorMessage() {
  const input = document.getElementById("ai-advisor-input");
  const sendButton = document.getElementById("ai-advisor-send");
  const message = input.value.trim();

  if (!message) {
    return;
  }

  expandAdvisorChat();
  addAdvisorMessage(message, true);
  input.value = "";

  sendButton.disabled = true;
    sendButton.innerHTML = '<span class="ai-advisor-loading"></span> 処理中...';

  try {
    const data = await fetchApiJson(CHAT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        settings: getAdvisorSettingsPayload(),
      }),
    });

    if (!data.success) {
      let errorMessage = data.error || "エラーが発生しました";
      if (data.details) {
        errorMessage += `\n\n詳細: ${data.details}`;
      }
      throw new Error(errorMessage);
    }

    addAdvisorMessage(data.response, false);
  } catch (error) {
    let errorMsg = "申し訳ございません。エラーが発生しました。";
    if (error.message) {
      errorMsg += `\n\n${error.message}`;
    }
    addAdvisorMessage(errorMsg, false);
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "AIに質問";
    input.focus();
  }
}

function initAdvisorChat() {
  const sendButton = document.getElementById("ai-advisor-send");
  const input = document.getElementById("ai-advisor-input");

  if (!sendButton || !input) {
    return;
  }

  sendButton.addEventListener("click", sendAdvisorMessage);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendAdvisorMessage();
    }
  });
}
