/**
 * ぶどう病害リスク予報 — MET Norway + NASA POWER（簡易病害モデル）
 */
const GrapeRiskModel = (() => {
  const STORAGE_KEY = "grapeRiskSettings";

  const RISK = {
    low: { label: "低", className: "risk-low" },
    medium: { label: "中", className: "risk-medium" },
    high: { label: "高", className: "risk-high" },
  };

  const VARIETIES = [
    "シャインマスカット",
    "巨峰",
    "ピオーネ",
    "デラウェア",
    "甲州",
    "その他",
  ];

  const CULTIVATION = [
    { id: "open", label: "露地" },
    { id: "rain_shelter", label: "雨よけ" },
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

  /** 病害定義（ぶどう専用 ID） */
  const DISEASES = {
    "grape:downy_mildew": {
      id: "grape:downy_mildew",
      name: "べと病",
      pathogen: "プラズモパラ属（Plasmopara viticola）",
      watchConditions: "降雨・夜間高湿・葉面濡れ",
      summary: "葉裏に白いカビ状の胞子束が出る病害。雨の多い時期に注意。",
    },
    "grape:black_rot": {
      id: "grape:black_rot",
      name: "黒とう病",
      pathogen: "Guignardia bidwellii",
      watchConditions: "降雨と若い組織（新梢・幼果）",
      summary: "葉・果に黒褐色の病斑。梅雨〜初夏の降雨期に発生しやすい。",
    },
    "grape:late_rot": {
      id: "grape:late_rot",
      name: "晩腐病",
      pathogen: "Greeneria uvicola など",
      watchConditions: "降雨・果実への胞子着生・熟期",
      summary:
        "収穫直前の果実腐敗。感染時期と症状出現時期が離れることがあります（感染危険と発病予測を区別）。",
    },
    "grape:gray_mold": {
      id: "grape:gray_mold",
      name: "灰色かび病",
      pathogen: "Botrytis cinerea",
      watchConditions: "開花期の多湿・傷ついた花房",
      summary: "花房や果粒の灰色カビ。開花前後の長雨に注意。",
    },
    "grape:anthracnose": {
      id: "grape:anthracnose",
      name: "褐斑病",
      pathogen: "Elsinoe ampelina",
      watchConditions: "高温多湿・新梢展開期",
      summary: "葉・果の褐色斑とかいじ状痕。暖かい多雨期に注意。",
    },
  };

  const DISEASE_ORDER = [
    "grape:downy_mildew",
    "grape:black_rot",
    "grape:late_rot",
    "grape:gray_mold",
    "grape:anthracnose",
  ];

  const DEFAULT_SETTINGS = {
    variety: "シャインマスカット",
    cultivationId: "rain_shelter",
    growthStageId: "bloom",
  };

  function sharedLocationLabel() {
    if (typeof OrchardLocationCookie !== "undefined") {
      return OrchardLocationCookie.formatLabel();
    }
    return "未設定";
  }

  /** 現在リスク一覧（仮） */
  const MOCK_CURRENT = {
    "grape:downy_mildew": {
      level: "high",
      reason: "降雨・葉面濡れ（サンプル）",
    },
    "grape:black_rot": {
      level: "medium",
      reason: "降雨と若い組織（サンプル）",
    },
    "grape:late_rot": {
      level: "medium",
      reason: "降雨・果実の感染時期（サンプル）",
    },
    "grape:gray_mold": {
      level: "low",
      reason: "開花期の多湿（サンプル）",
    },
    "grape:anthracnose": {
      level: "low",
      reason: "高温多湿（サンプル）",
    },
  };

  /** 5日間（本日〜5日先）感染危険ヒートマップ（仮） */
  const MOCK_INFECTION_GRID = {
    "grape:downy_mildew": ["high", "high", "medium", "medium", "low", "low"],
    "grape:black_rot": ["medium", "high", "medium", "low", "low", "low"],
    "grape:late_rot": ["low", "medium", "medium", "medium", "high", "high"],
    "grape:gray_mold": ["low", "low", "medium", "high", "medium", "low"],
    "grape:anthracnose": ["low", "low", "low", "medium", "medium", "low"],
  };

  const MOCK_DAY_DETAIL = {
    "grape:downy_mildew": {
      highDays: "本日・1日先",
      tempNote: "18〜22℃（適温帯に近い・仮）",
      precipNote: "8〜12 mm/日 想定",
      wetNote: "推定葉面濡れ 9〜11 h/日",
      humidityNote: "相対湿度 85〜92%",
      rationale:
        "【仮データ】降雨と夜間の高湿が続くと胞子の発芽・感染条件が整う想定です。実予測ではありません。",
    },
    "grape:black_rot": {
      highDays: "1日先",
      tempNote: "20〜25℃",
      precipNote: "6 mm 前後",
      wetNote: "推定葉面濡れ 6 h",
      humidityNote: "湿度 78%",
      rationale: "【仮データ】新梢・幼果期の降雨による胞子着生を想定した表示です。",
    },
    "grape:late_rot": {
      highDays: "4〜5日先",
      tempNote: "22〜26℃",
      precipNote: "3〜5 mm",
      wetNote: "果面濡れ 4 h（推定）",
      humidityNote: "湿度 70%",
      rationale:
        "【仮データ】感染危険は成熟期に近づくほど上がる想定。発病（腐敗）予測は別エリアで表示します。",
    },
    "grape:gray_mold": {
      highDays: "3日先",
      tempNote: "16〜20℃",
      precipNote: "2 mm",
      wetNote: "花房濡れ 5 h（推定）",
      humidityNote: "湿度 88%",
      rationale: "【仮データ】開花期の持続湿潤を簡易に表現したサンプルです。",
    },
    "grape:anthracnose": {
      highDays: "—",
      tempNote: "26〜30℃",
      precipNote: "0.5 mm",
      wetNote: "葉面濡れ 2 h",
      humidityNote: "湿度 65%",
      rationale: "【仮データ】高温多湿の日が続く場合に注意が上がる想定です。",
    },
  };

  /** 発病予測（20日）— 一部はデータ不足 */
  const MOCK_ONSET = [
    {
      diseaseId: "grape:downy_mildew",
      infectionWindow: "2026-05-22 前後（仮）",
      onsetWindow: "2026-05-28 〜 06-02（仮）",
      confidence: "中",
      basis: "【仮】感染危険高日後の潜伏期イメージ。モデル未接続。",
      insufficient: false,
    },
    {
      diseaseId: "grape:black_rot",
      infectionWindow: "2026-06-05（仮）",
      onsetWindow: "2026-06-12 前後（仮）",
      confidence: "低",
      basis: "【仮】降雨イベント後の症状出現イメージ。",
      insufficient: false,
    },
    {
      diseaseId: "grape:late_rot",
      infectionWindow: "2026-09-01〜09-05（仮・感染）",
      onsetWindow: "2026-09-20〜収穫直前（仮・果実症状）",
      confidence: "中",
      basis:
        "【仮】晩腐病は感染時期と果実腐敗の現れが離れる例を示すサンプルです。感染危険予報とは別指標です。",
      insufficient: false,
    },
    {
      diseaseId: "grape:gray_mold",
      infectionWindow: "予測データ不足",
      onsetWindow: "—",
      confidence: "—",
      basis: "開花期データが不足している想定の表示例です。",
      insufficient: true,
    },
    {
      diseaseId: "grape:anthracnose",
      infectionWindow: "—",
      onsetWindow: "予測データ不足",
      confidence: "—",
      basis: "累積気象・感染履歴が未入力のため発病予測を表示しません（サンプル）。",
      insufficient: true,
    },
  ];

  /** 時間別気象（48h・仮） */
  const MOCK_HOURLY = (() => {
    const rows = [];
    const base = new Date();
    base.setMinutes(0, 0, 0);
    for (let i = 0; i < 48; i++) {
      const t = new Date(base.getTime() + i * 3600000);
      const h = t.getHours();
      const temp = 14 + Math.sin((h / 24) * Math.PI * 2) * 5 + (i % 7) * 0.1;
      const rh = 55 + (h >= 18 || h <= 6 ? 25 : 10) + (i % 5);
      const precip = h === 14 || h === 15 ? 0.8 : h === 3 ? 0.3 : 0;
      const wet = precip > 0.1 || rh >= 90 ? 1 : rh >= 82 ? 0.4 : 0;
      rows.push({
        time: t.toISOString(),
        label: `${h}:00`,
        temp: Math.round(temp * 10) / 10,
        precip,
        humidity: Math.round(rh),
        leafWetHours: wet,
      });
    }
    return rows;
  })();

  const MOCK_TIPS = [
    "【仮】降雨が予想されるため、べと病の感染条件（葉面濡れ）に注意してください。",
    "【仮】開花期は灰色かび病の発生に注意してください。花房の管理と通風を確認してください。",
    "【仮】晩腐病については、感染時期と果実成熟期の発病を分けて確認してください。",
  ];

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        variety: settings.variety || DEFAULT_SETTINGS.variety,
        cultivationId: settings.cultivationId || DEFAULT_SETTINGS.cultivationId,
        growthStageId: settings.growthStageId || DEFAULT_SETTINGS.growthStageId,
      })
    );
  }

  function saveGrowthStageId(growthStageId) {
    if (!GROWTH_STAGES.some((s) => s.id === growthStageId)) {
      return;
    }
    const prev = loadSettings();
    saveSettings({ ...prev, growthStageId });
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
    const locationLabel = sharedLocationLabel();

    const currentRisks = DISEASE_ORDER.map((id) => {
      const d = DISEASES[id];
      const cur = MOCK_CURRENT[id];
      return {
        ...d,
        level: cur.level,
        reason: cur.reason,
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
      settings: { ...settings, locationLabel },
      stageLabel: stage,
      cultivationLabel: cultivation,
      isLive: false,
      fetchError: null,
      dataSourceLabel: "表示例（地点未設定・感染危険・発病予測はサンプル）",
      updatedAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      currentRisks,
      infectionMatrix,
      onset,
      hourly: MOCK_HOURLY,
      tips: MOCK_TIPS,
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
        crop: "grape",
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
    DISEASES,
    DISEASE_ORDER,
    loadSettings,
    saveSettings,
    saveGrowthStageId,
    saveSharedLocation,
    buildViewState,
    buildViewStateLive,
    getDayLabels,
  };
})();
