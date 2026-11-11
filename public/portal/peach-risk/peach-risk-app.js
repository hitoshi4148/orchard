document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("peach-risk-root");
  let selectedDiseaseId = PeachRiskModel.DISEASE_ORDER[0];
  const chartToggles = {
    temp: true,
    humidity: true,
    precip: true,
    wet: true,
    wind: true,
  };

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  }

  function riskPill(level) {
    const meta = PeachRiskModel.RISK[level];
    if (!meta) return "";
    return `<span class="peach-risk-pill ${meta.className}">${meta.label}</span>`;
  }

  function renderCurrentTable(state) {
    const rows = state.currentRisks
      .map(
        (d) => `<tr class="peach-risk-disease-row${d.id === state.selectedDiseaseId ? " is-selected" : ""}" data-disease-id="${d.id}" tabindex="0" role="button">
        <th scope="row"><span class="peach-disease-link">${escapeHtml(d.name)}</span></th>
        <td>${riskPill(d.level)}</td>
        <td>${escapeHtml(d.reason)}</td>
        <td class="peach-muted">${escapeHtml(d.watchConditions)}</td>
        <td class="peach-muted">${escapeHtml(d.stageNote)}</td>
      </tr>`
      )
      .join("");

    return `<section class="peach-risk-panel peach-risk-panel--focus" aria-labelledby="current-heading">
      <h2 id="current-heading" class="peach-risk-panel-title">病害別リスク一覧${state.isLive ? "" : "（サンプル）"}</h2>
      <p class="peach-risk-lead">病害名を選択すると詳細・5日感染予報の気象根拠を確認できます。</p>
      <div class="peach-risk-table-wrap">
        <table class="peach-risk-table">
          <thead><tr><th>病害</th><th>判定</th><th>判定理由</th><th>気象条件</th><th>生育ステージとの関係</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div id="peach-disease-detail"></div>
    </section>`;
  }

  function renderDiseaseDetail(state) {
    const d = state.selectedDisease;
    const samplePhoto =
      typeof OrchardDiseaseSamplePhotos !== "undefined"
        ? OrchardDiseaseSamplePhotos.renderHtml(d.id)
        : "";
    return `<article class="peach-risk-detail">
      <h3>${escapeHtml(d.name)}${state.isLive ? "" : ' <span class="peach-risk-demo-badge">サンプル</span>'}</h3>
      <p>${escapeHtml(d.summary)}</p>
      ${samplePhoto}
      <dl class="peach-risk-dl">
        <dt>病原</dt><dd>${escapeHtml(d.pathogen)}</dd>
        <dt>感染に関係する気象</dt><dd>${escapeHtml(d.watchConditions)}</dd>
        <dt>注意すべき生育ステージ</dt><dd>${escapeHtml(d.stageRelation)}</dd>
      </dl>
    </article>`;
  }

  function renderHeatmap(state) {
    const days = PeachRiskModel.getDayLabels();
    const header = days.map((l) => `<th>${escapeHtml(l)}</th>`).join("");
    const rows = state.infectionMatrix
      .map((row) => {
        const cells = row.days
          .map(
            (d) =>
              `<td class="peach-heat-cell ${PeachRiskModel.RISK[d.level].className}" title="${escapeHtml(row.name)} ${escapeHtml(d.label)}: ${PeachRiskModel.RISK[d.level].label}"><span class="peach-heat-level-label">${escapeHtml(PeachRiskModel.RISK[d.level].label)}</span></td>`
          )
          .join("");
        const sel = row.diseaseId === state.selectedDiseaseId ? " is-selected" : "";
        return `<tr class="peach-heat-row${sel}" data-disease-id="${row.diseaseId}">
          <th scope="row"><button type="button" class="peach-heat-disease-btn" data-disease-id="${row.diseaseId}">${escapeHtml(row.name)}</button></th>
          ${cells}
        </tr>`;
      })
      .join("");

    const det = state.selectedDetail;
    const selName = state.selectedDisease.name;
    const windBlock =
      state.selectedDiseaseId === "peach:bacterial_shot_hole"
        ? `<li class="peach-wind-emphasis"><strong>風速・風向:</strong> ${escapeHtml(det.windNote || "—")}</li>`
        : `<li><strong>風速・風向:</strong> ${escapeHtml(det.windNote || "—")}</li>`;

    return `<section class="peach-risk-panel peach-risk-panel--focus" aria-labelledby="infection-heading">
      <h2 id="infection-heading" class="peach-risk-panel-title">感染危険予報（今後5日間${state.isLive ? "" : "・サンプル"}）</h2>
      <p class="peach-risk-lead">感染が新たに成立しうる危険度（発病予測とは別指標）。</p>
      <div class="peach-heat-legend" aria-hidden="true">
        <span><i class="dot risk-low"></i>低</span>
        <span><i class="dot risk-medium"></i>中</span>
        <span><i class="dot risk-high"></i>高</span>
      </div>
      <div class="peach-risk-table-wrap">
        <table class="peach-risk-table peach-heat-table">
          <thead><tr><th>病害</th>${header}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="peach-infection-focus">
        <h3>選択中: ${escapeHtml(selName)}</h3>
        <p><strong>感染リスクが高まる日（仮）:</strong> ${escapeHtml(det.highDays || "—")}</p>
        <ul class="peach-focus-list">
          <li><strong>気温:</strong> ${escapeHtml(det.tempNote || "—")}</li>
          <li><strong>降水量:</strong> ${escapeHtml(det.precipNote || "—")}</li>
          <li><strong>相対湿度:</strong> ${escapeHtml(det.humidityNote || "—")}</li>
          <li><strong>推定葉面濡れ:</strong> ${escapeHtml(det.wetNote || "—")}</li>
          ${windBlock}
        </ul>
        <p class="peach-rationale">${escapeHtml(det.rationale || "")}</p>
      </div>
    </section>`;
  }

  function onsetCardBadge(state, item) {
    if (!state.isLive) {
      return ' <span class="peach-risk-demo-badge">サンプル</span>';
    }
    if (item.insufficient) {
      return item.isDemo
        ? ' <span class="peach-risk-demo-badge">モデル未接続</span>'
        : "";
    }
    if (item.liveData && !item.isDemo && item.modelStatus === "gdd") {
      return ' <span class="peach-risk-onset-gdd-badge">GDD目安</span>';
    }
    if (item.liveData && !item.isDemo) {
      return ' <span class="peach-risk-onset-live-badge">潜伏期目安</span>';
    }
    if (item.isDemo) {
      return ' <span class="peach-risk-demo-badge">モデル未接続</span>';
    }
    return "";
  }

  function renderOnset(state) {
    const infectionDt =
      state.isLive && !state.onset?.every((o) => o.insufficient)
        ? "感染危険ピーク（目安）"
        : "感染が想定された時期";
    const cards = state.onset
      .map((item) => {
        if (item.insufficient) {
          return `<article class="peach-onset-card peach-onset-card--na">
            <h3>${escapeHtml(item.diseaseName)}${onsetCardBadge(state, item)}</h3>
            <p class="peach-onset-insufficient">予測データ不足</p>
            <p class="peach-muted">${escapeHtml(item.basis)}</p>
          </article>`;
        }
        const confLevel =
          item.confidence === "高" ? "high" : item.confidence === "中" ? "medium" : "low";
        const infectionLabel =
          state.isLive && item.liveData ? "感染危険ピーク（目安）" : infectionDt;
        return `<article class="peach-onset-card">
          <h3>${escapeHtml(item.diseaseName)}${onsetCardBadge(state, item)}</h3>
          <dl class="peach-risk-dl peach-onset-dl">
            <dt>${escapeHtml(infectionLabel)}</dt><dd>${escapeHtml(item.infectionWindow)}</dd>
            <dt>発病予測時期</dt><dd>${escapeHtml(item.onsetWindow)}</dd>
            <dt>確度</dt><dd>${riskPill(confLevel)} <span class="peach-muted">（感染危険度とは別）</span></dd>
            ${
              item.gddSinceInfectionDayC != null
                ? `<dt>簡易積算（感染日以降）</dt><dd>${escapeHtml(String(item.gddSinceInfectionDayC))} 日℃</dd>`
                : ""
            }
          </dl>
          <p class="peach-rationale">${escapeHtml(item.basis)}</p>
        </article>`;
      })
      .join("");

    const highlights = [2, 3, 7, 8, 12, 15, 16, 19];
    const segs = Array.from({ length: state.onsetTimelineDays }, (_, i) => {
      const day = i + 1;
      const on = highlights.includes(day);
      return `<span class="peach-timeline-seg${on ? " has-event" : ""}">${day % 5 === 0 ? day : ""}</span>`;
    }).join("");

    return `<section class="peach-risk-panel peach-risk-panel--focus" aria-labelledby="onset-heading">
      <h2 id="onset-heading" class="peach-risk-panel-title">発病予測（簡易${state.isLive ? "・気象連動" : "・表示例"}）</h2>
      <p class="peach-risk-lead">${state.isLive ? "API の発病予測（感染危険ピーク日＋文献ベースの潜伏期／簡易 GDD）。数値は警戒目安です。" : "地点未設定時は発病予測のみ表示例です（感染危険もサンプル）。潜伏期・積算温度などは病害別に独立管理予定。"}</p>
      <div class="peach-onset-grid">${cards}</div>
      ${state.isLive ? "" : `<div class="peach-timeline" aria-label="20日間タイムライン（表示例）">
        <div class="peach-timeline-bar">${segs}</div>
        <p class="peach-muted">黄: 発病ウィンドウの重なりイメージ（表示例）</p>
      </div>`}
    </section>`;
  }

  function renderStageGuide(state) {
    const guideRows = state.stageDiseaseGuide
      .map(
        (g) => `<tr>
        <th scope="row">${escapeHtml(g.stage)}</th>
        <td>${escapeHtml(g.diseases.join("、"))}</td>
        <td class="peach-muted">${escapeHtml(g.note)}</td>
      </tr>`
      )
      .join("");

    const calCells = state.annualCalendar
      .map(
        (m) => `<div class="peach-annual-cell">
        <strong>${escapeHtml(m.label)}</strong>
        <span>${escapeHtml(m.focus)}</span>
      </div>`
      )
      .join("");

    return `<section class="peach-risk-panel" aria-labelledby="stage-guide-heading">
      <h2 id="stage-guide-heading" class="peach-risk-panel-title">生育ステージと病害の関係（目安・サンプル）</h2>
      <p class="peach-risk-lead">地域・品種・栽培方式で調整できる構造を想定した初期ガイドです。</p>
      <div class="peach-risk-table-wrap">
        <table class="peach-risk-table">
          <thead><tr><th>時期</th><th>注意病害</th><th>備考</th></tr></thead>
          <tbody>${guideRows}</tbody>
        </table>
      </div>
      <h3 class="peach-subheading">年間カレンダー（簡易）</h3>
      <div class="peach-annual-grid">${calCells}</div>
    </section>`;
  }

  function renderWeatherChart(state) {
    const data = state.hourly;
    const w = 640;
    const h = 220;
    const pad = { l: 40, r: 12, t: 16, b: 28 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;

    const temps = data.map((d) => d.temp);
    const maxT = Math.max(...temps, 1);
    const minT = Math.min(...temps, 0);
    const maxWind = Math.max(...data.map((d) => d.windSpeed), 1);

    function x(i) {
      return pad.l + (i / (data.length - 1)) * innerW;
    }
    function yTemp(v) {
      return pad.t + innerH - ((v - minT) / (maxT - minT || 1)) * innerH * 0.85;
    }
    function yHum(v) {
      return pad.t + innerH - (v / 100) * innerH * 0.85;
    }
    function yWind(v) {
      return pad.t + innerH - (v / maxWind) * innerH * 0.5;
    }

    const tempLine = chartToggles.temp
      ? `<path d="${data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yTemp(d.temp).toFixed(1)}`).join(" ")}" fill="none" stroke="#15803d" stroke-width="2" />`
      : "";
    const humLine = chartToggles.humidity
      ? `<path d="${data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yHum(d.humidity).toFixed(1)}`).join(" ")}" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 3" />`
      : "";
    const windLine = chartToggles.wind
      ? `<path d="${data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yWind(d.windSpeed).toFixed(1)}`).join(" ")}" fill="none" stroke="#b45309" stroke-width="1.5" />`
      : "";

    const precipBars = chartToggles.precip
      ? data
          .map((d, i) => {
            if (d.precip <= 0) return "";
            const barH = Math.min(45, d.precip * 12);
            return `<rect class="peach-chart-precip" x="${x(i) - 4}" y="${pad.t + innerH - barH}" width="8" height="${barH}" />`;
          })
          .join("")
      : "";

    const wetBars = chartToggles.wet
      ? data
          .map((d, i) => {
            if (d.leafWetHours <= 0) return "";
            const barH = Math.min(28, d.leafWetHours * 18);
            return `<rect class="peach-chart-wet" x="${x(i) - 2}" y="${pad.t + innerH - barH}" width="4" height="${barH}" />`;
          })
          .join("")
      : "";

    const ticks = [0, 12, 24, 36, 47]
      .filter((i) => data[i])
      .map(
        (i) =>
          `<text x="${x(i)}" y="${h - 6}" text-anchor="middle" class="peach-chart-tick">${escapeHtml(data[i].label)}</text>`
      )
      .join("");

    const toggleChk = (key, label) =>
      `<label class="peach-chart-toggle"><input type="checkbox" data-chart-toggle="${key}"${chartToggles[key] ? " checked" : ""}> ${escapeHtml(label)}</label>`;

    return `<section class="peach-risk-panel" aria-labelledby="weather-heading">
      <h2 id="weather-heading" class="peach-risk-panel-title">気象データの推移（時間別・サンプル）</h2>
      <p class="peach-risk-lead">表示項目を切り替えて感染危険との関係を確認できます（仮波形）。</p>
      <div class="peach-chart-toggles" id="peach-chart-toggles">
        ${toggleChk("temp", "気温")}
        ${toggleChk("precip", "降水量")}
        ${toggleChk("humidity", "湿度")}
        ${toggleChk("wet", "推定葉面濡れ")}
        ${toggleChk("wind", "風速")}
      </div>
      <div class="peach-chart-wrap">
        <svg class="peach-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="気象サンプルグラフ">
          <rect x="${pad.l}" y="${pad.t}" width="${innerW}" height="${innerH}" fill="#f9fafb" stroke="#e5e7eb" />
          ${precipBars}
          ${wetBars}
          ${tempLine}
          ${humLine}
          ${windLine}
          ${ticks}
        </svg>
      </div>
      <p class="peach-risk-hint">※ 風向は表ではなく選択病害の感染フォーカス欄で確認（せん孔細菌病は強調表示）。葉面濡れは推定値です。</p>
    </section>`;
  }

  function renderTips(state) {
    const items = state.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
    return `<section class="peach-risk-panel" aria-labelledby="tips-heading">
      <h2 id="tips-heading" class="peach-risk-panel-title">今日の管理ポイント（サンプル）</h2>
      <ul class="peach-tips-list">${items}</ul>
      <p class="peach-muted">設定: ${escapeHtml(state.settings.locationLabel)}／${escapeHtml(state.settings.variety)}／${escapeHtml(state.cultivationLabel)}</p>
    </section>`;
  }

  function bindInteractions() {
    function pickDisease(id) {
      selectedDiseaseId = id;
      render();
    }

    root.querySelectorAll("[data-disease-id]").forEach((el) => {
      const id = el.getAttribute("data-disease-id");
      el.addEventListener("click", (e) => {
        if (el.classList.contains("peach-heat-disease-btn")) e.preventDefault();
        pickDisease(id);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pickDisease(id);
        }
      });
    });

    document.getElementById("peach-chart-toggles")?.addEventListener("change", (e) => {
      const key = e.target.getAttribute("data-chart-toggle");
      if (!key) return;
      chartToggles[key] = e.target.checked;
      render();
    });
  }

  async function render() {
    root.innerHTML = '<p class="peach-risk-lead">気象データを取得中...</p>';
    const state = await PeachRiskModel.buildViewStateLive(selectedDiseaseId);
    const errBanner = state.fetchError
      ? `<p class="peach-risk-error" role="alert">${escapeHtml(state.fetchError)}（サンプル表示にフォールバック）</p>`
      : "";
    const priorYearNote =
      state.isLive && state.priorYearInfectionNote
        ? `<p class="peach-prior-year-note" role="status">${escapeHtml(state.priorYearInfectionNote)}</p>`
        : "";
    root.innerHTML = `
      <header class="peach-risk-header">
        <h1>もも病害リスク予報</h1>
        <p class="peach-risk-subtitle">気象データから、ももの病害発生リスクを予測</p>
        ${errBanner}
        ${priorYearNote}
        <div class="peach-risk-meta">
          <span class="peach-risk-demo-badge">${escapeHtml(state.dataSourceLabel)}</span>
          <span><strong>地点:</strong> ${escapeHtml(state.settings.locationLabel)}</span>
          <span><strong>品種:</strong> ${escapeHtml(state.settings.variety)}${
            state.isLive && state.varietyFactor != null && state.varietyFactor !== 1
              ? `（基準係数 ×${Number(state.varietyFactor).toFixed(2)}）`
              : ""
          }</span>
          <span><strong>栽培方式:</strong> ${escapeHtml(state.cultivationLabel)}</span>
          <span><strong>昨年発生:</strong> ${escapeHtml(state.priorYearLabel)}</span>
          <span><strong>更新:</strong> ${escapeHtml(state.updatedAt)}（表示時刻・JST）</span>
          <button type="button" class="peach-risk-btn" id="peach-risk-settings-btn">⚙ 設定</button>
        </div>
      </header>
      ${renderCurrentTable(state)}
      ${renderHeatmap(state)}
      ${renderOnset(state)}
      ${renderStageGuide(state)}
      ${renderWeatherChart(state)}
      ${renderTips(state)}
    `;

    const detailHost = root.querySelector("#peach-disease-detail");
    if (detailHost) {
      detailHost.innerHTML = renderDiseaseDetail(state);
      OrchardDiseaseSamplePhotos?.bindFallback(detailHost);
    }

    bindInteractions();
  }

  const settingsModal = document.getElementById("peach-risk-settings-modal");
  const settingsBackdrop = document.getElementById("peach-risk-modal-backdrop");

  function openPeachSettingsModal() {
    const s = PeachRiskModel.loadSettings();
    const loc =
      typeof OrchardLocationCookie !== "undefined"
        ? OrchardLocationCookie.load()
        : { lat: "", lon: "" };
    document.getElementById("peach-lat").value = loc.lat || "";
    document.getElementById("peach-lon").value = loc.lon || "";
    document.getElementById("peach-variety").innerHTML = PeachRiskModel.VARIETIES.map(
      (v) =>
        `<option value="${escapeHtml(v)}"${v === s.variety ? " selected" : ""}>${escapeHtml(v)}</option>`
    ).join("");
    document.getElementById("peach-cultivation-radios").innerHTML = (
      PeachRiskModel.CULTIVATION || []
    )
      .map(
        (opt) =>
          `<label class="peach-risk-cultivation-option"><input type="radio" name="peachCultivation" value="${escapeHtml(opt.id)}"${opt.id === s.cultivationId ? " checked" : ""}><span>${escapeHtml(opt.label)}</span></label>`
      )
      .join("");
    document.getElementById("peach-prior-year-radios").innerHTML = (
      PeachRiskModel.PRIOR_YEAR_STATUS || []
    )
      .map((opt) => {
        const checked =
          opt.id === s.priorYearStatusId ||
          (!s.priorYearStatusId && opt.id === "");
        return `<label class="peach-risk-cultivation-option"><input type="radio" name="peachPriorYear" value="${escapeHtml(opt.id)}"${checked ? " checked" : ""}><span>${escapeHtml(opt.label)}</span></label>`;
      })
      .join("");
    settingsModal?.classList.remove("hidden");
  }

  function closePeachSettingsModal() {
    settingsModal?.classList.add("hidden");
  }

  async function savePeachSettings() {
    const lat = document.getElementById("peach-lat").value.trim();
    const lon = document.getElementById("peach-lon").value.trim();
    if (!lat || !lon) {
      alert("緯度と経度を入力してください。");
      return;
    }
    let locationName = "";
    try {
      const res = await fetch(
        `/portal/api/geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
      );
      const json = await res.json();
      locationName = json.success ? json.name || "" : "";
    } catch {
      locationName = "";
    }
    PeachRiskModel.saveSharedLocation(lat, lon, locationName);
    const prev = PeachRiskModel.loadSettings();
    PeachRiskModel.saveSettings({
      variety: document.getElementById("peach-variety").value,
      cultivationId:
        document.querySelector('input[name="peachCultivation"]:checked')?.value ||
        "unspecified",
      growthStageId: prev.growthStageId,
      priorYearStatusId:
        document.querySelector('input[name="peachPriorYear"]:checked')?.value ?? "",
    });
    closePeachSettingsModal();
    render();
  }

  document.addEventListener("click", (e) => {
    if (e.target.id === "peach-risk-settings-btn") {
      openPeachSettingsModal();
    }
  });
  document.getElementById("peach-settings-save")?.addEventListener("click", savePeachSettings);
  document.getElementById("peach-settings-cancel")?.addEventListener("click", closePeachSettingsModal);
  settingsBackdrop?.addEventListener("click", closePeachSettingsModal);
  document.getElementById("peach-get-location")?.addEventListener("click", () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      document.getElementById("peach-lat").value = pos.coords.latitude.toFixed(4);
      document.getElementById("peach-lon").value = pos.coords.longitude.toFixed(4);
    });
  });

  render();
});
