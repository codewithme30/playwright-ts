import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from "node:fs";

const ROOT = path.resolve(__dirname, '../../');

function sh(cmd: string, cwd = ROOT) {
    console.log(`root: ${cwd} cmd: ${cmd}`);
  return execSync(cmd, { cwd, encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"] });
}

export function dcUpTargets() {
    fs.writeFileSync('./docker_logs/docker-targets.log',
        sh('docker compose up --build -d target_1 target_2 target_3'));
}

export function dcUpSplitter() {
    console.log(`docker up splitter`)
  sh('docker compose up -d splitter');
}

export function dcUpAgent() {
    console.log(`docker up agent`)
  sh('docker compose up -d agent');
}

export function dcDown() {
    // captureLogs(['agent', 'splitter', 'target_1', 'target_2', 'target_3']);
  try { sh('docker compose down -v'); } catch {}
}

export async function waitForContainerExit(
  containerName: string,
  timeoutMs = 600_000 
): Promise<void> {
  const start = Date.now();

  while (true) {
    try {
      const out = execSync(
        `docker inspect -f "{{.State.Running}}" ${containerName}`,
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString().trim();
      
      if (out === 'false') {
        return;
      }
    } catch (err) {
        return;
    }

    await new Promise(res => setTimeout(res, 1000)); 
  }
}

export async function captureLogs(dockers: string[]) {
    const LOG_DIR = path.join(process.cwd(), 'docker_logs');

    if(!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    for(const docker of dockers) {
        const output = execSync(`docker logs ${docker}`, { encoding: 'utf-8' });
        const logFile = path.join(LOG_DIR, `${docker}.log`);
        fs.writeFileSync(logFile, output);
    }
}