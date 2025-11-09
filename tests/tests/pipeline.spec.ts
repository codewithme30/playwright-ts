import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { dcUpTargets, dcUpSplitter, dcUpAgent, dcDown, waitForContainerExit } from '../utils/docker';
import { waitForFilesStable } from '../utils/common';

const APP_DIR = path.resolve(__dirname, '../../app');
const APP_DIR_T1 = path.resolve(__dirname, '../../app_t1');
const APP_DIR_T2 = path.resolve(__dirname, '../../app_t2');

const INPUT_FILE  = path.join(APP_DIR, 'agent/inputs',   'large_1M_events.log');   
const TARGET1_OUT = path.join(APP_DIR_T1, 'events.log');  
const TARGET2_OUT = path.join(APP_DIR_T2, 'events.log');  

function exists(p: string) { return fs.existsSync(p); }
function read(p: string) { return fs.readFileSync(p, 'utf-8'); }
function norm(s: string) { return s.replace(/\r\n/g, '\n'); }
function toRecords(s: string): string[] {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

async function waitForFile(p: string, ms = 20_000) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const t = setInterval(() => {
      if (fs.existsSync(p)) { clearInterval(t); resolve(); }
      else if (Date.now() - start > ms) { clearInterval(t); reject(new Error(`Timeout waiting for: ${p}`)); }
    }, 250);
  });
}

test.describe('Validate data pipeline', () => {
  test.describe.configure({ mode: 'default' });
  let t1_records:string[] = [];
  let t2_records:string[] = [];
  let input_records:string[] = [];
  let target_records:string[] = [];
  
  test.beforeAll(async () => {
    
    if (!exists(path.join(APP_DIR, 'app.js'))) {
      test.skip(true, 'app is missing — place the provided app in ./app/');
    }
    [TARGET1_OUT, TARGET2_OUT].forEach(f => { if (exists(f)) fs.unlinkSync(f); });

    if (!exists(INPUT_FILE)) {
      test.skip(true, `Expected input file not found: ${INPUT_FILE}`);
    }

    dcUpTargets();
    dcUpSplitter();
    dcUpAgent();
    
    await waitForContainerExit('agent', 600_000);
    //await waitForContainerExit('splitter', 600_000);

    await waitForFile(TARGET1_OUT, 70_000);
    await waitForFile(TARGET2_OUT, 70_000);
    await waitForFilesStable([TARGET1_OUT, TARGET2_OUT]); 

    console.log("Starting to read files.");

    const t1 = read(TARGET1_OUT);
    const t2 = read(TARGET2_OUT);
    const input = read(INPUT_FILE);
    t1_records = toRecords(t1);
    t2_records = toRecords(t2);
    
    input_records = toRecords(input);
    target_records = t1_records.concat(t2_records);
  });

  test.afterAll(() => {
    dcDown();
  });

  /*
  Ensures that the combined records from target_1 and target_2
  exactly match the number of records in the input file.
  This catches data loss or extra records at a high level.
  */
  test('validate input file record count matches with target_1 and target_2 record count.', async() =>{
    console.log(`Input records: ${input_records.length}, Target_1 + Target_2 records: ${target_records.length}`);
    expect(target_records.length, 'Target files records count should match input').toBe(input_records.length);
  })

  /* 
  Ensures output files exist and are non-empty
  */
  test('verify event logs are generated and record count is greater than zero.', async () =>{
    console.log(`t1_records: ${t1_records.length}, t2_records: ${t2_records.length}`);
    expect(t1_records.length, 'Target1 record count should be greater than 0').toBeGreaterThan(0);
    expect(t2_records.length, 'Target2 record count should be greater than 0').toBeGreaterThan(0);
  });  


  /* 
  Validate  missing or duplicat records
  across both targets (t1 and t2) relative to the input file.
  */
  test('verify if there are any missing, duplicate records', async() =>{

    const frequency = new Map<string, number>();

    for(const rec of input_records) {
      frequency.set(rec, (frequency.get(rec) || 0) + 1);
    }

    for(const rec of t1_records) {
      const count = frequency.get(rec);

      if (!count) {
        console.log(`Target_1 - Invalid record or duplicate record found: '${rec}'`);
      } else if (count === 1) {
        frequency.delete(rec);
      } else {
        frequency.set(rec, count-1);
      }
    }

    for(const rec of t2_records) {
      const count = frequency.get(rec);

      if (!count) {
        console.log(`Target_2 - Invalid record or duplicate record found: '${rec}'`);
      } else if (count === 1) {
        frequency.delete(rec);
      } else {
        frequency.set(rec, count-1);
      }
    }

    console.log('List of records that are present in input file but missing target locations:\n', Array.from(frequency.keys()));
    expect(frequency.size, 'frequency map should be empty.').toBe(0);
  });
});
