export interface Env {
  REFRESH_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(runRefresh(env));
  },
};

async function runRefresh(env: Env): Promise<void> {
  const url = env.REFRESH_URL?.trim();
  const secret = env.CRON_SECRET?.trim();
  if (!url || !secret) {
    console.error("fruit-retail-cron: REFRESH_URL or CRON_SECRET not set");
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "User-Agent": "orchard-fruit-retail-cron/1.0",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`fruit-retail-cron: refresh failed (${res.status}) ${text}`);
    return;
  }
  console.log(`fruit-retail-cron: ${text}`);
}
