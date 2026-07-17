import cron from "node-cron";
import { logger } from "../lib/logger";
import { checkLinkHealth } from "./linkChecker";

export function startCronJobs(): void {
  cron.schedule("0 3 * * *", async () => {
    logger.info("Cron: starting daily tasks");
    await checkLinkHealth();
  });
  logger.info("Cron jobs registered (link checker: daily at 3 AM)");
}
