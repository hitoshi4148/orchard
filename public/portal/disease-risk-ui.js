const DiseaseRiskUI = (() => {
  function getJstDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return { year: get("year"), month: get("month"), day: get("day") };
  }

  function formatDiseaseTargetLabel(daysFromToday, hour = 6) {
    const { year, month, day } = getJstDateParts();
    const target = new Date(Date.UTC(year, month - 1, day));
    target.setUTCDate(target.getUTCDate() + daysFromToday);
    const m = target.getUTCMonth() + 1;
    const d = target.getUTCDate();
    return `${m}/${d} ${hour}:00`;
  }

  function getRiskColor(risk) {
    if (risk === null || risk === undefined || Number.isNaN(risk)) {
      return "#808080";
    }
    if (risk < 20) return "#3B82F6";
    if (risk < 40) return "#10B981";
    if (risk < 60) return "#FBBF24";
    if (risk < 80) return "#F97316";
    return "#EF4444";
  }

  const DISEASE_ITEMS = [
    { key: "dollarSpot", name: "黒星病", implemented: true },
    { key: "brownPatch", name: "腐らん病", implemented: true },
    { key: "pythium", name: "かいよう病", implemented: true },
    { key: "anthracnose", name: "輪紋病", implemented: true },
    { key: "largePatch", name: "赤星病", implemented: true },
  ];

  const DISEASE_LOGIC = {
    dollarSpot: {
      title: "黒星病",
      subtitle: "Venturia inaequalis（Mills 法）",
      description:
        "時間別データから葉面濡れ期間を推定し、Mills 法（改訂版）で一次感染リスクを評価",
      formula: "感染 = 連続濡れ時間 ≥ Mills必要時間(平均気温)",
      conditions: [
        "評価期間: 直近7日（予測時点まで）",
        "葉面濡れ: 降水量≥0.1mm/h または 湿度≥90%",
        "気温範囲: 5–32℃（Mills 表適用）",
        "21℃以上: 最低6時間の連続濡れで感染",
        "進行中の濡れ期間は閾値50%超で部分リスク加算",
      ],
      calculationHtml: `<div class="disease-logic-calc-block">
      <div>1. 葉面濡れ期間の抽出</div>
      <div>降水または RH≥90% の連続時間</div>
      <div>1時間以内の乾燥は同一期間として結合</div>
      <div class="disease-logic-calc-gap">2. Mills 必要濡れ時間</div>
      <div>濡れ期間の平均気温 → 表から補間</div>
      <div>例: 10℃→22h, 15℃→12h, 20℃→7h, 21℃+→6h</div>
      <div class="disease-logic-calc-gap">3. リスク集計</div>
      <div>感染イベントごとに重症度×新しさで加点</div>
      <div>24h以内: weight 1.0 / 48h: 0.75 / 7日: 0.45</div>
    </div>`,
    },
    brownPatch: {
      title: "腐らん病",
      subtitle: "Valsa ceratosperma（枝幹腐らん病）",
      description:
        "降雨による胞子飛散と、低温期の湿潤時間から枝幹腐らん病の感染リスクを評価",
      formula: "リスク = 季節係数 × Σ(湿潤時間スコア + 降雨ボーナス)",
      conditions: [
        "評価期間: 直近7日（予測時点まで）",
        "感染適温: 5–22℃（傷口治癒が遅い温度帯）",
        "湿潤: 降水量≥0.1mm/h または 湿度≥85%",
        "降雨時間: 柄胞子飛散ボーナスを加算",
        "季節係数: 11–6月=1.0 / 10・7月=0.55 / 8–9月=0.25",
      ],
      calculationHtml: `<div class="disease-logic-calc-block">
      <div>1. 感染適温・湿潤時間</div>
      <div>5–22℃ かつ 降水または RH≥85%</div>
      <div>該当1時間ごとに基本スコア加点</div>
      <div class="disease-logic-calc-gap">2. 降雨ボーナス</div>
      <div>降水量≥0.1mm/h の時間に追加加点</div>
      <div>（柄胞子の飛散盛期を反映）</div>
      <div class="disease-logic-calc-gap">3. 季節係数</div>
      <div>11–6月: ×1.0（飛散盛期）</div>
      <div>10・7月: ×0.55 / 8–9月: ×0.25</div>
      <div class="disease-logic-calc-gap">4. 新しさ weight</div>
      <div>24h以内: 1.0 / 48h: 0.75 / 7日: 0.45</div>
    </div>`,
    },
    pythium: {
      title: "かいよう病",
      subtitle: "Phytophthora 属（リンゴ・ナシ疫病）",
      description:
        "降雨・多湿・適温時間から、遊走子飛沫感染（果実・新梢）のリスクを評価",
      formula: "リスク = 季節係数 × Σ(多湿スコア + 降雨 + 強雨ボーナス)",
      conditions: [
        "評価期間: 直近7日（予測時点まで）",
        "感染適温: 10–28℃（遊走子活動域）",
        "多湿: 降水量≥0.1mm/h または 湿度≥88%",
        "強雨: 降水量≥1.0mm/h で泥はね・飛沫ボーナス",
        "季節係数: 5–9月=1.0 / 4・10月=0.7 / 3・11月=0.4 / 12–2月=0.15",
      ],
      calculationHtml: `<div class="disease-logic-calc-block">
      <div>1. 多湿・適温時間</div>
      <div>10–28℃ かつ 降水または RH≥88%</div>
      <div>該当1時間ごとに基本スコア加点</div>
      <div class="disease-logic-calc-gap">2. 降雨ボーナス</div>
      <div>≥0.1mm/h: 追加加点</div>
      <div>≥1.0mm/h: 強雨（飛沫・泥はね）ボーナス</div>
      <div class="disease-logic-calc-gap">3. 季節係数</div>
      <div>5–9月: ×1.0（梅雨・台風期）</div>
      <div>4・10月: ×0.7 / 3・11月: ×0.4</div>
      <div class="disease-logic-calc-gap">4. 新しさ weight</div>
      <div>24h以内: 1.0 / 48h: 0.75 / 7日: 0.45</div>
    </div>`,
    },
    anthracnose: {
      title: "輪紋病",
      subtitle: "Botryosphaeria dothidea（リンゴ・ナシ輪紋病）",
      description:
        "降雨による柄胞子飛散と、高温・高湿時間から果実・枝幹の輪紋病感染リスクを評価",
      formula: "リスク = 季節係数 × Σ(降雨飛散スコア + 高湿ボーナス)",
      conditions: [
        "評価期間: 直近7日（予測時点まで）",
        "感染適温: 16–32℃（最低気温16℃以上の条件を時間気温で代理）",
        "柄胞子飛散: 降水量≥0.1mm/h（降雨がないと飛散しない）",
        "飛散増加: 降水量≥0.5mm/h で追加加点",
        "高湿感染: 湿度≥90% で付着胞子の発芽・侵入を反映",
        "季節係数: 6–8月=1.0 / 5・9月=0.75 / 4・10月=0.45 / 11–3月=0.2",
      ],
      calculationHtml: `<div class="disease-logic-calc-block">
      <div>1. 降雨・適温時間</div>
      <div>16–32℃ かつ 降水量≥0.1mm/h</div>
      <div>該当1時間ごとに基本スコア加点</div>
      <div class="disease-logic-calc-gap">2. 飛散・感染ボーナス</div>
      <div>≥0.5mm/h: 柄胞子大量飛散ボーナス</div>
      <div>RH≥90%: 果実表面の高湿感染ボーナス</div>
      <div class="disease-logic-calc-gap">3. 季節係数</div>
      <div>6–8月: ×1.0（飛散盛期）</div>
      <div>5・9月: ×0.75 / 4・10月: ×0.45</div>
      <div class="disease-logic-calc-gap">4. 新しさ weight</div>
      <div>24h以内: 1.0 / 48h: 0.75 / 7日: 0.45</div>
    </div>`,
    },
    largePatch: {
      title: "赤星病",
      subtitle: "Gymnosporangium yamadae（リンゴ赤星病・さび病）",
      description:
        "春季の降雨による小生子飛散と、降雨後の高湿継続時間から展葉～落花期の感染リスクを評価",
      formula: "リスク = 季節係数 × Σ(濡れ期間スコア) + 進行中濡れの部分リスク",
      conditions: [
        "評価期間: 直近7日（予測時点まで）",
        "感染適温: 濡れ期間の平均気温 10–22℃",
        "小生子飛散: 濡れ期間内に降水量≥0.1mm/h を含む（降雨が必要）",
        "濡れ継続: 連続6時間以上（RH≥90% または降水で葉面濡れ推定）",
        "高リスク: 降雨後 RH90%以上が15時間以上継続",
        "季節係数: 4–5月=1.0 / 3・6月=0.55 / その他=0.12",
        "※ 中間宿主（ビャクシン類）が園周1–2km以内にない場合は発生しません",
      ],
      calculationHtml: `<div class="disease-logic-calc-block">
      <div>1. 葉面濡れ期間の抽出</div>
      <div>降水≥0.1mm/h または RH≥90% の連続時間</div>
      <div>1時間以内の乾燥は同一期間として結合</div>
      <div class="disease-logic-calc-gap">2. 感染イベント判定</div>
      <div>平均気温10–22℃ かつ 期間≥6h</div>
      <div>かつ 期間内に降雨を含む（冬胞子堆の膨潤・飛散）</div>
      <div class="disease-logic-calc-gap">3. リスク集計</div>
      <div>濡れ期間の長さと新しさで加点</div>
      <div>≥15h: 高湿継続ボーナス</div>
      <div class="disease-logic-calc-gap">4. 季節係数</div>
      <div>4–5月: ×1.0（開花～落花期）</div>
      <div>3・6月: ×0.55 / 7–2月: ×0.12</div>
    </div>`,
    },
  };

  function buildDiseaseLogicHtml(key) {
    const logic = DISEASE_LOGIC[key];
    if (!logic) return "";

    const conditionsHtml = logic.conditions.map((condition) => `<li>${condition}</li>`).join("");

    return `<article class="disease-logic-content">
    <p class="disease-logic-subtitle">${logic.subtitle}</p>
    <p class="disease-logic-description">${logic.description}</p>
    <div class="disease-logic-formula">${logic.formula}</div>
    <section class="disease-logic-section">
      <h3>条件</h3>
      <ul class="disease-logic-list">${conditionsHtml}</ul>
    </section>
    <section class="disease-logic-section disease-logic-calculation">
      <h3>計算式</h3>
      ${logic.calculationHtml}
    </section>
    <p class="disease-logic-note">※ すべてのリスク値は0-100%に正規化されます</p>
    <p class="disease-logic-note">※ データ不足の場合は表示されません</p>
  </article>`;
  }

  function openDiseaseLogicModal(key) {
    const logic = DISEASE_LOGIC[key];
    if (!logic) return;

    document.getElementById("disease-logic-title").textContent = `${logic.title} — 判定ロジック`;
    document.getElementById("disease-logic-body").innerHTML = buildDiseaseLogicHtml(key);
    document.getElementById("disease-logic-modal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function closeDiseaseLogicModal() {
    document.getElementById("disease-logic-modal").classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function buildRiskValueHtml(risk, implemented = true) {
    const riskValue =
      risk !== null && risk !== undefined && !Number.isNaN(risk) ? Math.round(risk) : null;
    const color = getRiskColor(risk);

    if (riskValue !== null) {
      return `<div class="disease-risk-item-value" style="background-color: ${color}">
    ${riskValue}%
  </div>`;
    }

    if (!implemented) {
      return `<div class="disease-risk-item-value disease-risk-item-value--pending" title="プロ向けモデルは順次実装予定です">—</div>`;
    }

    return `<div class="disease-risk-item-value disease-risk-item-value--unknown" title="気象データが不足しているため算出できませんでした">?</div>`;
  }

  function buildCombinedDiseaseRiskPanelHtml(
    title,
    footerLabel,
    firstLabel,
    secondLabel,
    firstRisks,
    secondRisks
  ) {
    let html = `<div class="disease-risk-panel disease-risk-panel--combined">
    <h3 class="disease-risk-title">${title}</h3>
    <div class="disease-risk-table">
      <div class="disease-risk-table-header">
        <div class="disease-risk-table-name"></div>
        <div class="disease-risk-table-col">${firstLabel}</div>
        <div class="disease-risk-table-col">${secondLabel}</div>
      </div>
      <div class="disease-risk-list">`;

    DISEASE_ITEMS.forEach(({ key, name, implemented }) => {
      html += `<div class="disease-risk-item">
      <div class="disease-risk-item-name">
        <span class="disease-risk-item-label">${name}</span>
        <button type="button" class="disease-logic-btn" data-disease-key="${key}">判定ロジック</button>
      </div>
      <div class="disease-risk-item-values">
        ${buildRiskValueHtml(firstRisks[key], implemented)}
        ${buildRiskValueHtml(secondRisks[key], implemented)}
      </div>
    </div>`;
    });

    html += `</div>
    </div>
    <p class="disease-risk-footer">${footerLabel}</p>
    <p class="disease-risk-footer disease-risk-footer-note">? は気象データ不足です。黒星病・腐らん病・かいよう病・輪紋病・赤星病は 0–100% で表示されます（赤星病は中間宿主ビャクシン類の有無は未考慮）。</p>
  </div>`;

    return html;
  }

  function buildForecastPanelHtml(forecast, options = {}) {
    const title = options.title ?? "病害リスク予測";
    const tomorrowLabel = formatDiseaseTargetLabel(1);
    const dayAfterTomorrowLabel = formatDiseaseTargetLabel(2);
    const footerLabel =
      options.footerLabel ??
      `予測時刻: ${tomorrowLabel} / ${dayAfterTomorrowLabel} 時点`;

    return buildCombinedDiseaseRiskPanelHtml(
      title,
      footerLabel,
      tomorrowLabel,
      dayAfterTomorrowLabel,
      forecast.tomorrow,
      forecast.dayAfterTomorrow
    );
  }

  function renderDiseaseRiskPanels(container, forecast) {
    if (!container) return;
    container.innerHTML = buildForecastPanelHtml(forecast);
  }

  function getRiskValues(risks) {
    if (!risks) return [];
    return Object.values(risks).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  }

  function getMaxRisk(risks) {
    const values = getRiskValues(risks);
    return values.length > 0 ? Math.max(...values) : null;
  }

  function getMaxRiskFromForecast(forecast) {
    const tomorrowMax = getMaxRisk(forecast?.tomorrow);
    const dayAfterMax = getMaxRisk(forecast?.dayAfterTomorrow);
    const values = [tomorrowMax, dayAfterMax].filter((v) => v !== null);
    return values.length > 0 ? Math.max(...values) : null;
  }

  function getMaxRiskDiseaseFromForecast(forecast) {
    let maxRisk = null;
    let maxKey = null;

    for (const dayKey of ["tomorrow", "dayAfterTomorrow"]) {
      const risks = forecast?.[dayKey];
      if (!risks) continue;
      for (const { key, name } of DISEASE_ITEMS) {
        const value = risks[key];
        if (value !== null && value !== undefined && !Number.isNaN(value)) {
          if (maxRisk === null || value > maxRisk) {
            maxRisk = value;
            maxKey = name;
          }
        }
      }
    }

    return {
      name: maxKey,
      risk: maxRisk !== null ? Math.round(maxRisk) : null,
    };
  }

  function buildFacilityPopupHtml(facilityName, forecast) {
    const escapedName = String(facilityName)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<div class="risk-popup">
      <h3 class="risk-popup-title">${escapedName}</h3>
      ${buildForecastPanelHtml(forecast)}
    </div>`;
  }

  function bindLogicButtons(container) {
    if (!container || container.dataset.logicBound === "true") return;
    container.dataset.logicBound = "true";
    container.addEventListener("click", (event) => {
      const button = event.target.closest(".disease-logic-btn");
      if (!button) return;
      openDiseaseLogicModal(button.dataset.diseaseKey);
    });
  }

  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    const closeBtn = document.getElementById("disease-logic-close-btn");
    const backdrop = document.getElementById("disease-logic-backdrop");
    if (closeBtn) closeBtn.addEventListener("click", closeDiseaseLogicModal);
    if (backdrop) backdrop.addEventListener("click", closeDiseaseLogicModal);
  }

  return {
    DISEASE_ITEMS,
    getRiskColor,
    formatDiseaseTargetLabel,
    buildForecastPanelHtml,
    renderDiseaseRiskPanels,
    getMaxRisk,
    getMaxRiskFromForecast,
    getMaxRiskDiseaseFromForecast,
    buildFacilityPopupHtml,
    bindLogicButtons,
    openDiseaseLogicModal,
    closeDiseaseLogicModal,
    init,
  };
})();
