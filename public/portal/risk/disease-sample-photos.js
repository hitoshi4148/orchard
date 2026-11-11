/**
 * 罹患症状の参考写真（Wikimedia Commons・USDA 等）。
 * ブラウザが Commons から直接読み込みます。表示ごとに出典・ライセンスを併記します。
 */
const OrchardDiseaseSamplePhotos = (() => {
  /** @type {Record<string, { src: string, localSrc?: string, alt: string, caption: string, credit: string, license: string, commonsPage: string }>} */
  const PHOTOS = {
    "apple:scab": {
      src: "https://upload.wikimedia.org/wikipedia/commons/5/50/Apple_scab.jpg",
      alt: "りんご黒星病の罹病果実",
      caption: "果実に黒褐色のかさぶた状の斑点ができます。",
      credit: "Peggy Greb（USDA ARS）",
      license: "パブリックドメイン（USDA）",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Apple_scab.jpg",
    },
    "apple:marssonina": {
      src: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Marssonina_blotch_on_a_%27Rome%27_apple_leaf.jpg",
      alt: "りんご褐斑病の罹病葉",
      caption:
        "葉に褐色斑・穴開き状の斑が出ます（葉の典型例。果実にも褐色斑が出ることがあります）。",
      credit: "Jimhue",
      license: "CC0（パブリックドメイン相当）",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Marssonina_blotch_on_a_%27Rome%27_apple_leaf.jpg",
    },
    "apple:alternaria": {
      src: "https://upload.wikimedia.org/wikipedia/commons/3/36/Diseased_apple.jpg",
      alt: "斑点のある罹病りんご果実",
      caption: "果実表面の褐色〜黒色の斑点・変色の例です。",
      credit: "Bill Kasman",
      license: "CC0",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Diseased_apple.jpg",
    },
    "apple:anthracnose": {
      src: "https://upload.wikimedia.org/wikipedia/commons/7/7f/Bitter_rot_on_a_Honeycrisp_apple.jpg",
      alt: "りんご果実の腐敗型病斑",
      caption:
        "果実のくぼんだ褐色・黒色の腐敗斑（炭疽・ビターロット類の症状例）。",
      credit: "Jesusistmeinhimmelunderde",
      license: "CC BY-SA 4.0",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Bitter_rot_on_a_Honeycrisp_apple.jpg",
    },
    "apple:blotch": {
      src: "https://upload.wikimedia.org/wikipedia/commons/5/55/Apple_scab_2017_D.jpg",
      localSrc: "/portal/risk/images/diseases/apple-blotch.jpg",
      alt: "りんご果実の褐色病斑",
      caption: "果面の褐色病斑の例（輪紋病では同心円状の斑もみられます）。",
      credit: "Fructibus",
      license: "CC0",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Apple_scab_2017_D.jpg",
    },
    "nashi:scab": {
      src: "https://upload.wikimedia.org/wikipedia/commons/2/21/Venturia_pyrina_DK59_%282%29.jpg",
      alt: "梨黒星病の罹病葉（参考）",
      caption:
        "日本なし黒星病（Venturia nashicola）は展葉期に葉や若い果実へ黒褐色の斑点ができます。日本なし（Pyrus pyrifolia）の罹病写真が Commons 上に乏しいため、同様の葉症状の参考として Venturia pyrina（洋ナシ）の例を示します。",
      credit: "Jerzy Opioła",
      license: "CC BY-SA 4.0",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Venturia_pyrina_DK59_(2).jpg",
    },
    "nashi:red_spot": {
      src: "https://upload.wikimedia.org/wikipedia/commons/7/7f/Pear_Juniper_Rust1.jpg",
      alt: "ナシ葉の赤褐色〜橙色の病斑",
      caption:
        "赤星病は葉に赤褐色の星状斑が典型です。春先の湿りが続くと目立ちます。写真はナシ葉のさび（Gymnosporangium sabinae）による斑の参考例です。",
      credit: "Donsgarden",
      license: "CC BY-SA 3.0",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Pear_Juniper_Rust1.jpg",
    },
    "nashi:blotch": {
      src: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Pear_hole_scab_2017_A3.jpg",
      alt: "ナシ果実の輪状・同心円状の病斑",
      caption:
        "熟期前後の果面に輪状・同心円状の病斑が出ることがあります。写真は果実の輪状病斑の参考例です（ホストは洋ナシ品種のことがあります）。",
      credit: "Fructibus",
      license: "CC0",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Pear_hole_scab_2017_A3.jpg",
    },
    "nashi:black_spot": {
      src: "https://upload.wikimedia.org/wikipedia/commons/3/36/Diseased_apple.jpg",
      alt: "黒色斑点のある果実",
      caption:
        "葉・果に黒色の斑点と落葉が進む病害です（近縁の果実病斑の参考イメージ）。",
      credit: "Bill Kasman",
      license: "CC0",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Diseased_apple.jpg",
    },
    "nashi:anthracnose": {
      src: "https://upload.wikimedia.org/wikipedia/commons/7/7f/Bitter_rot_on_a_Honeycrisp_apple.jpg",
      alt: "果実の腐敗型病斑",
      caption: "肥大期〜熟期に果面の黒褐色の腐敗斑が出やすい時期です（参考写真）。",
      credit: "Jesusistmeinhimmelunderde",
      license: "CC BY-SA 4.0",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Bitter_rot_on_a_Honeycrisp_apple.jpg",
    },
    "grape:downy_mildew": {
      src: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Mildiou_vegne_foye_dizo.jpg",
      alt: "ぶどう葉のべと病（露菌病）症状",
      caption:
        "葉裏に白いカビ状の胞子束（べと）が出ます。黄化した斑から広がるのが典型です。",
      credit: "Vainstain",
      license: "CC BY-SA 4.0",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Mildiou_vegne_foye_dizo.jpg",
    },
    "grape:black_rot": {
      src: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Guignardia_bidwellii_%28black_rot%29_on_grape_2.jpg",
      alt: "ぶどう果粒の黒とう病症状",
      caption: "若い果粒や葉に黒褐色の病斑が出て、進むとしおれ・硬化します。",
      credit: "Clemson University – USDA Cooperative Extension Slide Series（Bugwood.org）",
      license: "パブリックドメイン（USDA）",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Guignardia_bidwellii_(black_rot)_on_grape_2.jpg",
    },
    "grape:late_rot": {
      src: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Botrytis_infected_grapes_in_Sauternes.jpg",
      alt: "熟期ぶどう房の果粒腐敗",
      caption:
        "収穫前後に果粒が褐変・腐敗します。写真は熟期果粒の腐敗例（Botrytis による参考症状。晩腐病でも同様に果粒腐敗が進みます）。",
      credit: "Thierry B (Flickr / Wikimedia Commons)",
      license: "CC BY 2.0",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Botrytis_infected_grapes_in_Sauternes.jpg",
    },
    "grape:gray_mold": {
      src: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Botrytis_on_grapes.png",
      alt: "ぶどう果粒の灰色かび",
      caption: "花房や果粒に灰色のカビが発生します（傷口・多雨時に注意）。",
      credit: "Ninjatacoshell",
      license: "CC BY-SA 3.0",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Botrytis_on_grapes.png",
    },
    "grape:anthracnose": {
      src: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Grapeanthracnose.jpg",
      alt: "ぶどうの褐斑病症状",
      caption: "葉・新梢・果に褐色斑とかいじ状の痕が出ます。",
      credit: "Clemson University – USDA Cooperative Extension Slide Series（Bugwood.org）",
      license: "CC BY 3.0 US",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Grapeanthracnose.jpg",
    },
    "peach:bacterial_shot_hole": {
      src: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Xanthomonas_arboricola_pv._pruni_WF4.jpg",
      alt: "葉の細菌性斑点と穿孔",
      caption:
        "葉に褐色の斑点が穿孔し、落葉が進むことがあります。写真は Xanthomonas arboricola pv. pruni の葉斑（スモモ類の参考症状）。",
      credit: "Jerzy Opioła",
      license: "CC BY-SA 4.0",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Xanthomonas_arboricola_pv._pruni_WF4.jpg",
    },
    "peach:gray_spot": {
      src: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Peach_scab_and_its_control_%281917%29_%2814775998684%29.jpg",
      alt: "もも葉の斑点症状（参考）",
      caption:
        "葉表に灰褐色の星状〜斑点状の斑が出ます。USDA 技術資料（1917）のもも病害図版を参考にしています。",
      credit: "USDA Bulletin「Peach scab and its control」（Internet Archive）",
      license: "パブリックドメイン相当（No known copyright restrictions）",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Peach_scab_and_its_control_(1917)_(14775998684).jpg",
    },
    "peach:scab": {
      src: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Peach_scab_and_its_control_%281917%29_%2814591872217%29.jpg",
      alt: "もも果実の黒星病症状",
      caption: "果実や葉に黒褐色の星状斑ができます。",
      credit: "USDA Bulletin「Peach scab and its control」（Internet Archive）",
      license: "パブリックドメイン相当（No known copyright restrictions）",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Peach_scab_and_its_control_(1917)_(14591872217).jpg",
    },
    "peach:leaf_curl": {
      src: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Taphrina_deformans_102005936.jpg",
      alt: "ももいさか病（縮葉）の罹病葉",
      caption: "春先に葉が縮れ（いさか）、赤みを帯びて厚くなります。",
      credit: "iNaturalist 投稿者（photo 102005936）",
      license: "CC BY 4.0",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Taphrina_deformans_102005936.jpg",
    },
    "peach:anthracnose": {
      src: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Peach-_Monilinia_fruit_rot_%28Brown_rot%29.jpg",
      alt: "もも果実の腐敗型病斑",
      caption:
        "肥大〜成熟期に果面の円形病斑と腐敗が進みます。写真は褐腐病（Monilinia）の果実症状例ですが、炭疽でも同様の果実斑点・腐敗が見られます。",
      credit: "Matt Borden",
      license: "CC BY-SA 2.0",
      commonsPage:
        "https://commons.wikimedia.org/wiki/File:Peach-_Monilinia_fruit_rot_(Brown_rot).jpg",
    },
  };

  function get(diseaseId) {
    return PHOTOS[diseaseId] ?? null;
  }

  /**
   * @param {string} diseaseId
   * @param {{ figureClass?: string, captionClass?: string, creditClass?: string }} [opts]
   */
  function renderHtml(diseaseId, opts = {}) {
    const photo = get(diseaseId);
    if (!photo) return "";
    const figureClass = opts.figureClass ?? "orchard-disease-sample-photo";
    const captionClass = opts.captionClass ?? "orchard-disease-sample-caption";
    const creditClass = opts.creditClass ?? "orchard-disease-sample-credit";
    const fallbackAttr = photo.localSrc
      ? ` data-fallback-src="${escapeAttr(photo.localSrc)}"`
      : "";
    return `<figure class="${figureClass}">
      <img src="${escapeAttr(photo.src)}"${fallbackAttr} alt="${escapeAttr(photo.alt)}" loading="lazy" width="640" height="480">
      <figcaption>
        <span class="${captionClass}">${escapeAttr(photo.caption)}</span>
        <span class="${creditClass}">出典: <a href="${escapeAttr(photo.commonsPage)}" target="_blank" rel="noopener noreferrer">${escapeAttr(photo.credit)}</a>（${escapeAttr(photo.license)}・Wikimedia Commons）</span>
      </figcaption>
    </figure>`;
  }

  function escapeAttr(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function bindFallback(host) {
    if (!host) return;
    host.querySelectorAll(".orchard-disease-sample-photo img, .apple-risk-sample-photo img").forEach(
      (img) => {
        img.addEventListener(
          "error",
          () => {
            const fallback = img.getAttribute("data-fallback-src");
            if (fallback && !img.dataset.fallbackTried) {
              img.dataset.fallbackTried = "1";
              img.src = fallback;
            }
          },
          { once: true }
        );
      }
    );
  }

  return { PHOTOS, get, renderHtml, bindFallback };
})();
