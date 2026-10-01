import "dotenv/config";
import { runChecks } from "../lib/checks";

const POLL_INTERVAL_MS = 60_000;

async function main() {
  console.log(`Reminder worker started. Polling every ${POLL_INTERVAL_MS / 1000}s.`);

  // Run once immediately on startup rather than waiting for the first tick.
  await runChecks();

  setInterval(() => {
    runChecks().catch((error) => console.error("Check run failed:", error));
  }, POLL_INTERVAL_MS);
}

main().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});
