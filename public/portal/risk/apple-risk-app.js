document.addEventListener("DOMContentLoaded", () => {
  const Model = typeof OrchardRiskModel !== "undefined" ? OrchardRiskModel : AppleRiskModel;
  const root = document.getElementById("apple-risk-root");
  const modal = document.getElementById("apple-risk-location-modal");
  const modalBackdrop = document.getElementById("apple-risk-modal-backdrop");
  const modalCancel = document.getElementById("apple-risk-modal-cancel");
  const modalSave = document.getElementById("apple-risk-modal-save");
  const stageSelect = document.getElementById("apple-risk-stage-select");

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  }

  function getDetailsHost() {
    return root?.querySelector("#apple-risk-disease-details");
  }

  function renderRiskPill(levelKey) {
    const meta = Model.RISK[levelKey];
    return `<span class="apple-risk-pill risk-${levelKey === "caution" ? "caution" : levelKey}">${meta.label}</span>`;
  }

  function renderOverallCard(dayLabel, levelKey) {
    const meta = Model.RISK[levelKey];
    const riskClass = levelKey === "caution" ? "caution" : levelKey;
    return `<div class="apple-risk-summary-card risk-${riskClass}">
      <div class="card-day">${escapeHtml(dayLabel)}</div>
      <div class="card-level">${meta.label}</div>
      <div class="card-note">全病害の最高リスク</div>
    </div>`;
  }

  function renderCropTabs(dashboard) {
    const crops = Object.values(Model.CROPS);
    return `<div role="tablist" aria-label="栽培果樹の選択" class="apple-risk-crop-tabs">
      ${crops
        .map((c) => {
          const selected = c.id === dashboard.cropId;
          return `<button type="button" role="tab" class="apple-risk-crop-tab${
            selected ? " is-active" : ""
          }" data-crop-switch="${c.id}" aria-selected="${selected}">${escapeHtml(c.label)}</button>`;
        })
        .join("")}
    </div>`;
  }

  function renderVarietySelect(dashboard) {
    const options = dashboard.varieties
      .map(
        (v) =>
          `<option value="${escapeHtml(v)}"${
            v === dashboard.variety ? " selected" : ""
          }>${escapeHtml(v)}</option>`
      )
      .join("");
    return `<label class="apple-risk-variety">
      <span>品種</span>
      <select id="apple-risk-variety-select" class="apple-risk-variety-select">${options}</select>
    </label>`;
  }

  function renderInfectionTable(dashboard) {
    if (!dashboard.infectionByDisease.length) return "";
    const dayLabels = dashboard.infectionByDisease[0].days.map((d) => d.label);
    let rows = "";
    for (const disease of dashboard.infectionByDisease) {
      const cells = disease.days
        .map((d) => `<td>${renderRiskPill(d.level)}</td>`)
        .join("");
      rows += `<tr>
        <td><button type="button" class="disease-link" data-disease-id="${disease.id}">${escapeHtml(disease.name)}</button></td>
        ${cells}
      </tr>`;
    }
    const headerCells = dayLabels.map((l) => `<th>${escapeHtml(l)}</th>`).join("");
    return `<div class="apple-risk-table-wrap">
      <table class="apple-risk-table">
        <thead><tr><th>病害名</th>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  function renderRationales(dashboard) {
    return dashboard.infectionByDisease
      .map(
        (d) => `<details class="apple-risk-rationale-block">
        <summary>${escapeHtml(d.name)} — 予測根拠</summary>
        <p class="apple-risk-rationale">${escapeHtml(d.rationale)}</p>
        <dl class="apple-risk-inline-dl">
          <dt>病原菌</dt><dd>${escapeHtml(d.pathogen)}</dd>
          <dt>主な感染時期</dt><dd>${escapeHtml(d.mainSeason || "—")}</dd>
          <dt>感染適温</dt><dd>${escapeHtml(d.infectionTempC || "—")}</dd>
          <dt>濡れ時間</dt><dd>${escapeHtml(d.wetHours || "—")}</dd>
        </dl>
      </details>`
      )
      .join("");
  }

  function renderWeather(dashboard) {
    const cols = dashboard.weather5d;
    const headers = cols
      .map((c) => `<div class="apple-risk-weather-head">${escapeHtml(c.label)}</div>`)
      .join("");

    const row = (label, getter) =>
      `<div class="apple-risk-weather-row">
        <div class="label">${escapeHtml(label)}</div>
        ${cols.map((c) => `<div class="apple-risk-weather-cell">${getter(c)}</div>`).join("")}
      </div>`;

    return `<div class="apple-risk-weather-grid">
      <div class="apple-risk-weather-row">${'<div class="label"></div>'}${headers}</div>
      ${row("平均気温", (c) => `${c.avgTemp.toFixed(1)}℃`)}
      ${row("最高", (c) => `${c.maxTemp.toFixed(1)}℃`)}
      ${row("最低", (c) => `${c.minTemp.toFixed(1)}℃`)}
      ${row("降水量", (c) => `${c.precipMm.toFixed(1)}mm`)}
      ${row("湿度", (c) => `${Math.round(c.humidityPct)}%`)}
      ${row("葉面濡れ", (c) => `${c.leafWetHours.toFixed(1)}h`)}
    </div>
    <p class="apple-risk-wet-est" style="margin-top:8px">※ 葉面濡れ時間は気象予報からの<strong>推定値</strong>です（実測ではありません）。将来 NASA POWER / MET Norway 連携予定。</p>`;
  }

  function renderStatusBanner(dashboard) {
    if (dashboard.fetchError) {
      return `<p class="apple-risk-fetch-error" role="alert">気象データを取得できませんでした: ${escapeHtml(dashboard.fetchError)}（下記はデモ表示にフォールバック）</p>`;
    }
    if (dashboard.dataSource === "live") {
      return `<p class="apple-risk-fetch-ok">気象データ連携: ${escapeHtml(dashboard.dataSourceLabel)}</p>`;
    }
    return "";
  }

  function renderOnset(dashboard) {
    const cards = dashboard.onset
      .map((item) => {
        const confClass =
          item.confidence === "高"
            ? "risk-high"
            : item.confidence === "中"
              ? "risk-caution"
              : "risk-low";
        const isMarssoninaUnset =
          item.diseaseId === "apple:marssonina" &&
          item.marssoninaStatus === "bloom_date_unset";
        const isMarssoninaPending =
          item.diseaseId === "apple:marssonina" &&
          item.marssoninaStatus === "onset_pending_model";
        const isMarssoninaCandidate =
          item.diseaseId === "apple:marssonina" &&
          item.marssoninaStatus === "primary_infection_estimated";
        const isMarssoninaPartialRef =
          item.diseaseId === "apple:marssonina" &&
          item.marssoninaStatus === "partial_infection_reference";
        const isMarssoninaNoData =
          item.diseaseId === "apple:marssonina" &&
          (item.marssoninaStatus === "insufficient_weather" ||
            item.marssoninaStatus === "insufficient_weather_coverage");
        const primary = item.primaryInfection;
        const estimateTag =
          isMarssoninaUnset ||
          isMarssoninaPending ||
          isMarssoninaCandidate ||
          isMarssoninaPartialRef
            ? ""
            : item.isDemo
              ? '<span class="apple-risk-demo-badge">デモ表示</span> '
              : "";
        const statusBadge = isMarssoninaUnset
          ? '<span class="apple-risk-estimate-badge">未計算</span> '
          : isMarssoninaPending
            ? '<span class="apple-risk-estimate-badge">接続待ち</span> '
            : isMarssoninaCandidate
              ? '<span class="apple-risk-estimate-badge">一次感染候補（推定）</span> '
              : isMarssoninaPartialRef
                ? '<span class="apple-risk-estimate-badge">取得範囲内の感染候補（参考）</span> '
              : isMarssoninaNoData
                ? '<span class="apple-risk-estimate-badge">予測データ不足</span> '
                : item.marssoninaStatus === "no_infection_event"
                  ? '<span class="apple-risk-estimate-badge">候補なし</span> '
                  : "";
        const infectionLabel = isMarssoninaCandidate
          ? "一次感染候補日（推定）"
          : isMarssoninaPartialRef
            ? "取得範囲内の候補日（参考）"
            : "推定感染日";
        const wetDetail =
          primary &&
          `<dt>推定濡れ</dt><dd>${primary.wetDurationHours} h（${escapeHtml(primary.periodStart)}〜${escapeHtml(primary.periodEnd)}・平均 ${primary.wetAvgTempC}℃）</dd>`;
        const coverageDetail =
          item.marssoninaNasaWindow
            ? item.weatherCoverage === "partial"
              ? `<dt>気象探索</dt><dd>一部のみ・未探索期間あり（${escapeHtml(item.marssoninaNasaWindow.fetchStart)}〜${escapeHtml(item.marssoninaNasaWindow.fetchEnd)}・${item.marssoninaNasaWindow.hourlyCount} 件）</dd>`
              : `<dt>気象探索</dt><dd>${escapeHtml(item.marssoninaNasaWindow.fetchStart)}〜${escapeHtml(item.marssoninaNasaWindow.fetchEnd)}（${item.marssoninaNasaWindow.hourlyCount} 件・全期間）</dd>`
            : "";
        const gdd = item.marssoninaGdd;
        const gddDetail = gdd
          ? `<dt>基準 / 目安</dt><dd>${gdd.baseTempC}℃ / ${gdd.thresholdDayC} 日℃（猫塚 2023 参考・未検証）</dd>
            <dt>159日℃ 到達</dt><dd>${escapeHtml(gdd.thresholdStatusLabel)}</dd>
            <dt>実測積算期間</dt><dd>${escapeHtml(gdd.measuredPeriodStart)}〜${escapeHtml(gdd.measuredPeriodEnd)}（${gdd.measuredGddDayC} 日℃）</dd>
            <dt>予報積算期間</dt><dd>${
              gdd.forecastPeriodStart
                ? `${escapeHtml(gdd.forecastPeriodStart)}〜${escapeHtml(gdd.forecastPeriodEnd)}（+${gdd.forecastGddDayC} 日℃）`
                : "—"
            }</dd>
            <dt>欠測日数</dt><dd>${gdd.missingDailyCount} 日（0℃ 扱いなし）</dd>
            <dt>データ品質</dt><dd>${escapeHtml(gdd.dataQuality)}</dd>
            <dt>モデル信頼度</dt><dd>${escapeHtml(gdd.modelConfidence)}</dd>`
          : "";
        const confidenceRow =
          isMarssoninaUnset || isMarssoninaNoData
            ? ""
            : `<dt>表示上の確度</dt><dd><span class="apple-risk-pill ${confClass}" style="display:inline">${escapeHtml(item.confidence)}</span> <span class="apple-risk-wet-est">（感染危険度とは別指標）</span></dd>`;
        return `<article class="apple-risk-onset-card${
          isMarssoninaUnset ? " apple-risk-onset-card--unset" : ""
        }">
          <h3>${statusBadge}${estimateTag}${escapeHtml(item.diseaseName)}</h3>
          <dl class="apple-risk-onset-dl">
            <dt>${escapeHtml(infectionLabel)}</dt><dd>${escapeHtml(item.estimatedInfectionDate)}</dd>
            ${wetDetail || ""}
            ${coverageDetail}
            <dt>感染後積算</dt><dd>${
              item.gddSinceInfectionDayC != null
                ? `${item.gddSinceInfectionDayC} 日℃（実測・候補翌日起算）`
                : isMarssoninaPartialRef
                  ? "—（参考候補のため未計算）"
                  : "—"
            }</dd>
            ${gddDetail}
            <dt>発病時期（推定）</dt><dd>${escapeHtml(item.predictedOnsetWindow)}</dd>
            ${confidenceRow}
          </dl>
          <p class="apple-risk-wet-est">${escapeHtml(item.note)}</p>
        </article>`;
      })
      .join("");

    const highlightDays = new Set([8, 9, 10, 14, 15, 18]);
    const segs = Array.from({ length: dashboard.onsetTimelineDays }, (_, i) => {
      const day = i + 1;
      const has = highlightDays.has(day);
      return `<div class="apple-risk-timeline-seg${has ? " has-event" : ""}" title="${day}日目">${
        day % 5 === 0 ? day : ""
      }</div>`;
    }).join("");

    return `${cards}
    <div class="apple-risk-timeline">
      <strong>20日間の発病予測タイムライン（仮）</strong>
      <div class="apple-risk-timeline-bar" aria-hidden="true">${segs}</div>
      <p class="apple-risk-timeline-legend">黄色: 発病ウィンドウが重なる日（デモ表示）</p>
    </div>`;
  }

  function renderBloomStartField(dashboard) {
    if (dashboard.cropId !== "apple") return "";
    const value = dashboard.bloomStartApple || Model.loadBloomStartApple() || "";
    return `<div class="apple-risk-bloom-field">
      <label class="apple-risk-bloom-label" for="apple-risk-bloom-start">開花始期（一次感染推定の起点）</label>
      <input type="date" id="apple-risk-bloom-start" class="apple-risk-bloom-input" value="${escapeHtml(value)}">
      <p class="apple-risk-wet-est apple-risk-bloom-help">猫塚（2023）モデルは開花始期以降が対象です。生育ステージとは別に、実際の開花始めの日付を指定してください。</p>
    </div>`;
  }

  function renderStages(dashboard) {
    return dashboard.growthStages
      .map((stage) => {
        const current = stage.id === dashboard.growthStageId;
        return `<button type="button" class="apple-risk-stage${current ? " is-current" : ""}" data-stage-id="${stage.id}"${
          current ? ' aria-current="step"' : ""
        }>${escapeHtml(stage.label)}</button>`;
      })
      .join("");
  }

  function renderOnsetModelNote(disease) {
    const m = disease.onsetModel;
    if (!m) return "";
    if (m.type === "gdd") {
      return `<p class="model-note">発病モデル（${escapeHtml(m.type)}・${m.implemented ? "接続済" : "未接続"}）: 基準温度 ${m.baseTempC}℃ / 閾値 ${m.thresholdGddDayC}日℃ — ${escapeHtml(m.note)}</p>`;
    }
    if (m.type === "duthie") {
      return `<p class="model-note">発病モデル（Duthie・${m.implemented ? "接続済" : "未接続"}）— ${escapeHtml(m.note)}</p>`;
    }
    return `<p class="model-note">感染モデル（${escapeHtml(m.type)}・未接続）— ${escapeHtml(m.note || "")}</p>`;
  }

  function showDiseaseDetails(diseaseId, dashboard) {
    const detailsHost = getDetailsHost();
    const disease = dashboard.infectionByDisease.find((d) => d.id === diseaseId);
    if (!disease || !detailsHost) return;

    detailsHost.innerHTML = `<div class="apple-risk-details">
      <p class="apple-risk-demo-badge" style="display:inline-block;margin-bottom:8px">${escapeHtml(dashboard.dataSourceLabel)}</p>
      <h3>${escapeHtml(disease.name)}（${escapeHtml(disease.pathogen)}）</h3>
      <p>${escapeHtml(disease.summary)}</p>
      <dl class="apple-risk-inline-dl">
        <dt>主な感染時期</dt><dd>${escapeHtml(disease.mainSeason || "—")}</dd>
        <dt>感染に適した気温</dt><dd>${escapeHtml(disease.infectionTempC || "—")}</dd>
        <dt>必要な濡れ時間</dt><dd>${escapeHtml(disease.wetHours || "—")}</dd>
      </dl>
      <p><strong>主な感染条件</strong></p>
      <ul>${disease.infectionFactors.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
      ${renderOnsetModelNote(disease)}
      <p><strong>予測結果の根拠</strong></p>
      <p class="apple-risk-rationale">${escapeHtml(disease.rationale)}</p>
      <p class="apple-risk-wet-est">品種「${escapeHtml(dashboard.variety)}」の抵抗性は将来の予測に反映予定（現状はデモ固定）。</p>
    </div>`;
    detailsHost.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function render(dashboard) {
    const loc = dashboard.location;
    const stage =
      dashboard.growthStages.find((s) => s.id === dashboard.growthStageId)?.label ||
      "—";
    root.innerHTML = `
      <header class="apple-risk-header">
        <h1>りんご・日本なし病害リスク予報</h1>
        <p class="apple-risk-subtitle">気象データから感染リスクと発病時期を予測</p>
        ${renderStatusBanner(dashboard)}
        ${renderCropTabs(dashboard)}
        <div class="apple-risk-meta">
          <span><strong>対象:</strong> ${escapeHtml(dashboard.cropLabel)}</span>
          ${renderVarietySelect(dashboard)}
          <span><strong>地点:</strong> ${escapeHtml(loc.label || `${loc.prefecture} ${loc.municipality}`)}</span>
          <span class="apple-risk-stage-emphasis"><strong>現在の生育ステージ:</strong> ${escapeHtml(stage)}</span>
          <span><strong>更新:</strong> ${escapeHtml(dashboard.updatedAt)}（JST）</span>
          <span class="apple-risk-demo-badge">${escapeHtml(dashboard.dataSourceLabel)}</span>
        </div>
        <div class="apple-risk-header-stages" aria-labelledby="stage-heading">
          <h2 id="stage-heading" class="apple-risk-header-stages-title">生育ステージ</h2>
          <p class="apple-risk-section-lead apple-risk-header-stages-lead">感染しやすい病害はステージによって異なります。${escapeHtml(dashboard.cropLabel)}ごとに保存されます（将来は気温から自動推定）。</p>
          <div class="apple-risk-stages" id="apple-risk-stages">${renderStages(dashboard)}</div>
          <div class="apple-risk-header-actions">
            <button type="button" class="apple-risk-btn" id="apple-risk-location-btn-inline">地点を変更</button>
          </div>
          ${renderBloomStartField(dashboard)}
        </div>
      </header>

      <section class="apple-risk-section" aria-labelledby="infection-heading">
        <h2 id="infection-heading">感染危険予報（今後5日）</h2>
        <p class="apple-risk-section-lead">これから病原菌に感染する危険性の目安です。色と「低・注意・高」の文字で表示します（${escapeHtml(dashboard.cropLabel)}の5病害）。</p>
        <div class="apple-risk-cards">
          ${renderOverallCard("本日", dashboard.overall.today)}
          ${renderOverallCard("3日先", dashboard.overall.day3)}
          ${renderOverallCard("5日先", dashboard.overall.day5)}
        </div>
        ${renderInfectionTable(dashboard)}
        <div id="apple-risk-disease-details" style="margin-top:12px"></div>
      </section>

      <section class="apple-risk-section" aria-labelledby="onset-heading">
        <h2 id="onset-heading">発病予測（今後20日）</h2>
        <p class="apple-risk-section-lead">すでに感染した可能性がある病原について、発病が予想される時期の目安です（仮データ）。</p>
        <div class="apple-risk-onset-list">${renderOnset(dashboard)}</div>
      </section>

      <section class="apple-risk-section" aria-labelledby="weather-heading">
        <h2 id="weather-heading">気象情報（6日間）</h2>
        <p class="apple-risk-section-lead">MET Norway 時間別予報を日次集計（本日〜5日先）。葉面濡れは推定です。</p>
        ${renderWeather(dashboard)}
      </section>

      <section class="apple-risk-section" aria-labelledby="rationale-heading">
        <h2 id="rationale-heading">予測根拠と病害解説</h2>
        <p class="apple-risk-section-lead">${escapeHtml(dashboard.cropLabel)}向けの病害ごとの解説です。同じ病害名でも果樹ごとに内容が異なります。</p>
        ${renderRationales(dashboard)}
      </section>
    `;

    document
      .getElementById("apple-risk-location-btn-inline")
      ?.addEventListener("click", openLocationModal);

    const varietySelect = document.getElementById("apple-risk-variety-select");
    varietySelect?.addEventListener("change", () => {
      Model.saveVariety(dashboard.cropId, varietySelect.value);
      refreshDashboard(dashboard.cropId);
    });

    root.querySelectorAll(".disease-link").forEach((btn) => {
      btn.addEventListener("click", () =>
        showDiseaseDetails(btn.getAttribute("data-disease-id"), dashboard)
      );
    });

    root.querySelectorAll(".apple-risk-stage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-stage-id");
        Model.saveGrowthStageId(dashboard.cropId, id);
        refreshDashboard(dashboard.cropId);
      });
    });

    const bloomInput = document.getElementById("apple-risk-bloom-start");
    bloomInput?.addEventListener("change", () => {
      Model.saveBloomStartApple(bloomInput.value);
      refreshDashboard(dashboard.cropId);
    });
  }

  let refreshSeq = 0;

  async function refreshDashboard(cropId = Model.loadCropId()) {
    const seq = ++refreshSeq;
    root.setAttribute("aria-busy", "true");
    root.innerHTML =
      '<p class="apple-risk-loading">気象データを読み込み中…（MET Norway / NASA POWER）</p>';
    const dashboard = await Model.buildDashboardLive(cropId);
    if (seq !== refreshSeq) return;
    root.removeAttribute("aria-busy");
    render(dashboard);
  }

  root.addEventListener("click", (e) => {
    const cropBtn = e.target.closest("[data-crop-switch]");
    if (!cropBtn) return;
    const cropId = cropBtn.getAttribute("data-crop-switch");
    Model.saveCropId(cropId);
    refreshDashboard(cropId);
  });

  function openLocationModal() {
    const loc = Model.loadLocation();
    document.getElementById("loc-prefecture").value = loc.prefecture;
    document.getElementById("loc-municipality").value = loc.municipality;
    document.getElementById("loc-lat").value = loc.lat || "";
    document.getElementById("loc-lon").value = loc.lon || "";
    modal.classList.remove("hidden");
  }

  function closeLocationModal() {
    modal.classList.add("hidden");
  }

  function saveLocationFromModal() {
    const prefecture = document.getElementById("loc-prefecture").value.trim();
    const municipality = document.getElementById("loc-municipality").value.trim();
    const lat = document.getElementById("loc-lat").value.trim();
    const lon = document.getElementById("loc-lon").value.trim();
    if (!prefecture && !municipality) {
      alert("都道府県または市町村を入力してください。");
      return;
    }
    Model.saveLocation({
      prefecture,
      municipality,
      lat,
      lon,
      source: "user",
    });
    closeLocationModal();
    refreshDashboard(Model.loadCropId());
  }

  const portalLoc = Model.tryLoadPortalLocation();
  if (portalLoc && Model.loadLocation().source === "demo") {
    Model.saveLocation(portalLoc);
  }

  if (stageSelect) {
    const cropId = Model.loadCropId();
    Model.GROWTH_STAGES.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
      if (s.id === Model.loadGrowthStageId(cropId)) opt.selected = true;
      stageSelect.appendChild(opt);
    });
    stageSelect.addEventListener("change", () => {
      Model.saveGrowthStageId(cropId, stageSelect.value);
      refreshDashboard(cropId);
    });
  }

  modalBackdrop?.addEventListener("click", closeLocationModal);
  modalCancel?.addEventListener("click", closeLocationModal);
  modalSave?.addEventListener("click", saveLocationFromModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLocationModal();
  });

  refreshDashboard();
});
