/**
 * ぶどう・もも病害 UI 向け — /portal/api/orchard-risk クライアント
 */
const OrchardRiskClient = (() => {
  const DAY_LABELS = ["本日", "1日先", "2日先", "3日先", "4日先", "5日先"];

  function mapUiLevel(serverLevel) {
    if (serverLevel === "caution") return "medium";
    if (serverLevel === "high") return "high";
    return "low";
  }

  function parseJson(text) {
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  async function fetchForecast({
    crop,
    lat,
    lon,
    variety,
    growthStageId,
  }) {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      crop,
      variety,
      growth_stage: growthStageId,
      marssonina_onset: "0",
    });
    const res = await fetch(`/portal/api/orchard-risk?${params.toString()}`);
    const text = await res.text();
    const json = parseJson(text);
    if (json?.success && json.forecast) {
      return json.forecast;
    }
    throw new Error(
      json?.error || `気象 API エラー（HTTP ${res.status}）`
    );
  }

  function buildTipsFromForecast(forecast, diseaseOrder, diseases, riskMeta) {
    const highs = diseaseOrder
      .map((id) => ({
        id,
        name: diseases[id]?.name || id,
        level: forecast.infectionByDiseaseId[id]?.[0],
      }))
      .filter((r) => r.level === "high" || r.level === "caution");
  const lines = highs.slice(0, 3).map((r) => {
      const ui = mapUiLevel(r.level);
      return `${r.name}の感染危険が${riskMeta[ui]?.label || ui}です。${(forecast.rationales[r.id] || "").slice(0, 120)}`;
    });
    return lines.length
      ? lines
      : ["本日は全病害とも感染危険は低めです（簡易モデル）。開花・展葉期は継続監視してください。"];
  }

  function applyToCropViewState(baseState, forecast, diseaseOrder, diseases, riskMeta) {
    const currentRisks = diseaseOrder.map((id) => {
      const d = diseases[id];
      const serverLevel = forecast.infectionByDiseaseId[id]?.[0] || "low";
      const uiLevel = mapUiLevel(serverLevel);
      return {
        ...d,
        level: uiLevel,
        reason: (forecast.rationales[id] || "—").slice(0, 200),
        stageNote: "生育ステージは設定を参照",
        ...riskMeta[uiLevel],
      };
    });

    const infectionMatrix = diseaseOrder.map((id) => ({
      diseaseId: id,
      name: diseases[id].name,
      days: (forecast.infectionByDiseaseId[id] || []).map((level, i) => {
        const uiLevel = mapUiLevel(level);
        return {
          offset: i,
          label: DAY_LABELS[i] || `${i}日先`,
          level: uiLevel,
          ...riskMeta[uiLevel],
        };
      }),
    }));

    const onset = diseaseOrder.map((id) => {
      const row =
        (forecast.onset || []).find((r) => r.diseaseId === id) || null;
      if (!row) {
        return {
          diseaseId: id,
          diseaseName: diseases[id].name,
          infectionWindow: "—",
          onsetWindow: "—",
          confidence: "—",
          basis: "API から発病予測行を取得できませんでした。",
          insufficient: true,
          isDemo: true,
          liveData: false,
          modelStatus: "demo",
        };
      }
      const serverDemo =
        row.isDemo === true || row.modelStatus === "demo";
      const liveData =
        !serverDemo ||
        row.modelStatus === "heuristic" ||
        row.modelStatus === "seasonal";
      const insufficient =
        serverDemo &&
        (row.predictedOnsetWindow === "モデル未接続" ||
          row.note?.includes("次フェーズ"));
      return {
        diseaseId: id,
        diseaseName: diseases[id].name,
        infectionWindow: row.estimatedInfectionDate || "—",
        onsetWindow: row.predictedOnsetWindow || "—",
        confidence: row.confidence || "低",
        basis: row.note || forecast.rationales[id] || "",
        insufficient,
        isDemo: serverDemo,
        liveData,
        modelStatus: row.modelStatus,
      };
    });

    const selectedId = baseState.selectedDiseaseId;
    const weather5d = forecast.weather5d || [];
    const hourly = weather5d.flatMap((day, di) => {
      const slots = 4;
      return Array.from({ length: slots }, (_, si) => ({
        time: day.date,
        label: `${day.label} ${si * 6}h`,
        temp: day.avgTemp,
        precip: day.precipMm / slots,
        humidity: day.humidityPct,
        leafWetHours: day.leafWetHours / slots,
        dayOffset: di,
      }));
    });

    const w0 = weather5d[0];
    const selectedDetail = w0
      ? {
          highDays: infectionMatrix
            .find((r) => r.diseaseId === selectedId)
            ?.days.filter((d) => d.level === "high")
            .map((d) => d.label)
            .join("・") || "—",
          tempNote: `${w0.minTemp?.toFixed?.(1) ?? w0.minTemp}〜${w0.maxTemp?.toFixed?.(1) ?? w0.maxTemp}℃（日次）`,
          precipNote: `${w0.precipMm?.toFixed?.(1) ?? w0.precipMm} mm/日`,
          wetNote: `推定葉面濡れ ${w0.leafWetHours?.toFixed?.(1) ?? w0.leafWetHours} h/日`,
          humidityNote: `相対湿度 ${Math.round(w0.humidityPct)}%`,
          windNote: "—（API 未提供）",
          rationale: forecast.rationales[selectedId] || "",
        }
      : baseState.selectedDetail;

    return {
      ...baseState,
      isLive: true,
      fetchError: null,
      dataSourceLabel: forecast.dataSourceLabel,
      varietyFactor: forecast.varietyFactor ?? 1,
      updatedAt: forecast.updatedAt,
      currentRisks,
      infectionMatrix,
      onset,
      hourly: hourly.length ? hourly : baseState.hourly,
      weatherDaily: weather5d,
      tips: buildTipsFromForecast(
        forecast,
        diseaseOrder,
        diseases,
        riskMeta
      ),
      selectedDetail,
    };
  }

  return {
    DAY_LABELS,
    mapUiLevel,
    fetchForecast,
    applyToCropViewState,
  };
})();
