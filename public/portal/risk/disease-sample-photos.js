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
      src: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Pear_hole_scab_2017_A1.jpg",
      alt: "日本なし黒星病の果実症状",
      caption: "果実に黒褐色の星状・かさぶた状の斑点ができます。",
      credit: "Fructibus",
      license: "CC0",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Pear_hole_scab_2017_A1.jpg",
    },
    "nashi:red_spot": {
      src: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Pear_hole_scab_2017_A2.jpg",
      alt: "日本なし果実の病斑",
      caption:
        "赤星病は葉に赤褐色の星状斑が典型です。写真はなし果実の病斑例（近い時期に葉を確認してください）。",
      credit: "Fructibus",
      license: "CC0",
      commonsPage: "https://commons.wikimedia.org/wiki/File:Pear_hole_scab_2017_A2.jpg",
    },
    "nashi:blotch": {
      src: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Pear_hole_scab_2017_A3.jpg",
      alt: "日本なし果実の輪状病斑",
      caption: "熟期前後の果面に輪状・同心円状の病斑が出ることがあります。",
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
  };

  function get(diseaseId) {
    return PHOTOS[diseaseId] ?? null;
  }

  return { PHOTOS, get };
})();
