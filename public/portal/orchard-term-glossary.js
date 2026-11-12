/**
 * 病害リスク UI — 専門用語のホバー説明（りんご・なし・ぶどう・もも共通）
 */
const OrchardTermGlossary = (() => {
  /** 長い語句から順にマッチ（部分重複を避ける） */
  const ENTRIES = [
    [
      "升孢子枯渇プール",
      "りんご黒星の升孢子が、雨のたびに葉から飛び出したあと「あとどれくらい残っているか」の目安。雨が多いほど減ります。",
    ],
    [
      "升孢子プール",
      "春に葉に残っている升孢子の量の目安。前年末の落葉の病斑の多さ（設定）で初期値が変わります。",
    ],
    [
      "升孢子簡易季節窓",
      "升孢子が出やすいおおよその時期です。緯度・生育ステージ・暦日から見た目安で、厳密な地区暦ではありません。",
    ],
    [
      "分生胞子",
      "夏以降、黒星の病斑から出る胞子。雨や霧で広がり、葉や果を再度感染させます。",
    ],
    [
      "升孢子",
      "りんご黒星の原因菌が春に葉の落葉残りなどから飛び出す胞子。雨で着果し、新しい葉や果を感染させます。",
    ],
    [
      "枯渇プール",
      "升孢子が季の中に飛び終えて、感染の元が少なくなった状態の目安です。",
    ],
    [
      "簡易季節窓",
      "その病害を見るおおよその時期の目安（全国向けの簡易カレンダー）です。",
    ],
    ["季節窓", "その病害の監視対象となるおおよその時期です。"],
    [
      "Mills 法",
      "葉面が濡れ続ける時間と気温から、黒星に感染しやすいかを判断する研究の定式です。",
    ],
    ["Mills", "黒星病の感染判定に使う「濡れ時間と気温」の研究ルール（Mills 法）の略称です。"],
    [
      "葉面濡れ",
      "葉の表面が水で濡れている時間の推定値です（雨・露・高湿）。予報から計算しており、実測の計器値ではありません。",
    ],
    [
      "冠内",
      "わい化棚などの、枝葉が密集した「棚の内側」の空間。湿気がこもりやすく、病害が発生しやすくなります。",
    ],
    ["冠上", "わい化棚などの、枝葉の上（天幕の内側）。雨よけ栽培では外の雨とは異なる湿り方になります。"],
    [
      "GDD",
      "積算温度（日々の気温を足し上げたもの）。芽の動きや、感染から発病までの目安に使います。",
    ],
    ["積算温度", "一定の基準温度を超えた分の気温を日ごとに足し合わせたもの（発育・発病の目安）。"],
    [
      "潜伏期",
      "病菌が付着してから、目に見える病斑などが出るまでのおおよその期間です。",
    ],
    [
      "感染危険",
      "その日の天気で「新しく病菌が付着・侵入しやすい」かの目安。すでに発病しているかどうかとは別です。",
    ],
    [
      "発病予測",
      "感染のピーク日と潜伏期から「いつ頃症状が出やすいか」の目安を示したものです。",
    ],
    ["一次感染", "その年最初の、升孢子などによる感染。"],
    ["二次感染", "病斑や果実の表面から広がる、2回目以降の感染。"],
    [
      "緑期",
      "休眠芽の先端が緑色に見え始める時期。黒星の升孢子監視の起点の目安になります。",
    ],
    [
      "MET Norway",
      "ノルウェー気象局の数値予報。今後数日の雨・気温・風のデータに使っています。",
    ],
    [
      "NASA POWER",
      "NASA の無料気象データ。過去の雨・気温などの履歴や、積算温度の計算に使います。",
    ],
    ["時別", "1時間ごとの気象データのことです。"],
    ["日次", "1日単位にまとめた気象データのことです。"],
    [
      "ウジボケ",
      "りんご黒星病の原因菌の日本語名です（学名 Venturia inaequalis）。",
    ],
    [
      "ビャクシン",
      "なし赤星病の原因菌が越冬する針葉樹（ヒノキ・スギなど近縁）の総称。近くにあると赤星のリスクが上がる目安になります。",
    ],
    [
      "雨よけ栽培",
      "ハウスやビニールで雨を遮る栽培。葉面の濡れが減る想定で、感染危険の計算だけ簡易補正します。",
    ],
    [
      "感染係数",
      "品種や前年の発生状況などで、表示の感染レベルを少し上げ下げする掛け目です。",
    ],
    [
      "簡易モデル",
      "研究機関の本格的な予測システムではなく、気象から「注意度」を出す簡略化した計算です。",
    ],
    [
      "P2",
      "文献などに基づいた感染評価の手順名（病害ごとに定義が異なります）。",
    ],
    ["降菌", "空気中の胞子などが風や雨で果樹に付着することです。"],
    ["濡れ継続", "葉や果の表面が乾かず、水膜や高湿が続く状態のことです。"],
    ["高湿", "空気中の水蒸気が多く、葉面が濡れやすい状態です。"],
    ["発病", "感染の結果として、病斑などの症状が目に見え始めることです。"],
    ["感染", "病原体が枝・葉・果に付着し、組織へ侵入することです。"],
  ].sort((a, b) => b[0].length - a[0].length);

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }

  const ORCHARD_TERM_BLOCK_RE =
    /<span class="orchard-term"[^>]*>[\s\S]*?<\/span>/g;

  /** 既に包んだ用語の内部（説明文）には二度とマッチさせない */
  function shieldWrappedTerms(html) {
    const slots = [];
    const shielded = html.replace(ORCHARD_TERM_BLOCK_RE, (block) => {
      const id = slots.length;
      slots.push(block);
      return `\uE000${id}\uE001`;
    });
    return { shielded, slots };
  }

  function restoreWrappedTerms(html, slots) {
    return html.replace(/\uE000(\d+)\uE001/g, (_, index) => slots[Number(index)] ?? "");
  }

  function wrapTerm(match, tip) {
    return `<span class="orchard-term" tabindex="0"><span class="orchard-term-label">${match}</span><span class="orchard-term-tip" role="tooltip">${escapeHtml(tip)}</span></span>`;
  }

  function enrich(plainText) {
    let out = escapeHtml(plainText);
    for (const [term, tip] of ENTRIES) {
      const escapedTerm = escapeHtml(term);
      const { shielded, slots } = shieldWrappedTerms(out);
      if (!shielded.includes(escapedTerm)) {
        continue;
      }
      const re = new RegExp(escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const next = shielded.replace(re, (match) => wrapTerm(match, tip));
      out = restoreWrappedTerms(next, slots);
    }
    return out;
  }

  return { enrich, ENTRIES };
})();
