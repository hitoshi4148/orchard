/**
 * りんご・なし病害リスク予報 — データモデル
 * 気象は共通、病害パラメータは cropId:diseaseKey で独立管理
 */
const OrchardRiskModel = (() => {
  const STORAGE_LOCATION = "orchardRiskLocation";
  const STORAGE_CROP = "orchardRiskCrop";
  const STORAGE_VARIETY_PREFIX = "orchardRiskVariety:";
  const STORAGE_STAGE_PREFIX = "orchardRiskStage:";
  const LEGACY_STAGE_KEY = "appleRiskGrowthStage";
  const LEGACY_LOCATION_KEY = "appleRiskLocation";

  const RISK = {
    low: { label: "低", className: "risk-low" },
    caution: { label: "注意", className: "risk-caution" },
    high: { label: "高", className: "risk-high" },
  };

  const GROWTH_STAGES = [
    { id: "bud", label: "発芽・展葉期" },
    { id: "bloom", label: "開花期" },
    { id: "petalfall", label: "落花期" },
    { id: "youngfruit", label: "幼果期" },
    { id: "fruitgrowth", label: "果実肥大期" },
    { id: "harvest", label: "収穫期" },
  ];

  const CROPS = {
    apple: {
      id: "apple",
      label: "りんご",
      varieties: ["ふじ", "つがる", "王林", "ジョナゴールド", "その他"],
      defaultVariety: "ふじ",
    },
    nashi: {
      id: "nashi",
      label: "なし",
      varieties: ["幸水", "豊水", "新高", "二十世紀", "あきづき", "その他"],
      defaultVariety: "幸水",
    },
  };

  /** @type {Record<string, object>} */
  const DISEASES = {
    "apple:scab": {
      id: "apple:scab",
      cropId: "apple",
      name: "黒星病",
      pathogen: "Venturia inaequalis",
      mainSeason: "展葉期〜幼果期",
      infectionTempC: "15〜20℃前後",
      wetHours: "連続濡れ（Mills 法で評価予定）",
      summary:
        "りんごの葉・果に黒褐色の斑点が出る病害。新梢展開期の濡れと適温が重なると感染が進みます。",
      infectionFactors: [
        "降雨・霧雨による連続葉面濡れ",
        "15〜20℃前後の気温",
        "発芽〜幼果期の組織",
      ],
      onsetModel: {
        type: "mills",
        implemented: false,
        note: "将来: Mills 法（改訂版）による一次感染リスク",
      },
    },
    "apple:marssonina": {
      id: "apple:marssonina",
      cropId: "apple",
      name: "褐斑病",
      pathogen: "Marssonina coronaria",
      mainSeason: "梅雨〜晩夏",
      infectionTempC: "25〜28℃前後",
      wetHours: "長時間の高湿・濡れ",
      summary: "りんご葉の褐色斑・早期落葉の原因となる病害。",
      infectionFactors: ["高湿", "展葉〜肥大期", "雨の多い日が続く時期"],
      onsetModel: {
        type: "gdd",
        baseTempC: 4.6,
        thresholdGddDayC: 159,
        implemented: false,
        note: "研究で検討中の積算温度パラメータ（りんご褐斑病専用・未接続）",
      },
    },
    "apple:alternaria": {
      id: "apple:alternaria",
      cropId: "apple",
      name: "斑点落葉病",
      pathogen: "Alternaria alternata など",
      mainSeason: "夏〜秋",
      infectionTempC: "25〜30℃前後",
      wetHours: "傷口経由＋高湿",
      summary: "りんごの葉・果の斑点と落葉。株勢低下時に注意。",
      infectionFactors: ["長雨後の高温", "傷ついた葉・果", "風害後"],
    },
    "apple:anthracnose": {
      id: "apple:anthracnose",
      cropId: "apple",
      name: "炭疽病",
      pathogen: "Colletotrichum gloeosporioides など",
      mainSeason: "肥大期〜収穫期",
      infectionTempC: "22〜28℃",
      wetHours: "果実表面の湿潤",
      summary: "りんご果実の円形病斑。多雨期に発生しやすい。",
      infectionFactors: ["果実への雨水", "肥大〜収穫期", "軽微な果皮傷"],
    },
    "apple:blotch": {
      id: "apple:blotch",
      cropId: "apple",
      name: "輪紋病",
      pathogen: "Phlyctaena vagabunda など",
      mainSeason: "収穫期前後",
      infectionTempC: "20〜25℃",
      wetHours: "冠内の滞湿",
      summary: "りんご果実の同心円状斑点。",
      infectionFactors: ["収穫前の湿気", "冠内通風不良", "果皮の微細傷"],
    },
    "nashi:scab": {
      id: "nashi:scab",
      cropId: "nashi",
      name: "黒星病",
      pathogen: "Venturia nashicola（ほか種差あり）",
      mainSeason: "展葉期〜幼果期",
      infectionTempC: "15〜22℃前後",
      wetHours: "連続葉面濡れ（Duthie モデル予定）",
      summary:
        "なしの葉・果に黒褐色星状斑。りんご黒星病とは病原・条件が異なります。",
      infectionFactors: [
        "展葉期の長時間濡れ",
        "適温帯での降雨",
        "新葉・幼果",
      ],
      onsetModel: {
        type: "duthie",
        implemented: false,
        note: "将来: Duthie モデル（なし黒星病専用・未接続）",
      },
    },
    "nashi:red_spot": {
      id: "nashi:red_spot",
      cropId: "nashi",
      name: "赤星病",
      pathogen: "世代交代型（擬盤菌類）",
      mainSeason: "春〜初夏",
      infectionTempC: "15〜22℃",
      wetHours: "落葉上の子嚢盤発生と湿潤",
      summary: "なしの赤褐色星状斑。落葉管理と春の湿りが鍵。",
      infectionFactors: ["落葉残存", "春の多雨", "展葉期"],
    },
    "nashi:blotch": {
      id: "nashi:blotch",
      cropId: "nashi",
      name: "輪紋病",
      pathogen: "Phlyctaena piricola など",
      mainSeason: "収穫期前後",
      infectionTempC: "20〜26℃",
      wetHours: "果面の湿潤",
      summary: "なし果実の輪状病斑。りんご輪紋病とは別病原。",
      infectionFactors: ["熟期の降雨", "果実の微小傷", "滞湿"],
    },
    "nashi:black_spot": {
      id: "nashi:black_spot",
      cropId: "nashi",
      name: "黒斑病",
      pathogen: "Alternaria kikuchiana",
      mainSeason: "夏〜秋",
      infectionTempC: "25〜30℃",
      wetHours: "高湿＋葉・果への湿り",
      summary: "なしの黒色斑点と落葉。高温多雨期に注意。",
      infectionFactors: ["梅雨〜夏の高温多湿", "弱った葉", "通風不良"],
    },
    "nashi:anthracnose": {
      id: "nashi:anthracnose",
      cropId: "nashi",
      name: "炭疽病",
      pathogen: "Colletotrichum 属",
      mainSeason: "肥大期〜熟期",
      infectionTempC: "22〜28℃",
      wetHours: "果面濡れ",
      summary: "なし果実の黒褐色病斑。収穫品質に影響。",
      infectionFactors: ["果実期の降雨", "冠内湿度", "軽傷"],
    },
  };

  const DISEASE_IDS_BY_CROP = {
    apple: [
      "apple:scab",
      "apple:marssonina",
      "apple:alternaria",
      "apple:anthracnose",
      "apple:blotch",
    ],
    nashi: [
      "nashi:scab",
      "nashi:red_spot",
      "nashi:blotch",
      "nashi:black_spot",
      "nashi:anthracnose",
    ],
  };

  const MOCK_INFECTION = {
    apple: {
      "apple:scab": ["low", "low", "caution", "caution", "high", "high"],
      "apple:marssonina": ["low", "caution", "caution", "high", "high", "caution"],
      "apple:alternaria": ["low", "low", "low", "caution", "caution", "low"],
      "apple:anthracnose": ["low", "low", "low", "low", "caution", "caution"],
      "apple:blotch": ["low", "low", "low", "low", "low", "caution"],
    },
    nashi: {
      "nashi:scab": ["caution", "caution", "high", "high", "caution", "low"],
      "nashi:red_spot": ["low", "low", "caution", "caution", "high", "caution"],
      "nashi:blotch": ["low", "low", "low", "low", "caution", "caution"],
      "nashi:black_spot": ["low", "caution", "caution", "high", "high", "high"],
      "nashi:anthracnose": ["low", "low", "low", "caution", "caution", "low"],
    },
  };

  const MOCK_RATIONALE = {
    "apple:scab":
      "今後3日間は気温が感染適温に近く、降雨による葉面濡れ時間の増加が予想されるため、りんご黒星病の感染危険度が高まっています。（デモ表示）",
    "apple:marssonina":
      "4日先から湿度上昇が続く見込みで、褐斑病の注意域が広がります。（デモ表示）",
    "apple:alternaria": "当面は乾燥寄りで、斑点落葉病のリスクは低めです。（デモ表示）",
    "apple:anthracnose": "5日先に果実期の湿潤が増す予想です。（デモ表示）",
    "apple:blotch": "収穫期前の滞湿に注意。（デモ表示）",
    "nashi:scab":
      "展葉期の濡れが続くと、なし黒星病（V. nashicola）の感染危険が上がります。りんご黒星病とは別判定です。（デモ表示）",
    "nashi:red_spot": "落葉由来の初侵染と春の湿りが重なる時期に注意。（デモ表示）",
    "nashi:blotch": "熟期の降雨が増えると輪紋病リスクが上がります。（デモ表示）",
    "nashi:black_spot": "高温多湿が続く日は黒斑病に注意。（デモ表示）",
    "nashi:anthracnose": "果実肥大期の降雨が鍵。（デモ表示）",
  };

  const MOCK_ONSET = {
    apple: [
      {
        diseaseId: "apple:scab",
        estimatedInfectionDate: "2026-05-18",
        gddSinceInfectionDayC: 142,
        predictedOnsetWindow: "2026-05-28 〜 06-02",
        confidence: "中",
        note: "デモ表示 — 感染日は将来の気象連携で更新",
      },
      {
        diseaseId: "apple:marssonina",
        estimatedInfectionDate: "2026-06-22",
        gddSinceInfectionDayC: 88,
        predictedOnsetWindow: "2026-07-08 〜 07-15",
        confidence: "低",
        note: "デモ表示 — 褐斑病 GDD（4.6℃基準・159日℃）は未接続",
      },
      {
        diseaseId: "apple:alternaria",
        estimatedInfectionDate: "—",
        gddSinceInfectionDayC: null,
        predictedOnsetWindow: "20日以内の発病予測なし",
        confidence: "低",
        note: "デモ表示",
      },
      {
        diseaseId: "apple:anthracnose",
        estimatedInfectionDate: "2026-09-02",
        gddSinceInfectionDayC: null,
        predictedOnsetWindow: "2026-09-18 〜 09-25",
        confidence: "中",
        note: "デモ表示",
      },
      {
        diseaseId: "apple:blotch",
        estimatedInfectionDate: "2026-10-05",
        gddSinceInfectionDayC: null,
        predictedOnsetWindow: "2026-10-20 前後",
        confidence: "低",
        note: "デモ表示",
      },
    ],
    nashi: [
      {
        diseaseId: "nashi:scab",
        estimatedInfectionDate: "2026-04-12",
        gddSinceInfectionDayC: null,
        predictedOnsetWindow: "2026-04-22 〜 04-28",
        confidence: "低",
        note: "デモ表示 — Duthie モデル未接続",
      },
      {
        diseaseId: "nashi:red_spot",
        estimatedInfectionDate: "2026-05-05",
        gddSinceInfectionDayC: 96,
        predictedOnsetWindow: "2026-05-18 〜 05-24",
        confidence: "中",
        note: "デモ表示",
      },
      {
        diseaseId: "nashi:blotch",
        estimatedInfectionDate: "—",
        gddSinceInfectionDayC: null,
        predictedOnsetWindow: "該当なし",
        confidence: "低",
        note: "デモ表示",
      },
      {
        diseaseId: "nashi:black_spot",
        estimatedInfectionDate: "2026-08-01",
        gddSinceInfectionDayC: 120,
        predictedOnsetWindow: "2026-08-12 〜 08-20",
        confidence: "中",
        note: "デモ表示",
      },
      {
        diseaseId: "nashi:anthracnose",
        estimatedInfectionDate: "2026-09-10",
        gddSinceInfectionDayC: null,
        predictedOnsetWindow: "2026-09-22 前後",
        confidence: "低",
        note: "デモ表示",
      },
    ],
  };

  const MOCK_WEATHER_5D = [
    {
      dayOffset: 0,
      label: "本日",
      avgTemp: 18.2,
      maxTemp: 22.0,
      minTemp: 14.1,
      precipMm: 0.5,
      humidityPct: 68,
      leafWetHours: 2.5,
      leafWetIsEstimated: true,
    },
    {
      dayOffset: 1,
      label: "1日先",
      avgTemp: 17.5,
      maxTemp: 20.5,
      minTemp: 13.8,
      precipMm: 8.2,
      humidityPct: 88,
      leafWetHours: 9.0,
      leafWetIsEstimated: true,
    },
    {
      dayOffset: 2,
      label: "2日先",
      avgTemp: 16.8,
      maxTemp: 19.0,
      minTemp: 13.2,
      precipMm: 12.0,
      humidityPct: 92,
      leafWetHours: 11.5,
      leafWetIsEstimated: true,
    },
    {
      dayOffset: 3,
      label: "3日先",
      avgTemp: 19.4,
      maxTemp: 23.5,
      minTemp: 14.5,
      precipMm: 3.0,
      humidityPct: 78,
      leafWetHours: 5.5,
      leafWetIsEstimated: true,
    },
    {
      dayOffset: 4,
      label: "4日先",
      avgTemp: 21.0,
      maxTemp: 26.0,
      minTemp: 15.8,
      precipMm: 0.0,
      humidityPct: 62,
      leafWetHours: 1.0,
      leafWetIsEstimated: true,
    },
    {
      dayOffset: 5,
      label: "5日先",
      avgTemp: 22.5,
      maxTemp: 27.5,
      minTemp: 16.5,
      precipMm: 0.2,
      humidityPct: 58,
      leafWetHours: 0.5,
      leafWetIsEstimated: true,
    },
  ];

  const DEFAULT_LOCATION = {
    prefecture: "群馬県",
    municipality: "前橋市",
    label: "群馬県 前橋市",
    lat: "36.39",
    lon: "139.06",
    source: "demo",
  };

  function migrateLegacyStorage() {
    if (!localStorage.getItem(STORAGE_LOCATION) && localStorage.getItem(LEGACY_LOCATION_KEY)) {
      localStorage.setItem(STORAGE_LOCATION, localStorage.getItem(LEGACY_LOCATION_KEY));
    }
    if (!localStorage.getItem(`${STORAGE_STAGE_PREFIX}apple`) && localStorage.getItem(LEGACY_STAGE_KEY)) {
      localStorage.setItem(
        `${STORAGE_STAGE_PREFIX}apple`,
        localStorage.getItem(LEGACY_STAGE_KEY)
      );
    }
  }

  migrateLegacyStorage();

  function loadCropId() {
    const id = localStorage.getItem(STORAGE_CROP);
    return id === "nashi" ? "nashi" : "apple";
  }

  function saveCropId(cropId) {
    if (CROPS[cropId]) {
      localStorage.setItem(STORAGE_CROP, cropId);
    }
  }

  function loadVariety(cropId = loadCropId()) {
    const key = `${STORAGE_VARIETY_PREFIX}${cropId}`;
    const saved = localStorage.getItem(key);
    if (saved && CROPS[cropId].varieties.includes(saved)) return saved;
    return CROPS[cropId].defaultVariety;
  }

  function saveVariety(cropId, variety) {
    if (CROPS[cropId]?.varieties.includes(variety)) {
      localStorage.setItem(`${STORAGE_VARIETY_PREFIX}${cropId}`, variety);
    }
  }

  function loadGrowthStageId(cropId = loadCropId()) {
    const saved = localStorage.getItem(`${STORAGE_STAGE_PREFIX}${cropId}`);
    if (saved && GROWTH_STAGES.some((s) => s.id === saved)) return saved;
    return cropId === "nashi" ? "youngfruit" : "fruitgrowth";
  }

  function saveGrowthStageId(cropId, stageId) {
    if (GROWTH_STAGES.some((s) => s.id === stageId)) {
      localStorage.setItem(`${STORAGE_STAGE_PREFIX}${cropId}`, stageId);
    }
  }

  function loadLocation() {
    try {
      const raw = localStorage.getItem(STORAGE_LOCATION);
      if (!raw) return { ...DEFAULT_LOCATION };
      const parsed = JSON.parse(raw);
      return {
        prefecture: parsed.prefecture || DEFAULT_LOCATION.prefecture,
        municipality: parsed.municipality || DEFAULT_LOCATION.municipality,
        label:
          parsed.label ||
          `${parsed.prefecture || ""} ${parsed.municipality || ""}`.trim(),
        lat: parsed.lat || DEFAULT_LOCATION.lat,
        lon: parsed.lon || DEFAULT_LOCATION.lon,
        source: parsed.source || "user",
      };
    } catch {
      return { ...DEFAULT_LOCATION };
    }
  }

  function saveLocation(location) {
    localStorage.setItem(
      STORAGE_LOCATION,
      JSON.stringify({
        ...location,
        label: `${location.prefecture} ${location.municipality}`.trim(),
      })
    );
  }

  function tryLoadPortalLocation() {
    const cookies = document.cookie.split(";");
    const match = cookies.find((c) => c.trim().startsWith("portalSettings="));
    if (!match) return null;
    try {
      const jsonStr = decodeURIComponent(match.split("=").slice(1).join("="));
      const settings = JSON.parse(jsonStr);
      const lat = String(settings.lat || "").trim();
      const lon = String(settings.lon || "").trim();
      if (!lat || !lon) return null;
      const place = String(settings.locationName || "").trim();
      return {
        prefecture: place || "ポータル設定",
        municipality: "",
        label: place || `緯度 ${lat} / 経度 ${lon}`,
        lat,
        lon,
        source: "portalSettings",
      };
    } catch {
      return null;
    }
  }

  function getDiseasesForCrop(cropId) {
    return DISEASE_IDS_BY_CROP[cropId].map((id) => DISEASES[id]);
  }

  function aggregateOverallRisk(levels) {
    const score = { low: 0, caution: 1, high: 2 };
    let max = "low";
    for (const lvl of levels) {
      if (score[lvl] > score[max]) max = lvl;
    }
    return max;
  }

  function dayLabelsFromLevels(levels) {
    return levels.map((level, i) => ({
      offset: i,
      label: i === 0 ? "本日" : `${i}日先`,
      level,
      ...RISK[level],
    }));
  }

  function applyServerForecast(baseDashboard, forecast) {
    if (!forecast || forecast.cropId !== baseDashboard.cropId) {
      return baseDashboard;
    }

    const diseases = getDiseasesForCrop(baseDashboard.cropId);
    const infectionByDisease = diseases.map((d) => {
      const levels =
        forecast.infectionByDiseaseId?.[d.id] || MOCK_INFECTION[baseDashboard.cropId][d.id];
      const isDemo = (forecast.demoDiseaseIds || []).includes(d.id);
      const modelStatus = forecast.modelStatusByDisease?.[d.id] || "demo";
      let rationale = forecast.rationales?.[d.id] || MOCK_RATIONALE[d.id];
      if (isDemo && modelStatus !== "mills") {
        rationale += " 【簡易／未接続モデル — 確定的な予測ではありません】";
      }
      return {
        ...d,
        days: dayLabelsFromLevels(levels),
        rationale,
        modelStatus,
        liveData: !isDemo || modelStatus === "mills",
      };
    });

    const overall = {
      today: aggregateOverallRisk(infectionByDisease.map((d) => d.days[0].level)),
      day3: aggregateOverallRisk(
        infectionByDisease.map((d) => d.days[3]?.level || "low")
      ),
      day5: aggregateOverallRisk(
        infectionByDisease.map((d) => d.days[5]?.level || "low")
      ),
    };

    const onset = (forecast.onset || MOCK_ONSET[baseDashboard.cropId]).map((row) => {
      const disease = DISEASES[row.diseaseId];
      return {
        ...row,
        diseaseName: disease?.name || row.diseaseId,
        disease,
        isDemo: row.isDemo === true,
      };
    });

    return {
      ...baseDashboard,
      variety: forecast.variety || baseDashboard.variety,
      varietyFactor: forecast.varietyFactor,
      dataSource: "live",
      dataSourceLabel: forecast.dataSourceLabel || baseDashboard.dataSourceLabel,
      updatedAt: forecast.updatedAt || baseDashboard.updatedAt,
      infectionByDisease,
      overall,
      onset,
      weather5d: forecast.weather5d || baseDashboard.weather5d,
      fetchError: null,
    };
  }

  async function fetchServerForecast(cropId = loadCropId()) {
    const loc = loadLocation();
    const lat = parseFloat(String(loc.lat));
    const lon = parseFloat(String(loc.lon));
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      throw new Error("予報地点の緯度・経度が未設定です");
    }
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      crop: cropId,
      variety: loadVariety(cropId),
      growth_stage: loadGrowthStageId(cropId),
    });
    const res = await fetch(`/portal/api/orchard-risk?${params.toString()}`);
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || "気象 API の取得に失敗しました");
    }
    return json.forecast;
  }

  async function buildDashboardLive(cropId = loadCropId()) {
    const base = buildDashboard(cropId);
    try {
      const forecast = await fetchServerForecast(cropId);
      return applyServerForecast(base, forecast);
    } catch (err) {
      return {
        ...base,
        fetchError: err instanceof Error ? err.message : String(err),
      };
    }
  }

  function buildDashboard(cropId = loadCropId()) {
    const crop = CROPS[cropId];
    const updatedAt = new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const infectionGrid = MOCK_INFECTION[cropId];
    const diseases = getDiseasesForCrop(cropId);

    const infectionByDisease = diseases.map((d) => ({
      ...d,
      days: infectionGrid[d.id].map((level, i) => ({
        offset: i,
        label: i === 0 ? "本日" : `${i}日先`,
        level,
        ...RISK[level],
      })),
      rationale: MOCK_RATIONALE[d.id],
    }));

    const overall = {
      today: aggregateOverallRisk(infectionByDisease.map((d) => d.days[0].level)),
      day3: aggregateOverallRisk(infectionByDisease.map((d) => d.days[3]?.level || "low")),
      day5: aggregateOverallRisk(infectionByDisease.map((d) => d.days[5]?.level || "low")),
    };

    const onset = MOCK_ONSET[cropId].map((row) => {
      const disease = DISEASES[row.diseaseId];
      return {
        ...row,
        diseaseName: disease?.name || row.diseaseId,
        disease,
      };
    });

    return {
      cropId,
      cropLabel: crop.label,
      variety: loadVariety(cropId),
      varieties: crop.varieties,
      dataSource: "demo",
      dataSourceLabel: `デモ表示（${crop.label}・気象 API 未接続）`,
      updatedAt,
      location: loadLocation(),
      growthStageId: loadGrowthStageId(cropId),
      growthStages: GROWTH_STAGES,
      infectionByDisease,
      overall,
      onset,
      onsetTimelineDays: 20,
      weather5d: MOCK_WEATHER_5D,
    };
  }

  return {
    CROPS,
    GROWTH_STAGES,
    RISK,
    DISEASES,
    loadCropId,
    saveCropId,
    loadVariety,
    saveVariety,
    loadLocation,
    saveLocation,
    loadGrowthStageId,
    saveGrowthStageId,
    tryLoadPortalLocation,
    buildDashboard,
    buildDashboardLive,
    applyServerForecast,
    fetchServerForecast,
  };
})();

/** @deprecated 互換エイリアス */
const AppleRiskModel = OrchardRiskModel;
