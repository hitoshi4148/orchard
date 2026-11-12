/**
 * ぶどう・もも病害 UI 向け — /portal/api/orchard-risk クライアント
 */
const OrchardRiskClient = (() => {
  const ORCHARD_PAGES_ORIGIN = "https://orchard-aa7.pages.dev";
  const DAY_LABELS = ["本日", "1日先", "2日先", "3日先", "4日先", "5日先"];

  function resolveOrchardRiskApiUrl(pathAndQuery) {
    const url =
      pathAndQuery.startsWith("/") ? pathAndQuery : `/portal/api/${pathAndQuery}`;
    if (typeof location === "undefined") {
      return url;
    }
    if (location.hostname.endsWith("turf-tools.jp")) {
      return `${ORCHARD_PAGES_ORIGIN}${url}`;
    }
    return url;
  }

  function formatWindNoteFromDay(day) {
    if (!day || day.maxWindMs == null) {
      return "—（風データなし）";
    }
    let text = `最大 ${Number(day.maxWindMs).toFixed(1)} m/s`;
    if (day.maxWindCompass) {
      text += `・${day.maxWindCompass}風`;
    }
    return `${text}（MET 予報）`;
  }

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

  function httpErrorMessage(text, status) {
    const trimmed = text.trim();
    if (trimmed.includes("error code: 1102")) {
      return "サーバー処理時間の上限に達しました。数十秒待ってから再読み込みしてください。";
    }
    const head = trimmed.slice(0, 64).toLowerCase();
    if (head.startsWith("<!doctype") || head.startsWith("<html")) {
      if (typeof location !== "undefined" && /turf-tools\.jp$/i.test(location.hostname)) {
        return "この URL では病害リスク API が利用できません。https://orchard-aa7.pages.dev/portal/peach-risk/ または /portal/grape-risk/ から開いてください。";
      }
      return `気象 API が一時的に応答できませんでした（HTTP ${status}）。数十秒後に再読み込みしてください。`;
    }
    if (trimmed) {
      return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
    }
    return `気象 API エラー（HTTP ${status}）`;
  }

  async function fetchForecast({
    crop,
    lat,
    lon,
    variety,
    growthStageId,
    priorYearStatusId,
    grapeCultivationId,
  }) {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      crop,
      variety,
      growth_stage: growthStageId,
      marssonina_onset: "0",
    });
    if (priorYearStatusId) {
      params.set("prior_year", priorYearStatusId);
    }
    if (crop === "grape" && grapeCultivationId) {
      params.set("grape_cultivation", grapeCultivationId);
    }
    const url = resolveOrchardRiskApiUrl(
      `/portal/api/orchard-risk?${params.toString()}`
    );
    const retryable = new Set([502, 503, 504, 520, 524, 525]);
    let lastError = null;
    for (let attempt = 0; attempt <= 4; attempt += 1) {
      const res = await fetch(url);
      const text = await res.text();
      const json = parseJson(text);
      if (json && typeof json === "object" && "success" in json) {
        if (json.success && json.forecast) {
          return json.forecast;
        }
        const apiError = new Error(
          json.error || "気象 API の取得に失敗しました"
        );
        if (retryable.has(res.status) && attempt < 4) {
          lastError = apiError;
          await new Promise((r) => setTimeout(r, 1200 * 2 ** attempt));
          continue;
        }
        throw apiError;
      }
      if (text.includes("error code: 1102")) {
        if (attempt < 4) {
          lastError = new Error(httpErrorMessage(text, res.status));
          await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
          continue;
        }
        throw new Error(httpErrorMessage(text, res.status));
      }
      if (retryable.has(res.status) && attempt < 4) {
        lastError = new Error(httpErrorMessage(text, res.status));
        await new Promise((r) => setTimeout(r, 1200 * 2 ** attempt));
        continue;
      }
      throw new Error(httpErrorMessage(text, res.status));
    }
    throw lastError ?? new Error("気象 API の取得に失敗しました");
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
        stageNote:
          baseState.stageLabel && baseState.stageLabel !== "—"
            ? `現在の設定: ${baseState.stageLabel}（感染モデルに反映）`
            : "生育ステージ未設定",
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
        row.modelStatus === "seasonal" ||
        row.modelStatus === "gdd";
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
        gddSinceInfectionDayC: row.gddSinceInfectionDayC ?? null,
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
          windNote: formatWindNoteFromDay(w0),
          rationale: forecast.rationales[selectedId] || "",
        }
      : baseState.selectedDetail;

    return {
      ...baseState,
      isLive: true,
      fetchError: null,
      dataSourceLabel: forecast.dataSourceLabel,
      varietyFactor: forecast.varietyFactor ?? 1,
      priorYearInfectionNote: forecast.priorYearInfectionNote || null,
      grapeCultivationInfectionNote:
        forecast.grapeCultivationInfectionNote || null,
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
