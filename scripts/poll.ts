/**
 * Runs the presence poll on a loop, for local development.
 * In production, point a scheduler at POST /api/cron/poll instead.
 *
 *   npm run poll
 */
import { pollPresence } from "../lib/presence";

const INTERVAL_MS = 60_000;

async function tick() {
  try {
    const result = await pollPresence();
    if (result.opened.length || result.closed.length) {
      console.log(
        new Date().toISOString(),
        `checked ${result.checked}`,
        result.opened.length ? `live: ${result.opened.join(", ")}` : "",
        result.closed.length ? `ended: ${result.closed.join(", ")}` : "",
      );
    }
  } catch (error) {
    console.error("poll failed", error);
  }
}

console.log(`Polling presence every ${INTERVAL_MS / 1000}s. Ctrl-C to stop.`);
void tick();
setInterval(tick, INTERVAL_MS);
