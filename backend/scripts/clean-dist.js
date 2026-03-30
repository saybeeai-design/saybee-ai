const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const distPath = path.resolve(__dirname, '..', 'dist');

const unlockPath = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  const stats = fs.lstatSync(targetPath);

  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath)) {
      unlockPath(path.join(targetPath, entry));
    }

    fs.chmodSync(targetPath, 0o777);
    return;
  }

  fs.chmodSync(targetPath, 0o666);
};

unlockPath(distPath);
let cleaned = false;

try {
  fs.rmSync(distPath, { recursive: true, force: true });
  cleaned = true;
} catch (error) {
  try {
    if (process.platform === 'win32') {
      execFileSync(
        'powershell.exe',
        ['-NoProfile', '-Command', `Remove-Item -LiteralPath '${distPath}' -Recurse -Force -ErrorAction Stop`],
        { stdio: 'ignore' }
      );
    } else {
      execFileSync('rm', ['-rf', distPath], { stdio: 'ignore' });
    }

    cleaned = true;
  } catch {
    console.warn(`[build] Could not fully clean ${distPath}; continuing with overwrite build.`);
  }
}

if (cleaned) {
  console.log(`[build] Cleaned ${distPath}`);
}
