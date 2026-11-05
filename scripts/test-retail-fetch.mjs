import { fetchRetailKajyuDataset } from "../src/maff-retail-kajyu/fetch.ts";

try {
  const d = await fetchRetailKajyuDataset();
  console.log("ok", d.latest.surveyLabel, d.history.length, d.latest.detail.apple);
} catch (e) {
  console.error("fail", e);
}
