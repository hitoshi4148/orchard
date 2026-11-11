/** 生育ステージだけ変えた API 差分を表示（本番 URL またはローカル） */
const base =
  process.env.ORCHARD_API_BASE ??
  "https://orchard-aa7.pages.dev/portal/api/orchard-risk";

const lat = process.env.LAT ?? "36.391";
const lon = process.env.LON ?? "139.0608";

async function fetchJson(crop, growthStage) {
  const variety =
    crop === "grape" ? "シャインマスカット" : crop === "peach" ? "川中島白桃" : "ふじ";
  const params = new URLSearchParams({
    lat,
    lon,
    crop,
    variety,
    growth_stage: growthStage,
    marssonina_onset: "0",
  });
  const url = `${base}?${params}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return { growthStage, forecast: json.forecast };
}

function stageSnippet(rationale) {
  const m = rationale?.match(/生育\s+\S+\s+×[0-9.]+/);
  return m?.[0] ?? "(生育行なし)";
}

function printCrop(crop, diseaseIds, labels) {
  return (async () => {
    const a = await fetchJson(crop, "bloom");
    const b = await fetchJson(crop, "youngfruit");
    console.log(`\n## ${crop} @ ${lat},${lon}`);
    console.log(`forecast.growthStageId: bloom=${a.forecast.growthStageId}  youngfruit=${b.forecast.growthStageId}`);
    for (let i = 0; i < diseaseIds.length; i += 1) {
      const id = diseaseIds[i];
      const name = labels[i];
      const levA = a.forecast.infectionByDiseaseId[id]?.[0];
      const levB = b.forecast.infectionByDiseaseId[id]?.[0];
      const ratA = a.forecast.rationales[id] ?? "";
      const ratB = b.forecast.rationales[id] ?? "";
      const pctA = ratA.match(/—\s*(\d+)%/)?.[1] ?? "?";
      const pctB = ratB.match(/—\s*(\d+)%/)?.[1] ?? "?";
      console.log(`\n${name} (${id})`);
      console.log(`  本日レベル:  bloom=${levA}  youngfruit=${levB}  ${levA === levB ? "(レベル同じ)" : "(レベル変化)"}`);
      console.log(`  ％（根拠末尾）: bloom=${pctA}%  youngfruit=${pctB}%`);
      console.log(`  生育行: bloom → ${stageSnippet(ratA)}`);
      console.log(`        youngfruit → ${stageSnippet(ratB)}`);
    }
  })();
}

await printCrop(
  "grape",
  ["grape:gray_mold", "grape:black_rot"],
  ["灰色かび", "黒とう"]
);
await printCrop("peach", ["peach:scab"], ["黒星"]);

console.log("\nOK: growth_stage が rationales の「生育 … ×…」に出ていれば API は効いています。");
