(function initFruitRetailTrendUi() {
  const API = "/portal/api/fruit-retail-trend";
  const FRUITS = [
    { key: "apple", label: "りんご" },
    { key: "mikan", label: "みかん" },
    { key: "grape", label: "ぶどう" },
    { key: "pear", label: "日本なし" },
    { key: "peach", label: "もも" },
  ];

  let state = {
    fruit: "apple",
    dataset: null,
    loading: false,
  };

  function formatPrice(value) {
    if (value == null || Number.isNaN(value)) {
      return "—";
    }
    return `${value.toLocaleString("ja-JP")} 円/kg`;
  }

  function formatIndexPct(value) {
    if (value == null || Number.isNaN(value)) {
      return "—";
    }
    return `${value}%`;
  }

  function shortMonthLabel(surveyLabel) {
    const m = surveyLabel.match(/(\d+)月$/);
    return m ? `${m[1]}月` : surveyLabel;
  }

  function renderChart(history, fruitKey) {
    const width = 360;
    const height = 180;
    const pad = { top: 12, right: 12, bottom: 28, left: 44 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const points = history
      .map((row, index) => ({
        index,
        label: shortMonthLabel(row.surveyLabel),
        price: row.prices[fruitKey],
      }))
      .filter((p) => p.price != null);

    if (points.length === 0) {
      return `<p class="fruit-retail-empty">直近12ヶ月で表示できる価格がありません。</p>`;
    }

    const xs = history.map((_, i) => i);
    const prices = points.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const span = maxP - minP || 1;

    const xAt = (i) => pad.left + (i / Math.max(history.length - 1, 1)) * innerW;
    const yAt = (price) => pad.top + innerH - ((price - minP) / span) * innerH;

    const polyline = points
      .map((p) => `${xAt(p.index)},${yAt(p.price)}`)
      .join(" ");

    const dots = points
      .map(
        (p) =>
          `<circle cx="${xAt(p.index)}" cy="${yAt(p.price)}" r="3.5" class="fruit-retail-chart-dot">
            <title>${p.label}: ${formatPrice(p.price)}</title>
          </circle>`
      )
      .join("");

    const xLabels = history
      .map((row, i) => {
        if (history.length > 8 && i % 2 !== 0 && i !== history.length - 1) {
          return "";
        }
        const x = xAt(i);
        return `<text x="${x}" y="${height - 6}" text-anchor="middle" class="fruit-retail-chart-axis">${shortMonthLabel(row.surveyLabel)}</text>`;
      })
      .join("");

    const yMid = (minP + maxP) / 2;
    const yLabels = [minP, yMid, maxP]
      .map((v, i, arr) => {
        const uniq = i === 0 || v !== arr[i - 1];
        if (!uniq) return "";
        return `<text x="${pad.left - 6}" y="${yAt(v) + 4}" text-anchor="end" class="fruit-retail-chart-axis">${Math.round(v)}</text>`;
      })
      .join("");

    return `<svg class="fruit-retail-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="過去12ヶ月の小売価格推移">
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + innerH}" class="fruit-retail-chart-grid"/>
      <line x1="${pad.left}" y1="${pad.top + innerH}" x2="${pad.left + innerW}" y2="${pad.top + innerH}" class="fruit-retail-chart-grid"/>
      ${yLabels}
      ${xLabels}
      <polyline points="${polyline}" class="fruit-retail-chart-line" fill="none"/>
      ${dots}
    </svg>`;
  }

  function renderLatest(latest, fruitKey, fruitLabel) {
    const detail = latest.detail[fruitKey];
    const price = detail?.priceYenPerKg ?? null;
    return `<div class="fruit-retail-latest">
      <p class="fruit-retail-latest-label">${fruitLabel}（最新）</p>
      <p class="fruit-retail-latest-price">${formatPrice(price)}</p>
      <p class="fruit-retail-latest-meta">前月比指数 ${formatIndexPct(detail?.momIndexPct ?? null)} / 前年同月比指数 ${formatIndexPct(detail?.yoyIndexPct ?? null)}</p>
      <p class="fruit-retail-latest-note">指数100超で前月・前年より高い目安（農水省公表値）</p>
    </div>`;
  }

  function renderPanel() {
    const panel = document.getElementById("fruit-retail-panel");
    if (!panel || !state.dataset) {
      return;
    }
    const fruit = FRUITS.find((f) => f.key === state.fruit) ?? FRUITS[0];
    const { latest, history } = state.dataset;
    panel.innerHTML = `<div class="fruit-retail-panel-grid">
      ${renderLatest(latest, fruit.key, fruit.label)}
      <div class="fruit-retail-chart-block">
        <h4 class="fruit-retail-chart-title">過去12ヶ月（全国平均・小売）</h4>
        ${renderChart(history, fruit.key)}
      </div>
    </div>`;
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    const loading = document.getElementById("fruit-retail-loading");
    const error = document.getElementById("fruit-retail-error");
    if (loading) {
      loading.classList.toggle("hidden", !isLoading);
    }
    if (error && isLoading) {
      error.classList.add("hidden");
    }
  }

  function showError(message) {
    const error = document.getElementById("fruit-retail-error");
    if (error) {
      error.textContent = message;
      error.classList.remove("hidden");
    }
  }

  async function loadData() {
    if (state.loading) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "データの取得に失敗しました");
      }
      state.dataset = data;
      const meta = document.getElementById("fruit-retail-meta");
      if (meta && data.latest) {
        meta.textContent = `調査月: ${data.latest.surveyLabel}（${data.latest.surveyPeriod}）`;
      }
      renderPanel();
    } catch (err) {
      showError(err.message || "小売価格データを表示できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  function bindControls() {
    document.querySelectorAll("[data-retail-fruit-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.fruit = btn.getAttribute("data-retail-fruit-key");
        document.querySelectorAll("[data-retail-fruit-key]").forEach((el) => {
          el.classList.toggle("is-active", el === btn);
        });
        renderPanel();
      });
    });
  }

  function start() {
    bindControls();
    loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
