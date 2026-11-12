/** ブラウザから turf-tools 等の別オリジンで orchard API を呼ぶとき用 */
export const PORTAL_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function corsJson(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(PORTAL_CORS_HEADERS)) {
    headers.set(key, value);
  }
  return Response.json(data, { ...init, headers });
}

export function corsOptions(): Response {
  return new Response(null, { status: 204, headers: PORTAL_CORS_HEADERS });
}
