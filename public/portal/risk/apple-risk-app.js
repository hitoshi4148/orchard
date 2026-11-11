document.addEventListener("DOMContentLoaded", () => {
  const Model = typeof OrchardRiskModel !== "undefined" ? OrchardRiskModel : AppleRiskModel;
  const root = document.getElementById("apple-risk-root");
  const modal = document.getElementById("apple-risk-settings-modal");
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

    const marssoninaGddRow =
      dashboard.cropId === "apple" &&
      cols.some((c) => typeof c.marssoninaGddDayC === "number")
        ? row("褐斑GDD", (c) =>
            typeof c.marssoninaGddDayC === "number"
              ? `${Math.round(c.marssoninaGddDayC)}日℃`
              : "—"
          )
        : "";

    return `<div class="apple-risk-weather-grid">
      <div class="apple-risk-weather-row">${'<div class="label"></div>'}${headers}</div>
      ${row("平均気温", (c) => `${c.avgTemp.toFixed(1)}℃`)}
      ${row("最高", (c) => `${c.maxTemp.toFixed(1)}℃`)}
      ${row("最低", (c) => `${c.minTemp.toFixed(1)}℃`)}
      ${row("降水量", (c) => `${c.precipMm.toFixed(1)}mm`)}
      ${row("湿度", (c) => `${Math.round(c.humidityPct)}%`)}
      ${row("葉面濡れ", (c) => `${c.leafWetHours.toFixed(1)}h`)}
      ${marssoninaGddRow}
    </div>
    <p class="apple-risk-wet-est" style="margin-top:8px">※ 葉面濡れ時間は MET Norway 予報と履歴からの<strong>推定値</strong>です（実測ではありません）。</p>`;
  }

  function onsetLeadText(dashboard) {
    if (dashboard.fetchError) {
      return "気象未取得のため下記はデモ表示です。";
    }
    if (dashboard.dataSource === "live") {
      return "感染モデル（Mills・Ishii・褐斑 P2/P3 ほか）から推定した発病・感染の目安です。簡易病害は参考表示です。";
    }
    return "すでに感染した可能性がある病原について、発病が予想される時期の目安です（デモ）。";
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
              ? '<span class="apple-risk-estimate-badge">一次感染開始日（推定）</span> '
              : isMarssoninaPartialRef
                ? '<span class="apple-risk-estimate-badge">取得範囲内の感染候補（参考）</span> '
              : isMarssoninaNoData
                ? '<span class="apple-risk-estimate-badge">予測データ不足</span> '
                : item.marssoninaStatus === "no_infection_event"
                  ? '<span class="apple-risk-estimate-badge">候補なし</span> '
                  : "";
        const infectionLabel = isMarssoninaCandidate
          ? "一次感染開始日（推定）"
          : isMarssoninaPartialRef
            ? "取得範囲内の候補日（参考）"
            : "推定感染日";
        const wetRuleNote =
          primary?.wetnessRule === "precip_0.5mm_suzuki_phase2"
            ? "・降水後2h／20時以降は翌7時までの簡易延長（二次文献ベース・未検証含む）"
            : "";
        const wetDetail =
          primary &&
          `<dt>降水日・濡れ</dt><dd>時別≥0.5mm ${primary.precipWetHourCount ?? primary.wetDurationHours} h／合計濡れ ${primary.wetDurationHours} h（${escapeHtml(primary.periodStart)}〜${escapeHtml(primary.periodEnd)}・平均 ${primary.wetAvgTempC}℃・NASA POWER 格子${wetRuleNote}）</dd>`;
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
        const pool = dashboard.ascosporePool;
        const poolCarryNote =
          pool?.dailyCarryInApplied && pool.hourlyWindowStart
            ? `<span class="apple-risk-wet-est">（${escapeHtml(pool.hourlyWindowStart)}〜の時別＋それ以前は日次近似で繰越）</span>`
            : pool?.offSeasonDepletedShortcut
              ? `<span class="apple-risk-wet-est">（期外・枯渇済み近似）</span>`
              : "";
        const ascosporePoolRow =
          item.diseaseId === "apple:scab" && pool
            ? `<dt>升孢子枯渇プール</dt><dd>残 ${pool.remainingPercent}%（初期 ${pool.initialPoolPercent}%・累積放出 ${pool.cumulativeReleasedPercent}%・降雨 ${pool.rainEventsProcessed} 回・基準日 ${escapeHtml(pool.date)}）${poolCarryNote}</dd>`
            : "";
        return `<article class="apple-risk-onset-card${
          isMarssoninaUnset ? " apple-risk-onset-card--unset" : ""
        }">
          <h3>${statusBadge}${estimateTag}${escapeHtml(item.diseaseName)}</h3>
          <dl class="apple-risk-onset-dl">
            <dt>${escapeHtml(infectionLabel)}</dt><dd>${escapeHtml(item.estimatedInfectionDate)}</dd>
            ${wetDetail || ""}
            ${coverageDetail}
            ${ascosporePoolRow}
            <dt>感染後積算</dt><dd>${
              item.gddSinceInfectionDayC != null
                ? `${item.gddSinceInfectionDayC} 日℃（実測・一次感染開始日起算・当日含む）`
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

  function renderGymnosporangiumHostField(dashboard) {
    if (dashboard.cropId !== "nashi") return "";
    const host = dashboard.gymnosporangiumHostNearby;
    const unknownChecked = host !== true && host !== false;
    const yesChecked = host === true;
    const noChecked = host === false;
    return `<div class="apple-risk-phenology-fields">
      <fieldset class="apple-risk-bloom-field apple-risk-host-fieldset">
        <legend class="apple-risk-bloom-label">赤星病 — 中間宿主（ビャクシン類）</legend>
        <div class="apple-risk-host-options" role="radiogroup" aria-label="ビャクシン類の有無">
          <label class="apple-risk-host-option">
            <input type="radio" name="apple-risk-gymno-host" value="" ${unknownChecked ? "checked" : ""}>
            未設定（気象のみ）
          </label>
          <label class="apple-risk-host-option">
            <input type="radio" name="apple-risk-gymno-host" value="1" ${yesChecked ? "checked" : ""}>
            あり（圃場おおよそ 1–2km 以内）
          </label>
          <label class="apple-risk-host-option">
            <input type="radio" name="apple-risk-gymno-host" value="0" ${noChecked ? "checked" : ""}>
            なし
          </label>
        </div>
        <p class="apple-risk-wet-est apple-risk-bloom-help">Gymnosporangium はビャクシン上で小生子が発生します。「なし」のとき赤星リスクは 4% に抑制表示します。</p>
      </fieldset>
    </div>`;
  }

  function renderScabInoculumField(dashboard) {
    if (dashboard.cropId !== "apple") return "";
    const level = dashboard.scabInoculumApple || Model.loadScabInoculumApple();
    return `<fieldset class="apple-risk-bloom-field apple-risk-host-fieldset">
        <legend class="apple-risk-bloom-label">黒星病 — 圃場残病葉（升孢子プール初期）</legend>
        <div class="apple-risk-host-options" role="radiogroup" aria-label="残病葉量">
          <label class="apple-risk-host-option">
            <input type="radio" name="apple-risk-scab-inoculum" value="low" ${level === "low" ? "checked" : ""}>
            少ない（落下葉処理良好・60%）
          </label>
          <label class="apple-risk-host-option">
            <input type="radio" name="apple-risk-scab-inoculum" value="normal" ${level === "normal" ? "checked" : ""}>
            標準（100%）
          </label>
          <label class="apple-risk-host-option">
            <input type="radio" name="apple-risk-scab-inoculum" value="high" ${level === "high" ? "checked" : ""}>
            多い（前作事象あり・130%）
          </label>
        </div>
        <p class="apple-risk-wet-est apple-risk-bloom-help">シーズン枯渇プールの初期値を変えます。簡易設定であり、樹冠残病率の詳細モデルではありません。</p>
      </fieldset>`;
  }

  function renderBloomStartField(dashboard) {
    if (dashboard.cropId !== "apple") return "";
    const bloom = dashboard.bloomStartApple || Model.loadBloomStartApple() || "";
    const greenTip =
      dashboard.greenTipApple || Model.loadGreenTipApple() || "";
    return `<div class="apple-risk-phenology-fields">
      <div class="apple-risk-bloom-field">
        <label class="apple-risk-bloom-label" for="apple-risk-green-tip">緑期日（黒星・升孢子 GDD 起点）</label>
        <input type="date" id="apple-risk-green-tip" class="apple-risk-bloom-input" value="${escapeHtml(greenTip)}">
        <p class="apple-risk-wet-est apple-risk-bloom-help">Green tip（緑期）が確認された日＝升孢子 GDD の積算起算日です。Cookie <code>agromap_apple_green_tip_date</code> を未入力時に取り込みます（TOP の GDD 設定とは別）。群馬地点で未入力なら目安 3/25。</p>
      </div>
      ${renderScabInoculumField(dashboard)}
      <div class="apple-risk-bloom-field">
        <label class="apple-risk-bloom-label" for="apple-risk-bloom-start">開花始期（褐斑一次感染の起点）</label>
        <input type="date" id="apple-risk-bloom-start" class="apple-risk-bloom-input" value="${escapeHtml(bloom)}">
        <p class="apple-risk-wet-est apple-risk-bloom-help">猫塚（2023）褐斑モデル用。群馬のふじは例年4月下旬（4/20〜25）。未入力で群馬地点のときは 4/22 を自動セットします。</p>
      </div>
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
    if (m.type === "gymnosporangium") {
      return `<p class="model-note">感染モデル（${escapeHtml(m.type)}・${m.implemented ? "接続済" : "未接続"}）— ${escapeHtml(m.note)}</p>`;
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
    const cultivationLabel = Model.pomeCultivationLabel(dashboard.cultivationId);
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
          <span><strong>栽培方式:</strong> ${escapeHtml(cultivationLabel)}</span>
          <span class="apple-risk-stage-emphasis"><strong>現在の生育ステージ:</strong> ${escapeHtml(stage)}</span>
          <span><strong>更新:</strong> ${escapeHtml(dashboard.updatedAt)}（JST）</span>
          <span class="apple-risk-demo-badge">${escapeHtml(dashboard.dataSourceLabel)}</span>
          <button type="button" class="apple-risk-btn" id="apple-risk-settings-btn">⚙ 設定</button>
        </div>
        <div class="apple-risk-header-stages" aria-labelledby="stage-heading">
          <h2 id="stage-heading" class="apple-risk-header-stages-title">生育ステージ</h2>
          <p class="apple-risk-section-lead apple-risk-header-stages-lead">感染しやすい病害はステージによって異なります。${escapeHtml(dashboard.cropLabel)}ごとに保存されます（将来は気温から自動推定）。</p>
          <div class="apple-risk-stages" id="apple-risk-stages">${renderStages(dashboard)}</div>
          ${renderBloomStartField(dashboard)}
          ${renderGymnosporangiumHostField(dashboard)}
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
        <p class="apple-risk-section-lead">${escapeHtml(onsetLeadText(dashboard))}</p>
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
      .getElementById("apple-risk-settings-btn")
      ?.addEventListener("click", openSettingsModal);

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
    const greenTipInput = document.getElementById("apple-risk-green-tip");
    greenTipInput?.addEventListener("change", () => {
      Model.saveGreenTipApple(greenTipInput.value);
      refreshDashboard(dashboard.cropId);
    });
    root.querySelectorAll('input[name="apple-risk-gymno-host"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        const v = input.value;
        if (v === "1") Model.saveGymnosporangiumHostNashi(true);
        else if (v === "0") Model.saveGymnosporangiumHostNashi(false);
        else Model.saveGymnosporangiumHostNashi(null);
        refreshDashboard(dashboard.cropId);
      });
    });
    root.querySelectorAll('input[name="apple-risk-scab-inoculum"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        Model.saveScabInoculumApple(input.value);
        refreshDashboard(dashboard.cropId);
      });
    });
  }

  let refreshSeq = 0;

  async function refreshDashboard(cropId = Model.loadCropId()) {
    const seq = ++refreshSeq;
    root.setAttribute("aria-busy", "true");
    root.innerHTML =
      '<p class="apple-risk-loading">気象データを読み込み中…（MET Norway / NASA POWER）</p>';
    const dashboard = await Model.buildDashboardLive(cropId, (partial) => {
      if (seq !== refreshSeq) return;
      render(partial);
    });
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

  function fillSelectOptions(selectEl, options, selected) {
    if (!selectEl) return;
    selectEl.innerHTML = options
      .map(
        (v) =>
          `<option value="${escapeHtml(v)}"${v === selected ? " selected" : ""}>${escapeHtml(v)}</option>`
      )
      .join("");
  }

  function fillCultivationRadios(selectedId) {
    const host = document.getElementById("pome-cultivation-radios");
    if (!host || !Array.isArray(Model.POME_CULTIVATION)) return;
    host.innerHTML = Model.POME_CULTIVATION.map(
      (opt) =>
        `<label class="apple-risk-cultivation-option"><input type="radio" name="pomeCultivation" value="${escapeHtml(opt.id)}"${opt.id === selectedId ? " checked" : ""}><span>${escapeHtml(opt.label)}</span></label>`
    ).join("");
  }

  function fillGunmaLocationPresets() {
    const host = document.getElementById("pome-gunma-presets");
    if (!host || !Array.isArray(Model.GUNMA_LOCATION_PRESETS)) return;
    host.innerHTML = Model.GUNMA_LOCATION_PRESETS.map(
      (p) =>
        `<button type="button" class="apple-risk-btn" data-gunma-preset="${escapeHtml(p.id)}" data-lat="${p.lat}" data-lon="${p.lon}">${escapeHtml(p.label)}</button>`
    ).join("");
    host.querySelectorAll("[data-gunma-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("pome-lat").value = btn.getAttribute("data-lat") || "";
        document.getElementById("pome-lon").value = btn.getAttribute("data-lon") || "";
      });
    });
  }

  function openSettingsModal() {
    const loc =
      typeof OrchardLocationCookie !== "undefined"
        ? OrchardLocationCookie.load()
        : { lat: "", lon: "" };
    const pome = Model.loadPomeSettings();
    document.getElementById("pome-lat").value = loc.lat || "";
    document.getElementById("pome-lon").value = loc.lon || "";
    fillGunmaLocationPresets();
    fillSelectOptions(
      document.getElementById("pome-apple-variety"),
      Model.POME_APPLE_VARIETIES,
      pome.appleVariety
    );
    fillSelectOptions(
      document.getElementById("pome-nashi-variety"),
      Model.POME_NASHI_VARIETIES,
      pome.nashiVariety
    );
    fillCultivationRadios(pome.cultivationId);
    modal?.classList.remove("hidden");
  }

  function closeSettingsModal() {
    modal?.classList.add("hidden");
  }

  async function fetchLocationName(lat, lon) {
    const res = await fetch(
      `/portal/api/geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    );
    const json = await res.json();
    if (!json.success) {
      return "";
    }
    return json.name || "";
  }

  async function saveSettingsFromModal() {
    const lat = document.getElementById("pome-lat").value.trim();
    const lon = document.getElementById("pome-lon").value.trim();
    if (!lat || !lon) {
      alert("緯度と経度を入力してください。");
      return;
    }
    let locationName = "";
    try {
      locationName = await fetchLocationName(lat, lon);
    } catch {
      locationName = "";
    }
    Model.saveSharedLocation(lat, lon, locationName);
    const appleVariety = document.getElementById("pome-apple-variety").value;
    const nashiVariety = document.getElementById("pome-nashi-variety").value;
    const cultivationId =
      document.querySelector('input[name="pomeCultivation"]:checked')?.value ||
      Model.POME_CULTIVATION[0]?.id ||
      "open";
    Model.savePomeSettings({ appleVariety, nashiVariety, cultivationId });
    closeSettingsModal();
    refreshDashboard(Model.loadCropId());
  }

  const portalLoc = Model.tryLoadPortalLocation();
  if (portalLoc && Model.loadLocation().source === "demo") {
    Model.saveSharedLocation(portalLoc.lat, portalLoc.lon, portalLoc.label);
  }

  document.getElementById("pome-get-location")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("このブラウザは位置情報に対応していません。");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      document.getElementById("pome-lat").value = pos.coords.latitude.toFixed(4);
      document.getElementById("pome-lon").value = pos.coords.longitude.toFixed(4);
    });
  });

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

  modalBackdrop?.addEventListener("click", closeSettingsModal);
  modalCancel?.addEventListener("click", closeSettingsModal);
  modalSave?.addEventListener("click", () => {
    saveSettingsFromModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettingsModal();
  });

  refreshDashboard();
});
