(function initFruitMarketUi() {
  const API = "/portal/api/fruit-market";
  const MARKETS = [
    { code: "1301", name: "東京" },
    { code: "2701", name: "大阪" },
    { code: "2301", name: "名古屋" },
    { code: "4002", name: "福岡" },
  ];
  const FRUITS = [
    { key: "apple", label: "りんご" },
    { key: "pear", label: "なし" },
    { key: "grape", label: "ぶどう" },
    { key: "kiwi", label: "キウイ" },
  ];

  let state = {
    city: "1301",
    fruit: "apple",
    sort: "volume",
    expanded: new Set(),
    loading: false,
    cachedData: null,
  };

  function formatNumber(value) {
    if (value == null || Number.isNaN(value)) {
      return "—";
    }
    return value.toLocaleString("ja-JP");
  }

  function formatPrice(value) {
    if (value == null || Number.isNaN(value)) {
      return "—";
    }
    return `${value.toLocaleString("ja-JP")} 円/kg`;
  }

  function formatPct(value) {
    if (value == null || Number.isNaN(value)) {
      return "—";
    }
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  }

  function formatDateLabel(targetDate, weekday) {
    if (!targetDate) {
      return "—";
    }
    const [y, m, d] = targetDate.split("-").map(Number);
    const w = weekday ? `（${weekday}）` : "";
    return `${y}年${m}月${d}日${w}`;
  }

  function sortOrigins(origins) {
    const list = [...origins];
    if (state.sort === "price-asc") {
      list.sort((a, b) => (a.aggregate.avgPrice ?? Infinity) - (b.aggregate.avgPrice ?? Infinity));
    } else if (state.sort === "price-desc") {
      list.sort((a, b) => (b.aggregate.avgPrice ?? -Infinity) - (a.aggregate.avgPrice ?? -Infinity));
    } else {
      list.sort((a, b) => (b.aggregate.volumeKg ?? 0) - (a.aggregate.volumeKg ?? 0));
    }
    return list;
  }

  function renderSummary(summaries) {
    const el = document.getElementById("fruit-market-summary");
    if (!el || !summaries) {
      return;
    }
    el.innerHTML = summaries
      .map((item) => {
        const active = item.cityCode === state.city ? " is-active" : "";
        return `<button type="button" class="fruit-market-summary-card${active}" data-city="${item.cityCode}">
          <span class="fruit-market-summary-city">${item.cityName}</span>
          <span class="fruit-market-summary-price">${formatPrice(item.avgPrice)}</span>
          <span class="fruit-market-summary-volume">${formatNumber(item.volumeKg)} kg</span>
        </button>`;
      })
      .join("");

    el.querySelectorAll("[data-city]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.city = btn.getAttribute("data-city");
        state.expanded.clear();
        loadAndRender();
      });
    });
  }

  function renderTable(data) {
    const area = document.getElementById("fruit-market-table-area");
    if (!area) {
      return;
    }

    if (!data.origins || data.origins.length === 0) {
      area.innerHTML = `<p class="fruit-market-empty">この市場・果物の取引データがありません。</p>`;
      return;
    }

    const origins = sortOrigins(data.origins);
    const rows = [];

    for (const group of origins) {
      const key = `${group.originCode}:${group.aggregate.itemCode}`;
      const expanded = state.expanded.has(key);
      const hasVarieties = group.varieties && group.varieties.length > 0;
      rows.push(`<tr class="fruit-market-row-aggregate">
        <td>${group.originName || "—"}</td>
        <td>${group.aggregate.itemName}</td>
        <td class="num">${formatNumber(group.aggregate.volumeKg)}</td>
        <td class="num">${formatPrice(group.aggregate.avgPrice)}</td>
        <td class="num">${formatPct(group.aggregate.priceChangePct)}</td>
        <td class="fruit-market-expand-cell">
          ${
            hasVarieties
              ? `<button type="button" class="fruit-market-expand-btn" data-expand="${key}" aria-expanded="${expanded}">${expanded ? "▼" : "▶"}</button>`
              : ""
          }
        </td>
      </tr>`);

      if (expanded && hasVarieties) {
        for (const v of group.varieties) {
          rows.push(`<tr class="fruit-market-row-variety">
            <td>${group.originName || "—"}</td>
            <td>${v.itemName}</td>
            <td class="num">${formatNumber(v.volumeKg)}</td>
            <td class="num">${formatPrice(v.avgPrice)}</td>
            <td class="num">${formatPct(v.priceChangePct)}</td>
            <td></td>
          </tr>`);
        }
      }
    }

    area.innerHTML = `<div class="fruit-market-table-wrap">
      <table class="fruit-market-table">
        <thead>
          <tr>
            <th>産地</th>
            <th>品目</th>
            <th>取引量 (kg)</th>
            <th>平均価格</th>
            <th>前日比 (価格)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>`;

    area.querySelectorAll("[data-expand]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-expand");
        if (!id) {
          return;
        }
        if (state.expanded.has(id)) {
          state.expanded.delete(id);
        } else {
          state.expanded.add(id);
        }
        renderTable(data);
      });
    });
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    const loading = document.getElementById("fruit-market-loading");
    const error = document.getElementById("fruit-market-error");
    if (loading) {
      loading.classList.toggle("hidden", !isLoading);
    }
    if (error && isLoading) {
      error.classList.add("hidden");
    }
  }

  function showError(message) {
    const error = document.getElementById("fruit-market-error");
    if (error) {
      error.textContent = message;
      error.classList.remove("hidden");
    }
  }

  async function loadAndRender() {
    setLoading(true);
    try {
      const url = `${API}?city=${encodeURIComponent(state.city)}&fruit=${encodeURIComponent(state.fruit)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "データ取得に失敗しました");
      }

      const dateEl = document.getElementById("fruit-market-date");
      if (dateEl) {
        dateEl.textContent = formatDateLabel(data.targetDate, data.weekday);
      }

      const titleEl = document.getElementById("fruit-market-detail-title");
      if (titleEl) {
        titleEl.textContent = `${data.cityName} × ${data.fruitLabel}（産地別）`;
      }

      state.cachedData = data;
      renderSummary(data.marketSummaries);
      renderTable(data);
    } catch (err) {
      showError(err.message || "データ取得に失敗しました");
      const area = document.getElementById("fruit-market-table-area");
      if (area) {
        area.innerHTML = "";
      }
    } finally {
      setLoading(false);
    }
  }

  function bindControls() {
    document.querySelectorAll("[name=fruit-market-city]").forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        state.city = input.value;
        state.expanded.clear();
        loadAndRender();
      });
    });

    document.querySelectorAll("[data-fruit-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.fruit = btn.getAttribute("data-fruit-key");
        state.expanded.clear();
        document.querySelectorAll("[data-fruit-key]").forEach((el) => {
          el.classList.toggle("is-active", el === btn);
        });
        loadAndRender();
      });
    });

    const sortSelect = document.getElementById("fruit-market-sort");
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        state.sort = sortSelect.value;
        if (state.cachedData) {
          renderTable(state.cachedData);
        }
      });
    }
  }

  function boot() {
    const root = document.getElementById("fruit-market-section");
    if (!root) {
      return;
    }
    bindControls();

    let started = false;
    const startOnce = () => {
      if (started) {
        return;
      }
      started = true;
      loadAndRender();
    };

    document.addEventListener("orchard-portal-ready", startOnce, { once: true });
    setTimeout(startOnce, 12000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
