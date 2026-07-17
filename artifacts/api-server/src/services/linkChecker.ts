import { query } from "../db/pool";
import { logger } from "../lib/logger";

const CHECK_BATCH = 50;

export async function checkLinkHealth(): Promise<void> {
  logger.info("Link health check starting...");
  try {
    const sources = await query(
      `SELECT id, site_url FROM streaming_sources
       WHERE is_active = true
         AND (last_checked IS NULL OR last_checked < NOW() - INTERVAL '24 hours')
       LIMIT $1`,
      [CHECK_BATCH]
    );

    if (sources.rows.length === 0) {
      logger.info("No links to check");
      return;
    }

    let active = 0;
    let dead = 0;

    for (const source of sources.rows) {
      try {
        const res = await fetch(source.site_url, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          await query(
            `UPDATE streaming_sources SET is_active = true, last_checked = NOW(), last_verified = NOW() WHERE id = $1`,
            [source.id]
          );
          active++;
        } else {
          await query(
            `UPDATE streaming_sources SET is_active = false, last_checked = NOW() WHERE id = $1`,
            [source.id]
          );
          dead++;
        }
      } catch {
        await query(
          `UPDATE streaming_sources SET is_active = false, last_checked = NOW() WHERE id = $1`,
          [source.id]
        );
        dead++;
      }
    }

    logger.info({ checked: sources.rows.length, active, dead }, "Link health check complete");
  } catch (err) {
    logger.error({ err }, "Link health check failed");
  }
}
