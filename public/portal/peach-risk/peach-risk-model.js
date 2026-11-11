/**
 * 桃病害リスク予報 — 画面用データ（仮データのみ・API未接続）
 */
const PeachRiskModel = (() => {
  const STORAGE_KEY = "peachRiskSettings";

  const RISK = {
    low: { label: "低", className: "risk-low" },
    medium: { label: "中", className: "risk-medium" },
    high: { label: "高", className: "risk-high" },
  };

  const VARIETIES = [
    "あかつき",
    "川中島白桃",
    "白鳳",
    "黄金桃",
    "なつっこ",
    "その他",
  ];

  const CULTIVATION = [
    { id: "open", label: "露地栽培" },
    { id: "rain_shelter", label: "雨よけ栽培" },
    { id: "other", label: "その他" },
  ];

  const GROWTH_STAGES = [
    { id: "bud", label: "萌芽期" },
    { id: "leaf", label: "展葉期" },
    { id: "prebloom", label: "開花前" },
    { id: "bloom", label: "開花期" },
    { id: "petalfall", label: "落花期" },
    { id: "youngfruit", label: "幼果期" },
    { id: "fruitgrowth", label: "果実肥大期" },
    { id: "coloring", label: "着色期" },
    { id: "maturity", label: "成熟期" },
    { id: "postharvest", label: "収穫後" },
  ];

  const PRIOR_YEAR_STATUS = [
    { id: "", label: "未入力（将来用）" },
    { id: "light", label: "昨年は軽微" },
    { id: "moderate", label: "昨年中程度" },
    { id: "severe", label: "昨年重い" },
  ];

  const DISEASES = {
    "peach:bacterial_shot_hole": {
      id: "peach:bacterial_shot_hole",
      name: "せん孔細菌病",
      pathogen: "Xanthomonas arboricola pv. pruni",
      watchConditions: "降雨・強風・幼果期の気孔侵入",
      stageRelation: "展葉〜幼果・収穫後の潜伏期",
      summary:
        "葉に褐色の斑点が穿孔する病害。降雨と風雨で吹散・侵入しやすい（サンプル説明）。",
    },
    "peach:gray_spot": {
      id: "peach:gray_spot",
      name: "灰星病",
      pathogen: "Phloeompora persicae",
      watchConditions: "開花期の多湿・落葉残存",
      stageRelation: "開花期・収穫前",
      summary: "葉表に灰褐色星状斑。開花前後の湿りと越冬葉に注意（サンプル）。",
    },
    "peach:scab": {
      id: "peach:scab",
      name: "黒星病",
      pathogen: "Cladosporium carpophilum",
      watchConditions: "降雨・葉面濡れ・幼果〜肥大期",
      stageRelation: "落花・幼果〜収穫前",
      summary: "葉・果の黒褐色の星状斑。もも専用の感染条件を将来モデル化（サンプル）。",
    },
    "peach:leaf_curl": {
      id: "peach:leaf_curl",
      name: "縮葉病",
      pathogen: "Taphrina deformans",
      watchConditions: "萌芽〜展葉期の低温・降雨",
      stageRelation: "萌芽・展葉期が中心",
      summary: "春の低温と湿りで葉が縮れ赤色化。展葉前後が重要（サンプル）。",
    },
    "peach:anthracnose": {
      id: "peach:anthracnose",
      name: "炭疽病",
      pathogen: "Colletotrichum gloeosporioides など",
      watchConditions: "高温多湿・果実肥大〜成熟期",
      stageRelation: "肥大期〜収穫前",
      summary: "果実の円形病斑と果柄腐敗。夏雨期に注意（サンプル）。",
    },
  };

  const DISEASE_ORDER = [
    "peach:bacterial_shot_hole",
    "peach:gray_spot",
    "peach:scab",
    "peach:leaf_curl",
    "peach:anthracnose",
  ];

  /** 生育ステージと病害の目安（表示用ガイド） */
  const STAGE_DISEASE_GUIDE = [
    {
      stage: "萌芽・展葉期",
      diseases: ["縮葉病", "せん孔細菌病"],
      note: "春の低温・降雨が重なる時期の目安（サンプル）",
    },
    {
      stage: "開花期",
      diseases: ["灰星病"],
      note: "花器・新葉の湿潤（サンプル）",
    },
    {
      stage: "落花・幼果期",
      diseases: ["灰星病", "黒星病", "せん孔細菌病"],
      note: "気孔・果皮の感染窓（サンプル）",
    },
    {
      stage: "果実肥大期",
      diseases: ["せん孔細菌病", "黒星病", "炭疽病"],
      note: "雨の多い時期の注意（サンプル）",
    },
    {
      stage: "収穫前",
      diseases: ["灰星病", "黒星病", "炭疽病"],
      note: "果実・葉の病害（サンプル）",
    },
    {
      stage: "収穫後",
      diseases: ["せん孔細菌病（越冬伝染源）"],
      note: "枯れ梢・病斑枝の管理イメージ（サンプル）",
    },
  ];

  /** 月別注意病害（簡易年間カレンダー・サンプル） */
  const ANNUAL_CALENDAR = [
    { month: 1, label: "1月", focus: "—" },
    { month: 2, label: "2月", focus: "越冬管理" },
    { month: 3, label: "3月", focus: "縮葉病・展葉" },
    { month: 4, label: "4月", focus: "せん孔細菌・縮葉" },
    { month: 5, label: "5月", focus: "開花・灰星病" },
    { month: 6, label: "6月", focus: "幼果・黒星" },
    { month: 7, label: "7月", focus: "肥大・炭疽" },
    { month: 8, label: "8月", focus: "炭疽・黒星" },
    { month: 9, label: "9月", focus: "収穫前病害" },
    { month: 10, label: "10月", focus: "収穫・後期葉病" },
    { month: 11, label: "11月", focus: "落葉・越冬源" },
    { month: 12, label: "12月", focus: "—" },
  ];

  const DEFAULT_SETTINGS = {
    variety: "白鳳",
    cultivationId: "open",
    growthStageId: "bloom",
    priorYearStatusId: "",
  };

  function sharedLocationLabel() {
    if (typeof OrchardLocationCookie !== "undefined") {
      return OrchardLocationCookie.formatLabel();
    }
    return "未設定";
  }

  const MOCK_CURRENT = {
    "peach:bacterial_shot_hole": {
      level: "high",
      reason: "降雨・強風の予想（サンプル）",
      stageNote: "幼果期前後に注意（仮）",
    },
    "peach:gray_spot": {
      level: "medium",
      reason: "開花期の多湿（サンプル）",
      stageNote: "開花期と現在ステージが一致（仮）",
    },
    "peach:scab": {
      level: "medium",
      reason: "葉面濡れの継続（サンプル）",
      stageNote: "落花〜幼果に注意（仮）",
    },
    "peach:leaf_curl": {
      level: "low",
      reason: "低温湿潤の緩和（サンプル）",
      stageNote: "展葉期前を過ぎた想定（仮）",
    },
    "peach:anthracnose": {
      level: "low",
      reason: "乾燥寄り（サンプル）",
      stageNote: "肥大期に入ると上昇しうる（仮）",
    },
  };

  const MOCK_INFECTION_GRID = {
    "peach:bacterial_shot_hole": ["high", "high", "medium", "medium", "low", "low"],
    "peach:gray_spot": ["medium", "high", "medium", "low", "low", "medium"],
    "peach:scab": ["medium", "medium", "high", "medium", "low", "low"],
    "peach:leaf_curl": ["low", "low", "low", "low", "low", "low"],
    "peach:anthracnose": ["low", "low", "medium", "medium", "high", "medium"],
  };

  const MOCK_DAY_DETAIL = {
    "peach:bacterial_shot_hole": {
      highDays: "本日・1日先",
      tempNote: "18〜24℃（仮）",
      precipNote: "5〜15 mm/日",
      humidityNote: "湿度 80〜90%",
      wetNote: "推定葉面濡れ 8 h/日",
      windNote: "南西 6〜9 m/s（吹散に注意・仮）",
      rationale:
        "【仮データ】降雨と強風が重なるとせん孔細菌の吹散・侵入リスクが上がる想定です。実予測ではありません。",
    },
    "peach:gray_spot": {
      highDays: "1日先",
      tempNote: "16〜20℃",
      precipNote: "3 mm",
      humidityNote: "88%",
      wetNote: "濡れ 6 h",
      windNote: "東 3 m/s",
      rationale: "【仮】開花期湿潤のサンプル表示。",
    },
    "peach:scab": {
      highDays: "2〜3日先",
      tempNote: "20〜26℃",
      precipNote: "8 mm",
      humidityNote: "85%",
      wetNote: "濡れ 10 h",
      windNote: "南 2 m/s",
      rationale: "【仮】もも黒星病用の独立パラメータは未接続。",
    },
    "peach:leaf_curl": {
      highDays: "—",
      tempNote: "12〜16℃",
      precipNote: "2 mm",
      humidityNote: "75%",
      wetNote: "濡れ 4 h",
      windNote: "北 4 m/s",
      rationale: "【仮】萌芽展葉期外のためリスク低表示。",
    },
    "peach:anthracnose": {
      highDays: "4日先",
      tempNote: "26〜30℃",
      precipNote: "4 mm",
      humidityNote: "78%",
      wetNote: "果面濡れ 3 h",
      windNote: "弱風",
      rationale: "【仮】高温多湿期のサンプル。",
    },
  };

  const MOCK_ONSET = [
    {
      diseaseId: "peach:bacterial_shot_hole",
      infectionWindow: "2026-05-10（仮・感染）",
      onsetWindow: "2026-05-20 前後（仮・症状）",
      confidence: "中",
      basis: "【仮】降雨風後の潜伏期イメージ。モデル未接続。",
      insufficient: false,
    },
    {
      diseaseId: "peach:gray_spot",
      infectionWindow: "2026-04-18（仮）",
      onsetWindow: "2026-04-28 〜 05-05（仮）",
      confidence: "低",
      basis: "【仮】開花期感染後の発病イメージ。",
      insufficient: false,
    },
    {
      diseaseId: "peach:scab",
      infectionWindow: "2026-06-01（仮）",
      onsetWindow: "2026-06-15 前後（仮）",
      confidence: "中",
      basis: "【仮】もも黒星病専用潜伏期は未設定。",
      insufficient: false,
    },
    {
      diseaseId: "peach:leaf_curl",
      infectionWindow: "予測データ不足",
      onsetWindow: "—",
      confidence: "—",
      basis: "春の感染履歴が未入力のため表示しません（サンプル）。",
      insufficient: true,
    },
    {
      diseaseId: "peach:anthracnose",
      infectionWindow: "—",
      onsetWindow: "予測データ不足",
      confidence: "—",
      basis: "果実期データ不足の表示例。",
      insufficient: true,
    },
  ];

  const MOCK_HOURLY = (() => {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const rows = [];
    const base = new Date();
    base.setMinutes(0, 0, 0);
    for (let i = 0; i < 48; i++) {
      const t = new Date(base.getTime() + i * 3600000);
      const h = t.getHours();
      const temp = 12 + Math.sin((h / 24) * Math.PI * 2) * 6;
      const rh = 50 + (h >= 18 || h <= 5 ? 30 : 12);
      const precip = h === 11 || h === 12 ? 1.2 : h === 15 ? 0.4 : 0;
      const wet = precip > 0.1 || rh >= 90 ? 1 : rh >= 85 ? 0.5 : 0;
      const wind = 2 + (h === 13 ? 7 : h === 14 ? 8 : 1.5);
      const windDir = dirs[(h + i) % dirs.length];
      rows.push({
        time: t.toISOString(),
        label: `${h}:00`,
        temp: Math.round(temp * 10) / 10,
        precip,
        humidity: Math.round(rh),
        leafWetHours: wet,
        windSpeed: Math.round(wind * 10) / 10,
        windDir,
      });
    }
    return rows;
  })();

  const MOCK_TIPS = [
    "【仮】降雨と強風が予想されるため、せん孔細菌病の伝染に注意してください（実際の防除指示ではありません）。",
    "【仮】開花期は灰星病の感染条件を確認してください。",
    "【仮】春の低温・降雨が続く場合は縮葉病に注意してください。",
  ];

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_SETTINGS, locationLabel: sharedLocationLabel() };
      }
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      return { ...merged, locationLabel: sharedLocationLabel() };
    } catch {
      return { ...DEFAULT_SETTINGS, locationLabel: sharedLocationLabel() };
    }
  }

  function saveSettings(settings) {
    const prev = loadSettings();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        variety: settings.variety || prev.variety,
        cultivationId: settings.cultivationId || prev.cultivationId,
        growthStageId: settings.growthStageId || prev.growthStageId,
        priorYearStatusId: settings.priorYearStatusId ?? prev.priorYearStatusId,
      })
    );
  }

  function saveSharedLocation(lat, lon, locationName = "") {
    if (typeof OrchardLocationCookie === "undefined") {
      return false;
    }
    OrchardLocationCookie.save({
      lat: String(lat).trim(),
      lon: String(lon).trim(),
      locationName: String(locationName || "").trim(),
    });
    return true;
  }

  function getDayLabels() {
    return ["本日", "1日先", "2日先", "3日先", "4日先", "5日先"];
  }

  function buildViewState(selectedDiseaseId = DISEASE_ORDER[0]) {
    const settings = loadSettings();
    const stage =
      GROWTH_STAGES.find((s) => s.id === settings.growthStageId)?.label || "—";
    const cultivation =
      CULTIVATION.find((c) => c.id === settings.cultivationId)?.label || "—";
    const priorYear =
      PRIOR_YEAR_STATUS.find((p) => p.id === settings.priorYearStatusId)?.label ||
      PRIOR_YEAR_STATUS[0].label;

    const currentRisks = DISEASE_ORDER.map((id) => {
      const d = DISEASES[id];
      const cur = MOCK_CURRENT[id];
      return {
        ...d,
        level: cur.level,
        reason: cur.reason,
        stageNote: cur.stageNote,
        ...RISK[cur.level],
      };
    });

    const infectionMatrix = DISEASE_ORDER.map((id) => ({
      diseaseId: id,
      name: DISEASES[id].name,
      days: MOCK_INFECTION_GRID[id].map((level, i) => ({
        offset: i,
        label: getDayLabels()[i],
        level,
        ...RISK[level],
      })),
    }));

    const onset = MOCK_ONSET.map((row) => ({
      ...row,
      diseaseName: DISEASES[row.diseaseId]?.name || row.diseaseId,
    }));

    const selected = DISEASES[selectedDiseaseId] || DISEASES[DISEASE_ORDER[0]];
    const selectedDetail = MOCK_DAY_DETAIL[selectedDiseaseId] || {};

    return {
      settings,
      stageLabel: stage,
      cultivationLabel: cultivation,
      priorYearLabel: priorYear,
      isLive: false,
      fetchError: null,
      dataSourceLabel: "サンプル表示（予測モデル・気象 API 未接続）",
      updatedAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      currentRisks,
      infectionMatrix,
      onset,
      hourly: MOCK_HOURLY,
      tips: MOCK_TIPS,
      stageDiseaseGuide: STAGE_DISEASE_GUIDE,
      annualCalendar: ANNUAL_CALENDAR,
      selectedDiseaseId,
      selectedDisease: selected,
      selectedDetail,
      onsetTimelineDays: 20,
    };
  }

  async function buildViewStateLive(selectedDiseaseId = DISEASE_ORDER[0]) {
    const base = buildViewState(selectedDiseaseId);
    const loc =
      typeof OrchardLocationCookie !== "undefined"
        ? OrchardLocationCookie.load()
        : { lat: "", lon: "" };
    const lat = parseFloat(String(loc.lat));
    const lon = parseFloat(String(loc.lon));
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return {
        ...base,
        fetchError: "地点が未設定です。設定から緯度・経度を保存してください。",
      };
    }
    if (typeof OrchardRiskClient === "undefined") {
      return { ...base, fetchError: "orchard-risk-client.js が読み込まれていません。" };
    }
    try {
      const settings = loadSettings();
      const forecast = await OrchardRiskClient.fetchForecast({
        crop: "peach",
        lat,
        lon,
        variety: settings.variety,
        growthStageId: settings.growthStageId,
      });
      return OrchardRiskClient.applyToCropViewState(
        base,
        forecast,
        DISEASE_ORDER,
        DISEASES,
        RISK
      );
    } catch (err) {
      return {
        ...base,
        fetchError: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    RISK,
    VARIETIES,
    CULTIVATION,
    GROWTH_STAGES,
    PRIOR_YEAR_STATUS,
    DISEASES,
    DISEASE_ORDER,
    loadSettings,
    saveSettings,
    saveSharedLocation,
    buildViewState,
    buildViewStateLive,
    getDayLabels,
  };
})();
