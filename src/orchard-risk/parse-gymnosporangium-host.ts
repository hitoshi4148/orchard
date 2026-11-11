/** なし赤星 — 中間宿主（ビャクシン類）の圃場近傍有無 */

export function parseGymnosporangiumHostNearby(
  value: string | null | undefined
): boolean | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed === "1" || trimmed === "true" || trimmed === "yes") {
    return true;
  }
  if (trimmed === "0" || trimmed === "false" || trimmed === "no") {
    return false;
  }
  return null;
}
