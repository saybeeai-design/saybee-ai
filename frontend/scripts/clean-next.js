const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const isWindows = os.platform() === "win32";
const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 500;

const cleanupTargets = [
  ".next",
  ".next-prod",
  "build-output",
  ".eslintcache",
  "tsconfig.tsbuildinfo",
  path.join("node_modules", ".cache"),
].map((target) => path.join(projectRoot, target));

const staleManifestTargets = [
  path.join(".next", "app-path-routes-manifest.json"),
  path.join(".next", "build-manifest.json"),
  path.join(".next", "server"),
].map((target) => path.join(projectRoot, target));

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function log(message) {
  console.log(`[clean-next] ${message}`);
}

function warn(message) {
  console.warn(`[clean-next] ${message}`);
}

function runPowerShell(command) {
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();
}

function parseJsonList(output) {
  if (!output) {
    return [];
  }

  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function getWindowsNodeProcesses() {
  if (!isWindows) {
    return [];
  }

  try {
    const output = runPowerShell(
      "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" " +
        "| Select-Object ProcessId,ParentProcessId,CommandLine " +
        "| ConvertTo-Json -Compress"
    );

    return parseJsonList(output).map((processInfo) => ({
      pid: Number(processInfo.ProcessId),
      parentPid: Number(processInfo.ParentProcessId),
      commandLine: processInfo.CommandLine || "",
    }));
  } catch (error) {
    warn(`Could not inspect node.exe processes: ${error.message}`);
    return [];
  }
}

function getCurrentProcessTreePids(processes) {
  const byPid = new Map(processes.map((processInfo) => [processInfo.pid, processInfo]));
  const protectedPids = new Set([process.pid]);
  let current = byPid.get(process.pid);

  while (current && current.parentPid && !protectedPids.has(current.parentPid)) {
    protectedPids.add(current.parentPid);
    current = byPid.get(current.parentPid);
  }

  return protectedPids;
}

function isNextProcess(commandLine) {
  return (
    /(?:^|\s)(next|next\.js)(?:\s|$)/i.test(commandLine) ||
    /next[\\/]dist[\\/]bin[\\/]next/i.test(commandLine)
  );
}

function isDevOrBuildProcess(commandLine) {
  return (
    /\bnext\s+(dev|build)\b/i.test(commandLine) ||
    /\bnpm(?:\.cmd)?\s+run\s+(dev|build)\b/i.test(commandLine)
  );
}

async function stopWindowsNextProcesses() {
  if (!isWindows) {
    return;
  }

  const nodeProcesses = getWindowsNodeProcesses();
  const protectedPids = getCurrentProcessTreePids(nodeProcesses);
  const nextProcesses = nodeProcesses.filter(
    (processInfo) =>
      !protectedPids.has(processInfo.pid) &&
      isNextProcess(processInfo.commandLine) &&
      isDevOrBuildProcess(processInfo.commandLine)
  );

  if (nextProcesses.length === 0) {
    log("No stale Next.js dev/build node.exe processes found.");
    return;
  }

  warn("Found active Next.js dev/build processes. Stopping them before production build:");
  for (const processInfo of nextProcesses) {
    warn(`PID ${processInfo.pid}: ${processInfo.commandLine}`);
  }

  for (const processInfo of nextProcesses) {
    try {
      execFileSync("taskkill.exe", ["/F", "/PID", String(processInfo.pid), "/T"], {
        stdio: "pipe",
      });
      log(`Stopped Next.js process ${processInfo.pid}.`);
    } catch (error) {
      throw new Error(
        `Next.js process ${processInfo.pid} is still active. Close the dev server and rerun npm run build. ${error.message}`
      );
    }
  }

  await sleep(RETRY_DELAY_MS);
}

async function removeTarget(targetPath) {
  const label = path.relative(projectRoot, targetPath) || targetPath;

  if (!fs.existsSync(targetPath)) {
    return;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      fs.rmSync(targetPath, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: RETRY_DELAY_MS,
      });
      log(`Removed ${label}.`);
      return;
    } catch (error) {
      const locked = ["EPERM", "EBUSY", "ENOTEMPTY"].includes(error.code);
      if (attempt === MAX_ATTEMPTS || !locked) {
        throw new Error(
          `Could not remove ${label}. A Windows file lock may still be active. Close running Next.js/Node processes and retry. ${error.message}`
        );
      }

      warn(
        `Attempt ${attempt}/${MAX_ATTEMPTS} failed for ${label} (${error.code}). ` +
          `Retrying in ${RETRY_DELAY_MS}ms.`
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
}

async function cleanBuildArtifacts() {
  for (const target of staleManifestTargets) {
    await removeTarget(target);
  }

  for (const target of cleanupTargets) {
    await removeTarget(target);
  }
}

async function main() {
  log("Preparing a clean Next.js production build.");
  await stopWindowsNextProcesses();
  await cleanBuildArtifacts();
  log("Cleanup complete.");
}

main().catch((error) => {
  console.error(`[clean-next] ${error.message}`);
  process.exit(1);
});
