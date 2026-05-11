/**
 * Vercel Cron — billing tick.
 *
 * Runs every 60 seconds (configured in vercel.json). Replaces the in-process
 * `setInterval` timer that can't survive on Vercel's serverless runtime.
 *
 * Each tick:
 *   1. Sweeps active readings whose `lastHeartbeat` is older than the
 *      120-second grace window → marks them `missed` and finalizes billing.
 *   2. Charges every still-active reading one minute, splits 70/30 between
 *      reader and platform, and ends the session if the client's balance
 *      can't cover the next minute (atomic per-reading transaction).
 *
 * Secured by `CRON_SECRET` — Vercel sets `Authorization: Bearer <secret>`
 * on cron invocations. Requests without the matching header are 401'd so
 * the endpoint can't be used to externally trigger arbitrary billing ticks.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { billingService } = require('../../server/dist/src/services/billing-service.js');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${expected}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  try {
    const result = await billingService.runTick();
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'tick failed';
    console.error('[cron/billing-tick] failed', err);
    res.status(500).json({ ok: false, error: message });
  }
}
