document.addEventListener("DOMContentLoaded", async () => {
  const cropKeywordInput = document.getElementById("cropKeyword");
  const pesticideKeywordInput = document.getElementById("pesticideKeyword");
  const targetKeywordInput = document.getElementById("targetKeyword");
  const searchBtn = document.getElementById("searchBtn");
  const resultsDiv = document.getElementById("results");
  const loadingDiv = document.getElementById("loadingStatus");

  const API_BASE = "/portal/api/pesticides";

  /** 旧 URL（crop=りんご）と lab フォーム用ラベル → API 作物キー */
  const LEGACY_CROP_LABEL = {
    りんご: "ringo",
    リンゴ: "ringo",
    なし: "nashi",
    日本なし: "nashi",
    桃: "other_fruit",
    もも: "other_fruit",
    モモ: "other_fruit",
    ぶどう: "budo",
    かき: "kaki",
    みかん: "mikan",
    果樹: "other_fruit",
  };

  const LEGACY_CROP_TEXT = {
    桃: "もも",
    もも: "もも",
    モモ: "もも",
    果樹: "果樹",
  };

  let latestSearchItems = [];
  let lastQuery = null;
  let presets = [];

  searchBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/presets`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "プリセット取得に失敗しました");
    presets = data.presets || [];
    applyUrlParams();
    loadingDiv.hidden = true;
    searchBtn.disabled = false;
    if (hasSearchIntentFromUrl()) {
      doSearch();
    }
  } catch (err) {
    loadingDiv.innerHTML = `<div class="rac-message rac-message--error">データ読み込みエラー: ${escapeHtml(err.message)}</div>`;
    return;
  }

  searchBtn.addEventListener("click", doSearch);
  cropKeywordInput?.addEventListener("change", () => {
    if (hasSearchIntentFromUrl()) doSearch();
  });
  [pesticideKeywordInput, targetKeywordInput].forEach((input) => {
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  });

  function splitCropSelectValue(raw) {
    const value = String(raw ?? "").trim();
    if (!value) {
      return { category: "fruit", crop: "", cropText: "" };
    }
    if (value.includes(":")) {
      const [crop, cropText] = value.split(":", 2);
      return { category: "fruit", crop: crop || "other_fruit", cropText: (cropText || "").trim() };
    }
    return { category: "fruit", crop: value, cropText: "" };
  }

  function legacyCropFromLabel(label) {
    const key = String(label ?? "").trim();
    if (!key) return null;
    const crop = LEGACY_CROP_LABEL[key];
    if (!crop) return null;
    return {
      category: "fruit",
      crop,
      cropText: LEGACY_CROP_TEXT[key] || "",
    };
  }

  function cropSelectValueFromQuery(q) {
    if (!q.crop) return "";
    if (q.crop === "other_fruit" && q.cropText) {
      return `other_fruit:${q.cropText}`;
    }
    return q.crop;
  }

  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    let category = params.get("category") || "";
    let crop = params.get("crop") || "";
    let cropText = params.get("cropText") || params.get("crop_text") || "";
    const pesticide = params.get("pesticide") ?? "";
    const target = params.get("target") ?? "";

    if (!category && crop && LEGACY_CROP_LABEL[crop]) {
      const legacy = legacyCropFromLabel(crop);
      if (legacy) {
        category = legacy.category;
        crop = legacy.crop;
        cropText = legacy.cropText || cropText;
      }
    }

    if (!category) category = "fruit";
    if (category === "fruit" && !crop && params.get("crop") === null) {
      crop = "";
    }

    const query = { category, crop, cropText, pesticide, target };
    if (cropKeywordInput) {
      cropKeywordInput.value = cropSelectValueFromQuery(query);
    }
    pesticideKeywordInput.value = pesticide;
    targetKeywordInput.value = target;
  }

  function hasSearchIntentFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return Boolean(
      params.get("pesticide") ||
        params.get("target") ||
        params.get("crop") ||
        params.get("cropText") ||
        params.get("crop_text")
    );
  }

  function buildQuery() {
    const pesticide = pesticideKeywordInput.value.trim();
    const target = targetKeywordInput.value.trim();
  const fromSelect = splitCropSelectValue(cropKeywordInput?.value);
    return {
      category: fromSelect.category,
      crop: fromSelect.crop,
      cropText: fromSelect.cropText,
      pesticide,
      target,
    };
  }

  function queryString(q) {
    const params = new URLSearchParams();
    params.set("category", q.category);
    if (q.crop) params.set("crop", q.crop);
    if (q.cropText) params.set("cropText", q.cropText);
    if (q.pesticide) params.set("pesticide", q.pesticide);
    if (q.target) params.set("target", q.target);
    return params.toString();
  }

  function getRacClassByCode(racCode) {
    const code = String(racCode || "").toUpperCase();
    if (code.startsWith("FRAC")) return "rac-frac";
    if (code.startsWith("IRAC")) return "rac-irac";
    if (code.startsWith("HRAC")) return "rac-hrac";
    return "rac-frac";
  }

  function getRacOrderValue(code) {
    const c = String(code || "").toUpperCase();
    if (c.startsWith("FRAC")) return 1;
    if (c.startsWith("IRAC")) return 2;
    if (c.startsWith("HRAC")) return 3;
    return 9;
  }

  function sortRacCodes(racCodes) {
    return [...(racCodes || [])].sort((a, b) => {
      const oa = getRacOrderValue(a);
      const ob = getRacOrderValue(b);
      if (oa !== ob) return oa - ob;
      return String(a).localeCompare(String(b));
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderRacBadges(racCodes, matchedCodes = []) {
    if (!racCodes || racCodes.length === 0) return '<span class="rac-muted">未収載</span>';
    const matched = new Set(matchedCodes || []);
    return racCodes
      .map((code) => {
        const matchClass = matched.has(code) ? " rac-match" : "";
        return `<span class="rac-badge ${getRacClassByCode(code)}${matchClass}"><strong>${escapeHtml(code)}</strong></span>`;
      })
      .join("");
  }

  function countMatchedRacCodes(sameGroupData) {
    const matched = new Set();
    (sameGroupData || []).forEach((p) => {
      (p.matchedRacCodes || []).forEach((code) => matched.add(code));
    });
    return matched.size;
  }

  async function doSearch() {
    const q = buildQuery();
    const preset = presets.find((p) => p.key === q.crop);

    if (!q.crop) {
      resultsDiv.innerHTML =
        '<div class="rac-message rac-message--warning">対象果樹を選んでください</div>';
      return;
    }
    if (preset?.isFreeText && q.cropText.length < 2) {
      resultsDiv.innerHTML =
        '<div class="rac-message rac-message--warning">作物名を2文字以上指定してください</div>';
      return;
    }
    if ((q.pesticide && q.pesticide.length < 2) || (q.target && q.target.length < 2)) {
      resultsDiv.innerHTML =
        '<div class="rac-message rac-message--warning">農薬名・病害虫名は2文字以上で検索してください</div>';
      return;
    }

    searchBtn.disabled = true;
    resultsDiv.innerHTML = '<div class="rac-message rac-message--loading">検索中…</div>';

    try {
      const res = await fetch(`${API_BASE}/search?${queryString(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "検索に失敗しました");
      lastQuery = q;
      latestSearchItems = data.items || [];
      renderResults(latestSearchItems, data);
      history.replaceState(null, "", `${window.location.pathname}?${queryString(q)}`);
    } catch (err) {
      resultsDiv.innerHTML = `<div class="rac-message rac-message--error">検索エラー: ${escapeHtml(err.message)}</div>`;
    } finally {
      searchBtn.disabled = false;
    }
  }

  function renderResults(items, meta = {}) {
    if (!items || items.length === 0) {
      const note = meta.note ? `<p class="rac-muted">${escapeHtml(meta.note)}</p>` : "";
      resultsDiv.innerHTML = `<div class="rac-message rac-message--info">該当する農薬が見つかりませんでした。${note}</div>`;
      return;
    }

    const truncated = meta.truncated
      ? `<p class="rac-muted">表示は先頭 ${items.length} 件です（全 ${meta.total} 件）。キーワードで絞り込んでください。</p>`
      : "";

    let html = `<p class="rac-result-count">${meta.total ?? items.length} 件の農薬が見つかりました</p>${truncated}`;
    html +=
      '<p class="rac-muted">登録上の作物名は「仁果類」などグループ表記のことがあります。使用前はラベルの適用作物を確認してください。</p>';
    html += '<div class="rac-panel"><div class="rac-table-wrap"><table class="rac-table">';
    html +=
      "<thead><tr><th>登録番号</th><th>用途</th><th>農薬名称</th><th>メーカー名</th><th>マッチ作物</th><th>RACコード</th><th>選択</th></tr></thead><tbody>";
    items.forEach((item) => {
      const sortedCodes = sortRacCodes(item.racCodes || []);
      const crops = (item.matchedCrops || []).slice(0, 3).map(escapeHtml).join("、");
      const more = (item.matchedCrops || []).length > 3 ? "…" : "";
      html += `<tr>
        <td>${escapeHtml(item.regNo)}</td>
        <td>${escapeHtml(item.useCategory || "－")}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.holder || "－")}</td>
        <td class="rac-matched-crops">${crops}${more}</td>
        <td>${item.racMissing ? '<span class="rac-muted">未収載</span>' : renderRacBadges(sortedCodes)}</td>
        <td><button type="button" class="btn-primary rac-btn-sm" data-reg="${escapeHtml(item.regNo)}">選択</button></td>
      </tr>`;
    });
    html += "</tbody></table></div></div>";
    resultsDiv.innerHTML = html;
    resultsDiv.querySelectorAll("button[data-reg]").forEach((btn) => {
      btn.addEventListener("click", () => loadDetail(btn.getAttribute("data-reg")));
    });
  }

  function totalUsesText(app) {
    return (
      app.ingredient1TotalUses ||
      app.ingredient2TotalUses ||
      app.timesPerCrop ||
      "－"
    );
  }

  function renderDetailTable(apps) {
    let html = '<div class="rac-table-wrap"><table class="rac-table rac-table--compact">';
    html += "<thead><tr>";
    html +=
      "<th>作物名</th><th>適用場所</th><th>適用病害虫雑草名</th><th>希釈倍数</th><th>使用時期</th><th>使用方法</th><th>総使用回数</th>";
    html += "</tr></thead><tbody>";
    apps.forEach((row) => {
      html += `<tr>
        <td>${escapeHtml(row.cropName)}</td>
        <td>${escapeHtml(row.place || "－")}</td>
        <td>${escapeHtml(row.targetPest || "－")}</td>
        <td>${escapeHtml(row.dilution || "－")}</td>
        <td>${escapeHtml(row.timing || "－")}</td>
        <td>${escapeHtml(row.method || "－")}</td>
        <td>${escapeHtml(totalUsesText(row))}</td>
      </tr>`;
    });
    html += "</tbody></table></div>";
    return html;
  }

  function renderRacTables(racList) {
    if (!racList || racList.length === 0) return '<p class="rac-muted">RAC未収載</p>';
    let html = "";
    [...racList]
      .sort((a, b) => a.slot - b.slot)
      .forEach((rac) => {
        html += '<div class="rac-kv-block"><div class="rac-table-wrap"><table class="rac-table rac-table--compact rac-table--kv">';
        html += "<tbody>";
        html += `<tr><th>スロット</th><td>${rac.slot}</td></tr>`;
        html += `<tr><th>有効成分</th><td>${escapeHtml(rac.ingredient || "－")}</td></tr>`;
        html += `<tr><th>RACコード</th><td>${renderRacBadges([rac.displayCode || rac.racCode || "－"])}</td></tr>`;
        html += "</tbody></table></div></div>";
      });
    return html;
  }

  async function loadDetail(regNo) {
    resultsDiv.innerHTML = '<div class="rac-message rac-message--loading">詳細を読み込み中…</div>';
    const q = lastQuery || buildQuery();
    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(regNo)}?${queryString(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "詳細取得に失敗しました");
      const product = data.product;
      const allRacCodes = sortRacCodes(product.racCodes || []);
      const safeRegNo = escapeHtml(product.regNo);

      let html = '<div class="rac-panel rac-detail-panel">';
      html +=
        '<button type="button" class="btn-secondary rac-btn-sm rac-back-btn" id="backToResultsBtn">一覧へ戻る</button>';
      html += `<h2 class="rac-detail-title">${escapeHtml(product.name)}</h2>`;
      html += `<p class="rac-detail-meta">登録番号: ${safeRegNo} ／ 用途: ${escapeHtml(product.useCategory || "－")} ／ メーカー: ${escapeHtml(product.holder || "－")}</p>`;
      html += '<p class="rac-detail-label">RACコード</p>';
      if (allRacCodes.length > 0) {
        html += `<div class="rac-detail-block">${renderRacBadges(allRacCodes)}</div>`;
      } else {
        html += '<div class="rac-detail-block rac-muted">RAC未収載</div>';
      }
      html += `<div class="rac-detail-block"><button type="button" class="btn-analysis" id="showRotationBtn" data-reg="${safeRegNo}">同一グループを含む農薬</button></div>`;
      if (product.ingredients?.length) {
        html += '<h3 class="rac-subsection-title">有効成分</h3><ul class="rac-list">';
        product.ingredients.forEach((ing) => {
          html += `<li class="rac-list-item">${escapeHtml(ing.ingredient)}</li>`;
        });
        html += "</ul>";
      }
      html += '<h3 class="rac-subsection-title">適用情報</h3>';
      html += renderDetailTable(product.applications || []);
      html += '<hr class="rac-divider">';
      html += '<h3 class="rac-subsection-title">RAC情報</h3>';
      html += renderRacTables(product.rac || []);
      html += '<div id="racAndRotationArea"></div>';
      html += "</div>";

      resultsDiv.innerHTML = html;
      document.getElementById("backToResultsBtn")?.addEventListener("click", () => {
        renderResults(latestSearchItems, { total: latestSearchItems.length });
      });
      document.getElementById("showRotationBtn")?.addEventListener("click", () => {
        showRacAndRotation(product.regNo);
      });
    } catch (err) {
      resultsDiv.innerHTML = `<div class="rac-message rac-message--error">詳細取得エラー: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function showRacAndRotation(regNo) {
    const area = document.getElementById("racAndRotationArea");
    if (!area) return;
    area.innerHTML = '<div class="rac-message rac-message--loading">ローテーション候補を検索中…</div>';

    const q = lastQuery || buildQuery();
    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(regNo)}/rotation?${queryString(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "取得に失敗しました");

      const sourceRacCodes = sortRacCodes(data.source?.racCodes || []);
      const sameGroupData = data.sameGroup || [];
      const rotationData = data.recommended || [];
      const sameGroupDupCount = countMatchedRacCodes(sameGroupData);

      let html = "";
      html += '<div class="rotation-grid" id="rac-rotation-results">';
      html += '<div class="rac-panel rac-rotation-panel">';
      html += `<h3 class="rac-section-heading">同一グループを含む農薬 <span class="rac-dup-count">RAC重複：${sameGroupDupCount}</span></h3><ul class="rac-list">`;
      if (sameGroupData.length === 0) {
        html += '<li class="rac-list-item">該当なし</li>';
      } else {
        sameGroupData.forEach((p) => {
          const codes = sortRacCodes(p.racCodes || []);
          const matched = sortRacCodes((p.matchedRacCodes || []).filter((code) => sourceRacCodes.includes(code)));
          html += `<li class="rac-list-item detail-expand" data-reg="${escapeHtml(p.regNo)}">${escapeHtml(p.regNo)} ${escapeHtml(p.name)} (${escapeHtml(p.holder || "－")})<div class="rac-detail-block">${renderRacBadges(codes, matched)}</div></li>`;
        });
      }
      html += "</ul></div>";

      html += '<div class="rac-panel rac-rotation-panel">';
      html += '<h3 class="rac-section-heading">次回のおすすめローテーション <span class="rac-dup-count">RAC重複：0</span></h3><ul class="rac-list">';
      if (rotationData.length === 0) {
        html += '<li class="rac-list-item">該当なし</li>';
      } else {
        rotationData.forEach((p) => {
          const badges = renderRacBadges(sortRacCodes(p.racCodes || []));
          html += `<li class="rac-list-item detail-expand" data-reg="${escapeHtml(p.regNo)}">${escapeHtml(p.regNo)} ${escapeHtml(p.name)} (${escapeHtml(p.holder || "－")})<div class="rac-detail-block">${badges}</div></li>`;
        });
      }
      html += "</ul></div>";
      html += "</div>";

      area.innerHTML = html;
      area.querySelectorAll(".detail-expand[data-reg]").forEach((el) => {
        el.addEventListener("click", () => loadDetail(el.getAttribute("data-reg")));
      });

      const rotationResults = document.getElementById("rac-rotation-results");
      if (rotationResults) {
        requestAnimationFrame(() => {
          rotationResults.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (err) {
      area.innerHTML = `<div class="rac-message rac-message--error">RAC/ローテーション取得エラー: ${escapeHtml(err.message)}</div>`;
    }
  }
});