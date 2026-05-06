const fs = require('fs');
const path = require('path');

const nextDirs = ['.next', '.next-prod', 'build-output'].map((dir) =>
  path.join(__dirname, '..', dir)
);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function removeNextDir() {
  for (const nextDir of nextDirs) {
    if (!fs.existsSync(nextDir)) {
      console.log(`[clean-next] No ${path.basename(nextDir)} directory found.`);
      continue;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
        console.log(`[clean-next] Removed ${path.basename(nextDir)} directory.`);
        break;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          console.warn(
            `[clean-next] Could not remove ${path.basename(nextDir)}. Continuing anyway.`,
            error
          );
          break;
        }

        console.warn(
          `[clean-next] Attempt ${attempt}/${MAX_ATTEMPTS} failed for ${path.basename(nextDir)}. Retrying in ${RETRY_DELAY_MS}ms.`,
          error
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
}

void removeNextDir();
