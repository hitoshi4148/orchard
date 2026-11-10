/**
 * @deprecated 栽培方式は各リスク画面の model で定義してください（POME / ぶどう / もも）。
 * 互換用に残しています。新規コードからは参照しないでください。
 */
const OrchardCultivationOptions = [
  { id: "open", label: "露地栽培" },
  { id: "house", label: "ハウス栽培" },
];

function orchardCultivationLabel(id) {
  const found = OrchardCultivationOptions.find((c) => c.id === id);
  return found?.label ?? "未指定";
}
