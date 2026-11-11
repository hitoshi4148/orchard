/** docs/orchard-disease-models との対応 */
export function orchardDiseaseModelDocPath(diseaseId: string): string {
  return `docs/orchard-disease-models/${diseaseId.replace(":", "-")}.md`;
}
