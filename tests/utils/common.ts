import * as fs from 'fs';

export async function waitForFilesStable(paths: string[], stableMs = 2000, timeoutMs = 30_000) {
  const start = Date.now();
  let lastSizes = paths.map(p => fs.existsSync(p) ? fs.statSync(p).size : 0);
  let lastChange = Date.now();

  while (true) {
    await new Promise(res => setTimeout(res, 500));

    const sizes = paths.map(p => fs.existsSync(p) ? fs.statSync(p).size : 0);
    const changed = sizes.some((s, i) => s !== lastSizes[i]);

    if (changed) {
      lastSizes = sizes;
      lastChange = Date.now();
    }

    if (Date.now() - lastChange >= stableMs) {      
      return;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Files did not stabilize within ${timeoutMs}ms`);
    }
  }
}