import { execSync } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../');

function sh(cmd: string, cwd = ROOT) {
    console.log(`root: ${cwd}`);
  return execSync(cmd, { cwd, stdio: 'inherit' });
}

export function dcUpTargets() {
  sh('docker compose up --build -d target_1 target_2');
}

export function dcUpSplitter() {
  sh('docker compose up -d splitter');
}

export function dcUpAgent() {
  sh('docker compose up -d agent');
}

export function dcDown() {
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
