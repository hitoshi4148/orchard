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

  function renderSettingsForm(state) {
    const s = state.settings;
    const varietyOpts = GrapeRiskModel.VARIETIES.map(
      (v) =>
        `<option value="${escapeHtml(v)}"${v === s.variety ? " selected" : ""}>${escapeHtml(v)}</option>`
    ).join("");
    const cultOpts = GrapeRiskModel.CULTIVATION.map(
      (c) =>
        `<option value="${c.id}"${c.id === s.cultivationId ? " selected" : ""}>${escapeHtml(c.label)}</option>`
    ).join("");
    const stageOpts = GrapeRiskModel.GROWTH_STAGES.map(
      (st) =>
        `<option value="${st.id}"${st.id === s.growthStageId ? " selected" : ""}>${escapeHtml(st.label)}</option>`
    ).join("");

    return `<section class="grape-risk-panel" aria-labelledby="settings-heading">
      <h2 id="settings-heading" class="grape-risk-panel-title">園地・栽培条件</h2>
      <form class="grape-risk-settings" id="grape-risk-settings-form">
        <div class="grape-risk-settings-grid">
          <label>園地名<input name="vineyardName" type="text" value="${escapeHtml(s.vineyardName)}"></label>
          <label>都道府県<input name="prefecture" type="text" value="${escapeHtml(s.prefecture)}"></label>
          <label>市町村<input name="municipality" type="text" value="${escapeHtml(s.municipality)}"></label>
          <label>品種<select name="variety">${varietyOpts}</select></label>
          <label>栽培方式<select name="cultivationId">${cultOpts}</select></label>
          <label>生育ステージ<select name="growthStageId">${stageOpts}</select></label>
        </div>
        <p class="grape-risk-hint">※ 品種・ステージによるリスク計算は未実装です（選択内容は画面にのみ反映）。</p>
      </form>
    </section>`;
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
      <h2 id="current-heading" class="grape-risk-panel-title">病害別リスク一覧（サンプル）</h2>
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
    const det = state.selectedDetail;
    return `<article class="grape-risk-detail">
      <h3>${escapeHtml(d.name)} <span class="grape-risk-demo-badge">サンプル</span></h3>
      <p>${escapeHtml(d.summary)}</p>
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
              `<td class="grape-heat-cell ${GrapeRiskModel.RISK[d.level].className}" title="${escapeHtml(row.name)} ${escapeHtml(d.label)}: ${GrapeRiskModel.RISK[d.level].label}"><span class="sr-only">${GrapeRiskModel.RISK[d.level].label}</span></td>`
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
      <h2 id="infection-heading" class="grape-risk-panel-title">感染危険予報（今後5日間・サンプル）</h2>
      <p class="grape-risk-lead">感染が新たに成立しうる危険度の目安です（発病予測とは別）。</p>
      <div class="grape-heat-legend" aria-hidden="true">
        <span><i class="dot risk-low"></i>低</span>
        <span><i class="dot risk-medium"></i>中</span>
        <span><i class="dot risk-high"></i>高</span>
      </div>
      <p class="grape-risk-hint">色のみに依存しないよう、選択病害の判定理由は下記テキストでも表示します。</p>
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

  function renderOnset(state) {
    const cards = state.onset
      .map((item) => {
        if (item.insufficient) {
          return `<article class="grape-onset-card grape-onset-card--na">
            <h3>${escapeHtml(item.diseaseName)}</h3>
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
        return `<article class="grape-onset-card">
          <h3>${escapeHtml(item.diseaseName)} <span class="grape-risk-demo-badge">サンプル</span></h3>
          <dl class="grape-risk-dl grape-onset-dl">
            <dt>感染が想定された時期</dt><dd>${escapeHtml(item.infectionWindow)}</dd>
            <dt>発病予測時期</dt><dd>${escapeHtml(item.onsetWindow)}</dd>
            <dt>確度</dt><dd>${riskPill(confLevel)} <span class="grape-muted">（感染危険度とは別）</span></dd>
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
      <h2 id="onset-heading" class="grape-risk-panel-title">発病予測（今後20日間・サンプル）</h2>
      <p class="grape-risk-lead">既に感染した可能性がある場合の症状出現の目安。晩腐病は感染と果実症状のタイムラグに注意。</p>
      <div class="grape-onset-grid">${cards}</div>
      <div class="grape-timeline" aria-label="20日間タイムライン（サンプル）">
        <div class="grape-timeline-bar">${segs}</div>
        <p class="grape-muted">黄: 発病ウィンドウの重なりイメージ（仮）</p>
      </div>
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
      <h2 id="weather-heading" class="grape-risk-panel-title">気象データ（時間別・サンプル）</h2>
      <p class="grape-risk-lead">感染危険予報の根拠確認用。実 API 未接続の仮波形です。</p>
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
      <h2 id="tips-heading" class="grape-risk-panel-title">今日の管理ポイント（サンプル）</h2>
      <p class="grape-risk-lead">防除指示・農薬使用は表示しません。気象と生育ステージ向けの注意例です。</p>
      <ul class="grape-tips-list">${items}</ul>
      <p class="grape-muted">現在の設定: ${escapeHtml(state.settings.vineyardName)}／${escapeHtml(state.settings.variety)}／${escapeHtml(state.stageLabel)}／${escapeHtml(state.cultivationLabel)}</p>
    </section>`;
  }

  function bindInteractions(state) {
    const form = document.getElementById("grape-risk-settings-form");
    form?.addEventListener("change", () => {
      const fd = new FormData(form);
      GrapeRiskModel.saveSettings({
        vineyardName: String(fd.get("vineyardName") || ""),
        prefecture: String(fd.get("prefecture") || ""),
        municipality: String(fd.get("municipality") || ""),
        variety: String(fd.get("variety") || ""),
        cultivationId: String(fd.get("cultivationId") || "open"),
        growthStageId: String(fd.get("growthStageId") || "bloom"),
      });
      render();
    });
    form?.addEventListener("input", (e) => {
      if (e.target.name === "vineyardName" || e.target.name === "prefecture" || e.target.name === "municipality") {
        form.dispatchEvent(new Event("change"));
      }
    });

    function pickDisease(id) {
      selectedDiseaseId = id;
      render();
    }

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

  function render() {
    const state = GrapeRiskModel.buildViewState(selectedDiseaseId);
    root.innerHTML = `
      <header class="grape-risk-header">
        <h1>ぶどう病害リスク予報</h1>
        <p class="grape-risk-subtitle">気象データから、ぶどうの病害発生リスクを予測</p>
        <div class="grape-risk-meta">
          <span class="grape-risk-demo-badge">${escapeHtml(state.dataSourceLabel)}</span>
          <span><strong>地点:</strong> ${escapeHtml(state.settings.locationLabel)}</span>
          <span><strong>更新:</strong> ${escapeHtml(state.updatedAt)}（表示時刻・JST）</span>
        </div>
      </header>
      ${renderSettingsForm(state)}
      ${renderCurrentTable(state)}
      ${renderHeatmap(state)}
      ${renderOnset(state)}
      ${renderWeatherChart(state)}
      ${renderTips(state)}
    `;

    const detailHost = root.querySelector("#grape-disease-detail");
    if (detailHost) {
      detailHost.innerHTML = renderDiseaseDetail(state);
    }

    bindInteractions(state);
  }

  render();
});
