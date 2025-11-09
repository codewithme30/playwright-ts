import * as fs from 'fs';
import {test} from "@playwright/test";
import path from "path";

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

export function exists(p: string) { return fs.existsSync(p); }
export function read(p: string) { return fs.readFileSync(p, 'utf-8'); }
export function norm(s: string) { return s.replace(/\r\n/g, '\n'); }
export function toRecords(s: string): string[] {
    return s
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
}

export async function waitForFile(p: string, ms = 20_000) {
    const start = Date.now();
    return new Promise<void>((resolve, reject) => {
        const t = setInterval(() => {
            if (fs.existsSync(p)) { clearInterval(t); resolve(); }
            else if (Date.now() - start > ms) { clearInterval(t); reject(new Error(`Timeout waiting for: ${p}`)); }
        }, 250);
    });
}