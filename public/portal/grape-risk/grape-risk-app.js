document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("grape-risk-root");
  let selectedDiseaseId = GrapeRiskModel.DISEASE_ORDER[0];

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  }

  function riskPill(level) {
    const meta = GrapeRiskModel.RISK[level];
    if (!meta) return "";
    return `<span class="grape-risk-pill ${meta.className}">${meta.label}</span>`;
  }

  function renderCurrentTable(state) {
    const rows = state.currentRisks
      .map(
        (d) => `<tr class="grape-risk-disease-row${d.id === state.selectedDiseaseId ? " is-selected" : ""}" data-disease-id="${d.id}" tabindex="0" role="button">
        <th scope="row"><span class="grape-disease-link">${escapeHtml(d.name)}</span></th>
        <td>${riskPill(d.level)}</td>
        <td>${escapeHtml(d.reason)}</td>
        <td class="grape-muted">${escapeHtml(d.watchConditions)}</td>
      </tr>`
      )
      .join("");

    return `<section class="grape-risk-panel grape-risk-panel--focus" aria-labelledby="current-heading">
      <h2 id="current-heading" class="grape-risk-panel-title">病害別リスク一覧${state.isLive ? "" : "（サンプル）"}</h2>
      <p class="grape-risk-lead">行を選択すると詳細と5日予報の根拠を表示します。</p>
      <div class="grape-risk-table-wrap">
        <table class="grape-risk-table">
          <thead><tr><th>病害</th><th>判定</th><th>判定理由</th><th>注意気象条件</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div id="grape-disease-detail"></div>
    </section>`;
  }

  function renderDiseaseDetail(state) {
    const d = state.selectedDisease;
    const samplePhoto =
      typeof OrchardDiseaseSamplePhotos !== "undefined"
        ? OrchardDiseaseSamplePhotos.renderHtml(d.id)
        : "";
    return `<article class="grape-risk-detail">
      <h3>${escapeHtml(d.name)}${state.isLive ? "" : ' <span class="grape-risk-demo-badge">サンプル</span>'}</h3>
      <p>${escapeHtml(d.summary)}</p>
      ${samplePhoto}
      <dl class="grape-risk-dl">
        <dt>病原菌</dt><dd>${escapeHtml(d.pathogen)}</dd>
        <dt>感染に注意すべき気象</dt><dd>${escapeHtml(d.watchConditions)}</dd>
      </dl>
    </article>`;
  }

  function renderHeatmap(state) {
    const days = GrapeRiskModel.getDayLabels();
    const header = days.map((l) => `<th>${escapeHtml(l)}</th>`).join("");
    const rows = state.infectionMatrix
      .map((row) => {
        const cells = row.days
          .map(
            (d) =>
              `<td class="grape-heat-cell ${GrapeRiskModel.RISK[d.level].className}" title="${escapeHtml(row.name)} ${escapeHtml(d.label)}: ${GrapeRiskModel.RISK[d.level].label}"><span class="grape-heat-level-label">${escapeHtml(GrapeRiskModel.RISK[d.level].label)}</span></td>`
          )
          .join("");
        const sel =
          row.diseaseId === state.selectedDiseaseId ? " is-selected" : "";
        return `<tr class="grape-heat-row${sel}" data-disease-id="${row.diseaseId}">
          <th scope="row"><button type="button" class="grape-heat-disease-btn" data-disease-id="${row.diseaseId}">${escapeHtml(row.name)}</button></th>
          ${cells}
        </tr>`;
      })
      .join("");

    const det = state.selectedDetail;
    const selName = state.selectedDisease.name;

    return `<section class="grape-risk-panel grape-risk-panel--focus" aria-labelledby="infection-heading">
      <h2 id="infection-heading" class="grape-risk-panel-title">感染危険予報（今後5日間${state.isLive ? "" : "・サンプル"}）</h2>
      <p class="grape-risk-lead">感染が新たに成立しうる危険度の目安です（発病予測とは別）。</p>
      <div class="grape-heat-legend" aria-hidden="true">
        <span><i class="dot risk-low"></i>低</span>
        <span><i class="dot risk-medium"></i>中</span>
        <span><i class="dot risk-high"></i>高</span>
      </div>
      <p class="grape-risk-hint">各マスに「低・中・高」を表示しています。選択病害の判定理由は下記テキストでも確認できます。</p>
      <div class="grape-risk-table-wrap">
        <table class="grape-risk-table grape-heat-table">
          <thead><tr><th>病害</th>${header}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="grape-infection-focus">
        <h3>選択中: ${escapeHtml(selName)}</h3>
        <ul class="grape-focus-list">
          <li><strong>感染危険が高まる日（仮）:</strong> ${escapeHtml(det.highDays || "—")}</li>
          <li><strong>気温:</strong> ${escapeHtml(det.tempNote || "—")}</li>
          <li><strong>降水量:</strong> ${escapeHtml(det.precipNote || "—")}</li>
          <li><strong>推定葉面濡れ:</strong> ${escapeHtml(det.wetNote || "—")}</li>
          <li><strong>湿度:</strong> ${escapeHtml(det.humidityNote || "—")}</li>
        </ul>
        <p class="grape-rationale">${escapeHtml(det.rationale || "")}</p>
      </div>
    </section>`;
  }

  function onsetCardBadge(state, item) {
    if (!state.isLive) {
      return ' <span class="grape-risk-demo-badge">サンプル</span>';
    }
    if (item.insufficient) {
      return item.isDemo
        ? ' <span class="grape-risk-demo-badge">モデル未接続</span>'
        : "";
    }
    if (item.liveData && !item.isDemo && item.modelStatus === "gdd") {
      return ' <span class="grape-risk-onset-gdd-badge">GDD目安</span>';
    }
    if (item.liveData && !item.isDemo) {
      return ' <span class="grape-risk-onset-live-badge">潜伏期目安</span>';
    }
    if (item.isDemo) {
      return ' <span class="grape-risk-demo-badge">モデル未接続</span>';
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
          return `<article class="grape-onset-card grape-onset-card--na">
            <h3>${escapeHtml(item.diseaseName)}${onsetCardBadge(state, item)}</h3>
            <p class="grape-onset-insufficient">予測データ不足</p>
            <p class="grape-muted">${escapeHtml(item.basis)}</p>
          </article>`;
        }
        const confLevel =
          item.confidence === "高"
            ? "high"
            : item.confidence === "中"
              ? "medium"
              : "low";
        const infectionLabel =
          state.isLive && item.liveData ? "感染危険ピーク（目安）" : infectionDt;
        return `<article class="grape-onset-card">
          <h3>${escapeHtml(item.diseaseName)}${onsetCardBadge(state, item)}</h3>
          <dl class="grape-risk-dl grape-onset-dl">
            <dt>${escapeHtml(infectionLabel)}</dt><dd>${escapeHtml(item.infectionWindow)}</dd>
            <dt>発病予測時期</dt><dd>${escapeHtml(item.onsetWindow)}</dd>
            <dt>確度</dt><dd>${riskPill(confLevel)} <span class="grape-muted">（感染危険度とは別）</span></dd>
            ${
              item.gddSinceInfectionDayC != null
                ? `<dt>簡易積算（感染日以降）</dt><dd>${escapeHtml(String(item.gddSinceInfectionDayC))} 日℃</dd>`
                : ""
            }
          </dl>
          <p class="grape-rationale">${escapeHtml(item.basis)}</p>
        </article>`;
      })
      .join("");

    const highlights = [3, 4, 5, 11, 12, 16, 17, 18];
    const segs = Array.from({ length: state.onsetTimelineDays }, (_, i) => {
      const day = i + 1;
      const on = highlights.includes(day);
      return `<a href="#" class="grape-timeline-seg${on ? " has-event" : ""}" data-day="${day}" tabindex="-1" aria-hidden="true">${day % 5 === 0 ? day : ""}</a>`;
    }).join("");

    return `<section class="grape-risk-panel grape-risk-panel--focus" aria-labelledby="onset-heading">
      <h2 id="onset-heading" class="grape-risk-panel-title">発病予測（簡易${state.isLive ? "・気象連動" : "・サンプル"}）</h2>
      <p class="grape-risk-lead">${state.isLive ? "API の発病予測（感染危険ピーク日＋文献ベースの潜伏期／簡易 GDD）。数値は警戒目安です。" : "地点未設定時は発病予測のみ表示例です（感染危険もサンプル）。"}晩腐病は感染と果実症状のタイムラグに注意。</p>
      <div class="grape-onset-grid">${cards}</div>
      ${
        state.isLive
          ? ""
          : `<div class="grape-timeline" aria-label="20日間タイムライン（表示例）">
        <div class="grape-timeline-bar">${segs}</div>
        <p class="grape-muted">黄: 発病ウィンドウの重なりイメージ（表示例）</p>
      </div>`
      }
    </section>`;
  }

  function renderWeatherChart(state) {
    const data = state.hourly;
    const w = 640;
    const h = 200;
    const pad = { l: 40, r: 12, t: 12, b: 28 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;

    const temps = data.map((d) => d.temp);
    const hums = data.map((d) => d.humidity);
    const maxT = Math.max(...temps, 1);
    const minT = Math.min(...temps, 0);

    function x(i) {
      return pad.l + (i / (data.length - 1)) * innerW;
    }
    function yTemp(v) {
      return pad.t + innerH - ((v - minT) / (maxT - minT || 1)) * innerH;
    }
    function yHum(v) {
      return pad.t + innerH - (v / 100) * innerH;
    }

    const tempLine = data
      .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yTemp(d.temp).toFixed(1)}`)
      .join(" ");
    const humLine = data
      .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yHum(d.humidity).toFixed(1)}`)
      .join(" ");

    const precipBars = data
      .map((d, i) => {
        if (d.precip <= 0) return "";
        const barH = Math.min(40, d.precip * 15);
        const bx = x(i) - 4;
        const by = pad.t + innerH - barH;
        return `<rect class="grape-chart-precip" x="${bx}" y="${by}" width="8" height="${barH}" />`;
      })
      .join("");

    const wetBars = data
      .map((d, i) => {
        if (d.leafWetHours <= 0) return "";
        const barH = Math.min(30, d.leafWetHours * 20);
        const bx = x(i) - 2;
        const by = pad.t + innerH - barH;
        return `<rect class="grape-chart-wet" x="${bx}" y="${by}" width="4" height="${barH}" opacity="0.7" />`;
      })
      .join("");

    const ticks = [0, 12, 24, 36, 47]
      .filter((i) => data[i])
      .map(
        (i) =>
          `<text x="${x(i)}" y="${h - 6}" text-anchor="middle" class="grape-chart-tick">${escapeHtml(data[i].label)}</text>`
      )
      .join("");

    return `<section class="grape-risk-panel" aria-labelledby="weather-heading">
      <h2 id="weather-heading" class="grape-risk-panel-title">気象データ（${state.isLive ? "5日集計" : "時間別・サンプル"}）</h2>
      <p class="grape-risk-lead">${state.isLive ? "API から取得した日次集計です。" : "感染危険予報の根拠確認用。実 API 未接続の仮波形です。"}</p>
      <div class="grape-chart-legend">
        <span class="lg-temp">気温</span>
        <span class="lg-hum">湿度</span>
        <span class="lg-pre">降水量</span>
        <span class="lg-wet">推定葉面濡れ</span>
      </div>
      <div class="grape-chart-wrap">
        <svg class="grape-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="気温・湿度・降水・葉面濡れのサンプルグラフ">
          <rect x="${pad.l}" y="${pad.t}" width="${innerW}" height="${innerH}" fill="#f9fafb" stroke="#e5e7eb" />
          ${precipBars}
          ${wetBars}
          <path d="${tempLine}" fill="none" stroke="#15803d" stroke-width="2" />
          <path d="${humLine}" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 3" />
          ${ticks}
        </svg>
      </div>
      <p class="grape-risk-hint">※ 葉面濡れ時間は推定値です（実測ではありません）。</p>
    </section>`;
  }

  function renderTips(state) {
    const items = state.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
    return `<section class="grape-risk-panel" aria-labelledby="tips-heading">
      <h2 id="tips-heading" class="grape-risk-panel-title">今日の管理ポイント${state.isLive ? "" : "（サンプル）"}</h2>
      <p class="grape-risk-lead">防除指示・農薬使用は表示しません。気象と生育ステージ向けの注意例です。</p>
      <ul class="grape-tips-list">${items}</ul>
      <p class="grape-muted">現在の設定: ${escapeHtml(state.settings.locationLabel)}／${escapeHtml(state.settings.variety)}／${escapeHtml(state.cultivationLabel)}</p>
    </section>`;
  }

  function renderGrowthStages(state) {
    const currentId = state.settings.growthStageId;
    const buttons = GrapeRiskModel.GROWTH_STAGES.map((stage) => {
      const current = stage.id === currentId;
      return `<button type="button" class="grape-risk-stage${
        current ? " is-current" : ""
      }" data-stage-id="${escapeHtml(stage.id)}"${
        current ? ' aria-current="step"' : ""
      }>${escapeHtml(stage.label)}</button>`;
    }).join("");
    return `<div class="grape-risk-header-stages" aria-labelledby="grape-stage-heading">
      <h2 id="grape-stage-heading" class="grape-risk-header-stages-title">生育ステージ</h2>
      <p class="grape-muted grape-risk-stages-lead">いまの時期に合わせて選ぶと、灰色かび・黒とうなどの係数が変わります。選択を変えると予報を再取得します。</p>
      <div class="grape-risk-stages" role="group" aria-label="生育ステージ">${buttons}</div>
    </div>`;
  }

  function bindInteractions(state) {
    function pickDisease(id) {
      selectedDiseaseId = id;
      render();
    }

    root.querySelectorAll(".grape-risk-stage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-stage-id");
        if (!id) return;
        GrapeRiskModel.saveGrowthStageId(id);
        render();
      });
    });

    root.querySelectorAll("[data-disease-id]").forEach((el) => {
      const id = el.getAttribute("data-disease-id");
      el.addEventListener("click", (e) => {
        if (el.classList.contains("grape-heat-disease-btn")) {
          e.preventDefault();
        }
        pickDisease(id);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pickDisease(id);
        }
      });
    });
  }

  async function render() {
    root.innerHTML =
      '<p class="grape-risk-lead">気象データを取得中...</p>';
    const state = await GrapeRiskModel.buildViewStateLive(selectedDiseaseId);
    const errBanner = state.fetchError
      ? `<p class="grape-risk-error" role="alert">${escapeHtml(state.fetchError)}（サンプル表示にフォールバック）</p>`
      : "";
    root.innerHTML = `
      <header class="grape-risk-header">
        <h1>ぶどう病害リスク予報</h1>
        <p class="grape-risk-subtitle">気象データから、ぶどうの病害発生リスクを予測</p>
        ${errBanner}
        <div class="grape-risk-meta">
          <span class="grape-risk-demo-badge">${escapeHtml(state.dataSourceLabel)}</span>
          <span><strong>地点:</strong> ${escapeHtml(state.settings.locationLabel)}</span>
          <span><strong>品種:</strong> ${escapeHtml(state.settings.variety)}${
            state.isLive && state.varietyFactor != null && state.varietyFactor !== 1
              ? `（基準係数 ×${Number(state.varietyFactor).toFixed(2)}）`
              : ""
          }</span>
          <span><strong>栽培方式:</strong> ${escapeHtml(state.cultivationLabel)}</span>
          <span><strong>生育:</strong> ${escapeHtml(state.stageLabel)}</span>
          <span><strong>更新:</strong> ${escapeHtml(state.updatedAt)}（表示時刻・JST）</span>
          <button type="button" class="grape-risk-btn" id="grape-risk-settings-btn">⚙ 設定</button>
        </div>
        ${renderGrowthStages(state)}
      </header>
      ${renderCurrentTable(state)}
      ${renderHeatmap(state)}
      ${renderOnset(state)}
      ${renderWeatherChart(state)}
      ${renderTips(state)}
    `;

    const detailHost = root.querySelector("#grape-disease-detail");
    if (detailHost) {
      detailHost.innerHTML = renderDiseaseDetail(state);
      OrchardDiseaseSamplePhotos?.bindFallback(detailHost);
    }

    bindInteractions(state);
  }

  const settingsModal = document.getElementById("grape-risk-settings-modal");
  const settingsBackdrop = document.getElementById("grape-risk-modal-backdrop");

  function openGrapeSettingsModal() {
    const s = GrapeRiskModel.loadSettings();
    const loc =
      typeof OrchardLocationCookie !== "undefined"
        ? OrchardLocationCookie.load()
        : { lat: "", lon: "" };
    document.getElementById("grape-lat").value = loc.lat || "";
    document.getElementById("grape-lon").value = loc.lon || "";
    const varietyEl = document.getElementById("grape-variety");
    varietyEl.innerHTML = GrapeRiskModel.VARIETIES.map(
      (v) =>
        `<option value="${escapeHtml(v)}"${v === s.variety ? " selected" : ""}>${escapeHtml(v)}</option>`
    ).join("");
    const cultHost = document.getElementById("grape-cultivation-radios");
    cultHost.innerHTML = (GrapeRiskModel.CULTIVATION || []).map(
      (opt) =>
        `<label class="grape-risk-cultivation-option"><input type="radio" name="grapeCultivation" value="${escapeHtml(opt.id)}"${opt.id === s.cultivationId ? " checked" : ""}><span>${escapeHtml(opt.label)}</span></label>`
    ).join("");
    document.getElementById("grape-growth-stage").innerHTML =
      GrapeRiskModel.GROWTH_STAGES.map(
        (st) =>
          `<option value="${escapeHtml(st.id)}"${st.id === s.growthStageId ? " selected" : ""}>${escapeHtml(st.label)}</option>`
      ).join("");
    settingsModal?.classList.remove("hidden");
  }

  function closeGrapeSettingsModal() {
    settingsModal?.classList.add("hidden");
  }

  async function saveGrapeSettings() {
    const lat = document.getElementById("grape-lat").value.trim();
    const lon = document.getElementById("grape-lon").value.trim();
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
    GrapeRiskModel.saveSharedLocation(lat, lon, locationName);
    GrapeRiskModel.saveSettings({
      variety: document.getElementById("grape-variety").value,
      cultivationId:
        document.querySelector('input[name="grapeCultivation"]:checked')?.value ||
        "unspecified",
      growthStageId:
        document.getElementById("grape-growth-stage")?.value ||
        GrapeRiskModel.loadSettings().growthStageId,
    });
    closeGrapeSettingsModal();
    render();
  }

  document.addEventListener("click", (e) => {
    if (e.target.id === "grape-risk-settings-btn") {
      openGrapeSettingsModal();
    }
  });
  document.getElementById("grape-settings-save")?.addEventListener("click", saveGrapeSettings);
  document.getElementById("grape-settings-cancel")?.addEventListener("click", closeGrapeSettingsModal);
  settingsBackdrop?.addEventListener("click", closeGrapeSettingsModal);
  document.getElementById("grape-get-location")?.addEventListener("click", () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      document.getElementById("grape-lat").value = pos.coords.latitude.toFixed(4);
      document.getElementById("grape-lon").value = pos.coords.longitude.toFixed(4);
    });
  });

  render();
});
