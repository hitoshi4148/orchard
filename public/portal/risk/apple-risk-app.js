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

  function displayText(text) {
    return typeof OrchardTermGlossary !== "undefined"
      ? OrchardTermGlossary.enrich(text ?? "")
      : escapeHtml(text);
  }

  /** `change` は月選択・↑↓でも発火するため、blur / Enter 時だけ保存する */
  function bindNativeDateInputCommit(input, onCommit) {
    if (!input) return;
    let baseline = input.value;
    input.addEventListener("focus", () => {
      baseline = input.value;
    });
    const tryCommit = () => {
      const next = input.value ?? "";
      if (next === baseline) return;
      baseline = next;
      onCommit(next);
    };
    input.addEventListener("blur", tryCommit);
    input.addEventListener("change", () => {
      window.setTimeout(() => {
        if (document.activeElement !== input) {
          tryCommit();
        }
      }, 0);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        tryCommit();
      }
    });
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
      <div class="card-day">${displayText(dayLabel)}</div>
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
          }" data-crop-switch="${c.id}" aria-selected="${selected}">${displayText(c.label)}</button>`;
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
          }>${displayText(v)}</option>`
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
        <td><button type="button" class="disease-link" data-disease-id="${disease.id}">${displayText(disease.name)}</button></td>
        ${cells}
      </tr>`;
    }
    const headerCells = dayLabels.map((l) => `<th>${displayText(l)}</th>`).join("");
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
        <summary class="apple-risk-rationale-summary">${displayText(d.name)} — 詳しい説明（開く）</summary>
        <p class="apple-risk-details-point apple-risk-rationale-lead">${displayText(d.watchPoint || d.summary)}</p>
        <dl class="apple-risk-inline-dl apple-risk-fine-print">
          <dt>病原菌</dt><dd>${displayText(d.pathogen)}</dd>
          <dt>主な感染時期</dt><dd>${displayText(d.mainSeason || "—")}</dd>
          <dt>感染適温</dt><dd>${displayText(d.infectionTempC || "—")}</dd>
          <dt>濡れ時間</dt><dd>${displayText(d.wetHours || "—")}</dd>
        </dl>
        <p class="apple-risk-fine-print apple-risk-rationale">${displayText(d.rationale)}</p>
        <p class="apple-risk-fine-print">${displayText(d.summary)}</p>
      </details>`
      )
      .join("");
  }

  function renderWeather(dashboard) {
    const cols = dashboard.weather5d;
    const headers = cols
      .map((c) => `<div class="apple-risk-weather-head">${displayText(c.label)}</div>`)
      .join("");

    const row = (label, getter) =>
      `<div class="apple-risk-weather-row">
        <div class="label">${displayText(label)}</div>
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
    <p class="apple-risk-wet-est" style="margin-top:8px">${displayText("※ 葉面濡れ時間は MET Norway 予報と履歴からの推定値です（実測ではありません）。")}</p>`;
  }

  function onsetLeadText(dashboard) {
    if (dashboard.fetchError) {
      return "いまは気象データが取れないため、下の発病目安は参考表示です。";
    }
    if (dashboard.dataSource === "live") {
      return "すでに感染したあとの「発病しそうな時期」の目安です。詳しい計算式は各カード下の小さな文字を参照してください。";
    }
    return "発病時期の参考表示です（気象とつながっていません）。";
  }

  function renderStatusBanner(dashboard) {
    if (dashboard.liveFetchInProgress && !dashboard.fetchError) {
      return `<p class="apple-risk-fetch-warn" role="status">気象データを更新しています…（下記は直前の表示または参考例です）</p>`;
    }
    if (dashboard.fetchError) {
      return `<p class="apple-risk-fetch-error" role="alert">気象データを取得できませんでした: ${escapeHtml(dashboard.fetchError)}（下記はデモ表示にフォールバック）</p>`;
    }
    let banner = "";
    if (dashboard.dataSource === "live") {
      banner = `<p class="apple-risk-fetch-ok">気象データ連携: ${displayText(dashboard.dataSourceLabel)}</p>`;
    }
    if (dashboard.marssoninaDetailPending && dashboard.marssoninaDetailError) {
      banner += `<p class="apple-risk-fetch-warn" role="status">褐斑の一次感染・GDD 詳細は取得できませんでした（${escapeHtml(dashboard.marssoninaDetailError)}）。6日表とその他病害は気象連携の表示です。</p>`;
    }
    return banner;
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
              : `<dt>気象探索</dt><dd>${displayText(item.marssoninaNasaWindow.fetchStart)}〜${escapeHtml(item.marssoninaNasaWindow.fetchEnd)}（${item.marssoninaNasaWindow.hourlyCount} 件・全期間）</dd>`
            : "";
        const gdd = item.marssoninaGdd;
        const gddDetail = gdd
          ? `<dt>基準 / 目安</dt><dd>${gdd.baseTempC}℃ / ${gdd.thresholdDayC} 日℃（猫塚 2023 参考・未検証）</dd>
            <dt>159日℃ 到達</dt><dd>${displayText(gdd.thresholdStatusLabel)}</dd>
            <dt>実測積算期間</dt><dd>${displayText(gdd.measuredPeriodStart)}〜${escapeHtml(gdd.measuredPeriodEnd)}（${gdd.measuredGddDayC} 日℃）</dd>
            <dt>予報積算期間</dt><dd>${
              gdd.forecastPeriodStart
                ? `${escapeHtml(gdd.forecastPeriodStart)}〜${escapeHtml(gdd.forecastPeriodEnd)}（+${gdd.forecastGddDayC} 日℃）`
                : "—"
            }</dd>
            <dt>欠測日数</dt><dd>${gdd.missingDailyCount} 日（0℃ 扱いなし）</dd>
            <dt>データ品質</dt><dd>${displayText(gdd.dataQuality)}</dd>
            <dt>モデル信頼度</dt><dd>${displayText(gdd.modelConfidence)}</dd>`
          : "";
        const confidenceRow =
          isMarssoninaUnset || isMarssoninaNoData
            ? ""
            : `<dt>表示上の確度</dt><dd><span class="apple-risk-pill ${confClass}" style="display:inline">${displayText(item.confidence)}</span> <span class="apple-risk-wet-est">（感染危険度とは別指標）</span></dd>`;
        const pool = dashboard.ascosporePool;
        const poolCarryNote =
          pool?.dailyCarryInApplied && pool.hourlyWindowStart
            ? `<span class="apple-risk-wet-est">（${escapeHtml(pool.hourlyWindowStart)}〜の時別＋それ以前は日次近似で繰越）</span>`
            : pool?.offSeasonDepletedShortcut
              ? `<span class="apple-risk-wet-est">（期外・枯渇済み近似）</span>`
              : "";
        const ascosporePoolRow =
          item.diseaseId === "apple:scab" && pool
            ? `<dt>${displayText("子囊孢子枯渇プール")}</dt><dd>残 ${pool.remainingPercent}%（初期 ${pool.initialPoolPercent}%・累積放出 ${pool.cumulativeReleasedPercent}%・降雨 ${pool.rainEventsProcessed} 回・基準日 ${escapeHtml(pool.date)}）${poolCarryNote}</dd>`
            : "";
        return `<article class="apple-risk-onset-card${
          isMarssoninaUnset ? " apple-risk-onset-card--unset" : ""
        }">
          <h3 class="apple-risk-onset-title">${statusBadge}${estimateTag}${displayText(item.diseaseName)}</h3>
          <dl class="apple-risk-onset-dl">
            <dt>${displayText(infectionLabel)}</dt><dd class="apple-risk-onset-value">${displayText(item.estimatedInfectionDate)}</dd>
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
            <dt>発病時期（推定）</dt><dd class="apple-risk-onset-value">${displayText(item.predictedOnsetWindow)}</dd>
            ${confidenceRow}
          </dl>
          <p class="apple-risk-fine-print apple-risk-onset-note">${displayText(item.note)}</p>
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

    if (dashboard.dataSource === "live") {
      return cards;
    }
    return `${cards}
    <div class="apple-risk-timeline">
      <strong>20日間の発病予測タイムライン（表示例）</strong>
      <div class="apple-risk-timeline-bar" aria-hidden="true">${segs}</div>
      <p class="apple-risk-timeline-legend">黄色: 発病ウィンドウが重なる日（気象未連携時の表示例）</p>
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
        <p class="apple-risk-fine-print apple-risk-bloom-help">「なし」を選ぶと、赤星のリスク表示を抑えます（周辺にビャクシンがない想定）。</p>
      </fieldset>
    </div>`;
  }

  function renderScabInoculumField(dashboard) {
    if (dashboard.cropId !== "apple") return "";
    const level = dashboard.scabInoculumApple || Model.loadScabInoculumApple();
    return `<fieldset class="apple-risk-bloom-field apple-risk-host-fieldset">
        <legend class="apple-risk-bloom-label">${displayText("黒星病 — 圃場残病葉（子囊孢子プール初期）")}</legend>
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
        <p class="apple-risk-fine-print apple-risk-bloom-help">前作の残り病葉の多さの目安です（詳細な残病率の計測ではありません）。</p>
      </fieldset>`;
  }

  function renderBloomStartField(dashboard) {
    if (dashboard.cropId !== "apple") return "";
    const bloom = dashboard.bloomStartApple || Model.loadBloomStartApple() || "";
    const greenTip =
      dashboard.greenTipApple || Model.loadGreenTipApple() || "";
    return `<div class="apple-risk-phenology-fields">
      <div class="apple-risk-bloom-field">
        <label class="apple-risk-bloom-label" for="apple-risk-green-tip">${displayText("緑期日（黒星・子囊孢子 GDD 起点）")}</label>
        <div class="apple-risk-bloom-row">
          <input type="date" id="apple-risk-green-tip" class="apple-risk-bloom-input" value="${escapeHtml(greenTip)}">
          <button type="button" class="apple-risk-bloom-clear-btn" id="apple-risk-green-tip-clear">クリア</button>
        </div>
        <p class="apple-risk-fine-print apple-risk-bloom-help">芽が緑色に見え始めた日を入れてください（黒星の予測に使います）。空のままにしたら自動では入れません。</p>
      </div>
      ${renderScabInoculumField(dashboard)}
      <div class="apple-risk-bloom-field">
        <label class="apple-risk-bloom-label" for="apple-risk-bloom-start">開花始期（褐斑一次感染の起点）</label>
        <div class="apple-risk-bloom-row">
          <input type="date" id="apple-risk-bloom-start" class="apple-risk-bloom-input" value="${escapeHtml(bloom)}">
          <button type="button" class="apple-risk-bloom-clear-btn" id="apple-risk-bloom-clear">クリア</button>
        </div>
        <p class="apple-risk-fine-print apple-risk-bloom-help">花が開き始めた日を入れてください（褐斑の詳しい予測に使います）。群馬では例年4月下旬が目安です。</p>
      </div>
      <p class="apple-risk-fine-print apple-risk-bloom-help">日付は選び終えてカレンダーを閉じるか Enter で反映されます（月や日の↑↓の途中ではまだ保存しません）。</p>
    </div>`;
  }

  function renderStages(dashboard) {
    return dashboard.growthStages
      .map((stage) => {
        const current = stage.id === dashboard.growthStageId;
        return `<button type="button" class="apple-risk-stage${current ? " is-current" : ""}" data-stage-id="${stage.id}"${
          current ? ' aria-current="step"' : ""
        }>${displayText(stage.label)}</button>`;
      })
      .join("");
  }

  function renderOnsetModelNote(disease) {
    const m = disease.onsetModel;
    if (!m) return "";
    if (m.type === "gdd") {
      return `<p class="apple-risk-fine-print model-note">【技術メモ】発病モデル（GDD・${m.implemented ? "接続済" : "未接続"}）基準 ${m.baseTempC}℃／閾値 ${m.thresholdGddDayC} 日℃ — ${displayText(m.note)}</p>`;
    }
    if (m.type === "duthie") {
      return `<p class="apple-risk-fine-print model-note">【技術メモ】Duthie モデル（${m.implemented ? "接続済" : "未接続"}）— ${displayText(m.note)}</p>`;
    }
    if (m.type === "gymnosporangium") {
      return `<p class="apple-risk-fine-print model-note">【技術メモ】赤星・宿主モデル（${m.implemented ? "接続済" : "未接続"}）— ${displayText(m.note)}</p>`;
    }
    if (m.type === "seasonal") {
      return `<p class="apple-risk-fine-print model-note">【技術メモ】季節×気象（${m.implemented ? "接続済" : "簡易"}）— ${displayText(m.note || "")}</p>`;
    }
    return `<p class="apple-risk-fine-print model-note">【技術メモ】感染モデル（${displayText(m.type)}）— ${displayText(m.note || "")}</p>`;
  }

  function showDiseaseDetails(diseaseId, dashboard) {
    const detailsHost = getDetailsHost();
    const disease = dashboard.infectionByDisease.find((d) => d.id === diseaseId);
    if (!disease || !detailsHost) return;

    const watchPoint = disease.watchPoint || disease.summary;
    const factors = disease.infectionFactors
      .map((f) => `<li>${displayText(f)}</li>`)
      .join("");

    detailsHost.innerHTML = `<div class="apple-risk-details" role="region" aria-labelledby="disease-detail-title">
      <h3 id="disease-detail-title" class="apple-risk-details-title">${displayText(disease.name)}</h3>
      <p class="apple-risk-details-point">${displayText(watchPoint)}</p>
      ${
        typeof OrchardDiseaseSamplePhotos !== "undefined"
          ? OrchardDiseaseSamplePhotos.renderHtml(diseaseId, {
              figureClass: "apple-risk-sample-photo",
              captionClass: "apple-risk-sample-caption",
              creditClass: "apple-risk-fine-print apple-risk-sample-credit",
            })
          : ""
      }
      <dl class="apple-risk-details-keys">
        <div><dt>いちばん気をつける時期</dt><dd>${displayText(disease.mainSeason || "—")}</dd></div>
        <div><dt>感染しやすい気温の目安</dt><dd>${displayText(disease.infectionTempC || "—")}</dd></div>
        <div><dt>葉や果が濡れる時間</dt><dd>${displayText(disease.wetHours || "—")}</dd></div>
      </dl>
      <p class="apple-risk-details-subhead">そろっていると感染しやすい条件</p>
      <ul class="apple-risk-details-factors">${factors}</ul>
      <div class="apple-risk-details-tech">
        <p class="apple-risk-fine-print"><strong>病原の名前:</strong> ${displayText(disease.pathogen)}</p>
        <p class="apple-risk-fine-print">${displayText(disease.summary)}</p>
        ${renderOnsetModelNote(disease)}
        <p class="apple-risk-fine-print"><strong>今回の予測の根拠（短文）:</strong> ${displayText(disease.rationale)}</p>
        <p class="apple-risk-fine-print">品種「${escapeHtml(dashboard.variety)}」— ${
          dashboard.dataSource === "live"
            ? "品種ごとの係数を感染リスクに反映しています。"
            : "気象とつながったときに品種係数を反映します。"
        }</p>
        <p class="apple-risk-fine-print apple-risk-demo-badge" style="margin-top:8px">${displayText(dashboard.dataSourceLabel)}</p>
      </div>
    </div>`;
    OrchardDiseaseSamplePhotos?.bindFallback(detailsHost);
    detailsHost.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function render(dashboard) {
    lastRenderedDashboard = dashboard;
    const loc = dashboard.location;
    const stage =
      dashboard.growthStages.find((s) => s.id === dashboard.growthStageId)?.label ||
      "—";
    const cultivationLabel = Model.pomeCultivationLabel(dashboard.cultivationId);
    root.innerHTML = `
      <header class="apple-risk-header">
        <div class="orchard-risk-header-bar">
          <div class="orchard-risk-header-bar__intro">
            <h1>りんご・日本なし病害リスク予報</h1>
            <p class="apple-risk-subtitle">天気のデータから「感染しそうな日」と「発病しそうな時期」をお知らせします</p>
          </div>
          <button type="button" class="settings-btn" id="apple-risk-settings-btn" aria-label="設定">⚙ 設定</button>
        </div>
        ${renderStatusBanner(dashboard)}
        ${renderCropTabs(dashboard)}
        <div class="apple-risk-meta">
          <span><strong>対象:</strong> ${escapeHtml(dashboard.cropLabel)}</span>
          ${renderVarietySelect(dashboard)}
          <span><strong>地点:</strong> ${escapeHtml(loc.label || `${loc.prefecture} ${loc.municipality}`)}</span>
          <span><strong>栽培方式:</strong> ${escapeHtml(cultivationLabel)}</span>
          <span class="apple-risk-stage-emphasis"><strong>現在の生育ステージ:</strong> ${escapeHtml(stage)}</span>
          <span><strong>更新:</strong> ${escapeHtml(dashboard.updatedAt)}（JST）</span>
          ${
            dashboard.dataSource === "live" && dashboard.varietyFactor != null && dashboard.varietyFactor !== 1
              ? `<span><strong>品種係数（基準）:</strong> ×${Number(dashboard.varietyFactor).toFixed(2)}</span>`
              : ""
          }
          <span class="apple-risk-demo-badge">${displayText(dashboard.dataSourceLabel)}</span>
        </div>
        <div class="apple-risk-header-stages" aria-labelledby="stage-heading">
          <h2 id="stage-heading" class="apple-risk-header-stages-title">生育ステージ</h2>
          <p class="apple-risk-fine-print apple-risk-header-stages-lead">いまの時期に合わせて選びます（品種ごとに記憶します）。</p>
          <div class="apple-risk-stages" id="apple-risk-stages">${renderStages(dashboard)}</div>
          ${renderBloomStartField(dashboard)}
          ${renderGymnosporangiumHostField(dashboard)}
        </div>
      </header>

      <section class="apple-risk-section" aria-labelledby="infection-heading">
        <h2 id="infection-heading">感染危険予報（今後5日）</h2>
        <p class="apple-risk-section-lead apple-risk-section-lead--plain">これから5日間、病害に<strong class="apple-risk-em">感染しやすいか</strong>を色で示します。表の<strong class="apple-risk-em">病害名</strong>を押すと、罹病果実の写真とくわしい説明が下に出ます。</p>
        <div class="apple-risk-cards">
          ${renderOverallCard("本日", dashboard.overall.today)}
          ${renderOverallCard("3日先", dashboard.overall.day3)}
          ${renderOverallCard("5日先", dashboard.overall.day5)}
        </div>
        ${renderInfectionTable(dashboard)}
        <div id="apple-risk-disease-details" style="margin-top:12px"></div>
      </section>

      <section class="apple-risk-section" aria-labelledby="onset-heading">
        <h2 id="onset-heading">発病の目安</h2>
        <p class="apple-risk-section-lead">${displayText(onsetLeadText(dashboard))}</p>
        <div class="apple-risk-onset-list">${renderOnset(dashboard)}</div>
      </section>

      <section class="apple-risk-section" aria-labelledby="weather-heading">
        <h2 id="weather-heading">6日間の天気の目安</h2>
        <p class="apple-risk-section-lead">本日から5日先までの気温・雨・湿度です。葉が濡れていた時間は<strong class="apple-risk-em">推定値</strong>です（下段の小さな文字を参照）。</p>
        ${renderWeather(dashboard)}
      </section>

      <section class="apple-risk-section" aria-labelledby="rationale-heading">
        <h2 id="rationale-heading">くわしい説明（折りたたみ）</h2>
        <p class="apple-risk-section-lead">専門的な根拠や論文名は<strong class="apple-risk-em">小さな文字</strong>にまとめています。まずは上の表と写真をご覧ください。</p>
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
    bindNativeDateInputCommit(bloomInput, (value) => {
      Model.saveBloomStartApple(value);
      schedulePhenologyRefresh(dashboard.cropId);
    });
    document.getElementById("apple-risk-bloom-clear")?.addEventListener("click", () => {
      if (bloomInput) {
        bloomInput.value = "";
      }
      Model.clearBloomStartApple();
      refreshDashboard(dashboard.cropId);
    });
    const greenTipInput = document.getElementById("apple-risk-green-tip");
    bindNativeDateInputCommit(greenTipInput, (value) => {
      Model.saveGreenTipApple(value);
      schedulePhenologyRefresh(dashboard.cropId);
    });
    document.getElementById("apple-risk-green-tip-clear")?.addEventListener("click", () => {
      if (greenTipInput) {
        greenTipInput.value = "";
      }
      Model.clearGreenTipApple();
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
  let refreshAbort = null;
  let phenologyRefreshTimer = null;
  let lastRenderedDashboard = null;

  function schedulePhenologyRefresh(cropId) {
    window.clearTimeout(phenologyRefreshTimer);
    phenologyRefreshTimer = window.setTimeout(() => {
      refreshDashboard(cropId);
    }, 400);
  }

  async function refreshDashboard(cropId = Model.loadCropId()) {
    const seq = ++refreshSeq;
    window.clearTimeout(phenologyRefreshTimer);
    if (refreshAbort) {
      refreshAbort.abort();
    }
    refreshAbort = new AbortController();
    const { signal } = refreshAbort;

    root.setAttribute("aria-busy", "true");

    const refreshPlaceholder =
      lastRenderedDashboard && lastRenderedDashboard.cropId === cropId
        ? { ...lastRenderedDashboard, liveFetchInProgress: true }
        : { ...Model.buildDashboard(cropId), liveFetchInProgress: true };
    if (seq === refreshSeq) {
      render(refreshPlaceholder);
    }

    try {
      const dashboard = await Model.buildDashboardLive(
        cropId,
        (partial) => {
          if (seq !== refreshSeq) return;
          render(partial);
        },
        { signal }
      );
      if (seq !== refreshSeq) return;
      render(dashboard);
    } catch (err) {
      if (seq !== refreshSeq || err?.name === "AbortError") {
        return;
      }
      render({
        ...Model.buildDashboard(cropId),
        fetchError: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (seq === refreshSeq) {
        root.removeAttribute("aria-busy");
      }
    }
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
          `<option value="${escapeHtml(v)}"${v === selected ? " selected" : ""}>${displayText(v)}</option>`
      )
      .join("");
  }

  function fillCultivationRadios(selectedId) {
    const host = document.getElementById("pome-cultivation-radios");
    if (!host || !Array.isArray(Model.POME_CULTIVATION)) return;
    host.innerHTML = Model.POME_CULTIVATION.map(
      (opt) =>
        `<label class="apple-risk-cultivation-option"><input type="radio" name="pomeCultivation" value="${escapeHtml(opt.id)}"${opt.id === selectedId ? " checked" : ""}><span>${displayText(opt.label)}</span></label>`
    ).join("");
  }

  function fillGunmaLocationPresets() {
    const host = document.getElementById("pome-gunma-presets");
    if (!host || !Array.isArray(Model.GUNMA_LOCATION_PRESETS)) return;
    host.innerHTML = Model.GUNMA_LOCATION_PRESETS.map(
      (p) =>
        `<button type="button" class="apple-risk-btn" data-gunma-preset="${escapeHtml(p.id)}" data-lat="${p.lat}" data-lon="${p.lon}">${displayText(p.label)}</button>`
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
