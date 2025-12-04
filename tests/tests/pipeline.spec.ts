import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { dcUpTargets, dcUpSplitter, dcUpAgent, dcDown, waitForContainerExit } from '../utils/docker';
import { waitForFilesStable, exists, read, norm, toRecords, waitForFile, isValidRecord} from '../utils/common';
import {describe, before, after} from "node:test";
import * as readline from "node:readline";

const APP_DIR = path.resolve(__dirname, '../../app');
const APP_DIR_T1 = path.resolve(__dirname, '../../app_t1');
const APP_DIR_T2 = path.resolve(__dirname, '../../app_t2');
const APP_DIR_T3 = path.resolve(__dirname, '../../app_t3');

const INPUT_FILE  = path.join(APP_DIR, 'agent/inputs',   'large_1M_events.log');   
const TARGET1_OUT = path.join(APP_DIR_T1, 'events.log');  
const TARGET2_OUT = path.join(APP_DIR_T2, 'events.log');
const TARGET3_OUT = path.join(APP_DIR_T3, 'events.log');

test.describe('Validate data pipeline', () => {
  test.describe.configure({ mode: "parallel" });

  /*
  Ensures that the combined records from target_1 and target_2
  exactly match the number of records in the input file.
  This catches data loss or extra records at a high level.
  */
  test('validate input file record count matches with target_1, target_2 and target_3 record count.', async() =>{
      let t1_records:string[] = [];
      let t2_records:string[] = [];
      let t3_records:string[] = [];
      let input_records:string[] = [];
      let target_records:string[] = [];
      await waitForContainerExit('agent', 600_000);
      //await waitForContainerExit('splitter', 600_000);

      await waitForFile(TARGET1_OUT, 70_000);
      await waitForFile(TARGET2_OUT, 70_000);
      await waitForFile(TARGET3_OUT, 70_000);
      await waitForFilesStable([TARGET1_OUT, TARGET2_OUT, TARGET3_OUT]);

      console.log("Starting to read files.");

      const t1 = read(TARGET1_OUT);
      const t2 = read(TARGET2_OUT);
      const t3 = read(TARGET3_OUT);
      const input = read(INPUT_FILE);
      t1_records = toRecords(t1);
      t2_records = toRecords(t2);
      t3_records = toRecords(t3);

      input_records = toRecords(input);
      target_records = t1_records.concat(t2_records).concat(t3_records);

      /*const invalid_input_records = input_records.filter(r => !isValidRecord(r));
      const invalid_target_records = target_records.filter(r => !isValidRecord(r));

      if(invalid_input_records.length > 0)
          console.log('Input file has records with invalid schema:', invalid_input_records);

      if(invalid_target_records.length > 0)
          console.log('target file has records with invalid schema:', invalid_target_records);  */

    console.log(`Input records: ${input_records.length}, Target_1 + Target_2 + Target_3 records: ${target_records.length}`);
    expect(target_records.length, 'Target files records count should match input').toBe(input_records.length);
  });

  /*
  Verifies both target nodes are actively receiving data
  Ensures output files exist and are non-empty
  */
  test('verify event logs are generated and record count is greater than zero.', async () =>{
      let t1_records:string[] = [];
      let t2_records:string[] = [];
      let t3_records:string[] = [];
      let input_records:string[] = [];
      let target_records:string[] = [];

      await waitForContainerExit('agent', 600_000);
      //await waitForContainerExit('splitter', 600_000);

      await waitForFile(TARGET1_OUT, 70_000);
      await waitForFile(TARGET2_OUT, 70_000);
      await waitForFile(TARGET3_OUT, 70_000);
      await waitForFilesStable([TARGET1_OUT, TARGET2_OUT, TARGET3_OUT]);

      console.log("Starting to read files.");

      const t1 = read(TARGET1_OUT);
      const t2 = read(TARGET2_OUT);
      const t3 = read(TARGET3_OUT);
      const input = read(INPUT_FILE);
      t1_records = toRecords(t1);
      t2_records = toRecords(t2);
      t3_records = toRecords(t3);

      input_records = toRecords(input);
      target_records = t1_records.concat(t2_records).concat(t3_records);

    console.log(`t1_records: ${t1_records.length}, t2_records: ${t2_records.length}, t3_records: ${t3_records.length}`);
    expect(t1_records.length, 'Target1 record count should be greater than 0').toBeGreaterThan(0);
    expect(t2_records.length, 'Target2 record count should be greater than 0').toBeGreaterThan(0);
    expect(t3_records.length, 'Target3 record count should be greater than 0').toBeGreaterThan(0);
  });

  /*
  Verifies full data integrity at content level:
  Detects missing and duplicate or invalid records across both targets (t1 and t2) relative to the input file.
  */
  test('verify if there are any missing, duplicate records', async() =>{
      let t1_records:string[] = [];
      let t2_records:string[] = [];
      let t3_records:string[] = [];
      let input_records:string[] = [];
      let target_records:string[] = [];

      await waitForContainerExit('agent', 600_000);
      //await waitForContainerExit('splitter', 600_000);

      await waitForFile(TARGET1_OUT, 70_000);
      await waitForFile(TARGET2_OUT, 70_000);
      await waitForFile(TARGET3_OUT, 70_000);
      await waitForFilesStable([TARGET1_OUT, TARGET2_OUT, TARGET3_OUT]);

      console.log("Starting to read files.");

      const t1 = read(TARGET1_OUT);
      const t2 = read(TARGET2_OUT);
      const t3 = read(TARGET3_OUT);
      const input = read(INPUT_FILE);
      t1_records = toRecords(t1);
      t2_records = toRecords(t2);
      t3_records = toRecords(t3);

      input_records = toRecords(input);
      target_records = t1_records.concat(t2_records).concat(t3_records);

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

      for(const rec of t3_records) {
          const count = frequency.get(rec);

          if (!count) {
              console.log(`Target_3 - Invalid record or duplicate record found: '${rec}'`);
          } else if (count === 1) {
              frequency.delete(rec);
          } else {
              frequency.set(rec, count-1);
          }
      }

    console.log('List of records that are present in input file but missing target locations:\n', Array.from(frequency.keys()));
    expect(frequency.size, 'frequency map should be empty.').toBe(0);
  });

  test('Schema validation', async() =>{

      let t1_records:string[] = [];
      let t2_records:string[] = [];
      let t3_records:string[] = [];
      let input_records:string[] = [];
      let target_records:string[] = [];

      await waitForContainerExit('agent', 600_000);
      //await waitForContainerExit('splitter', 600_000);

      await waitForFile(TARGET1_OUT, 70_000);
      await waitForFile(TARGET2_OUT, 70_000);
      await waitForFile(TARGET3_OUT, 70_000);
      await waitForFilesStable([TARGET1_OUT, TARGET2_OUT, TARGET3_OUT]);

      console.log("Starting to read files.");

      const t1 = read(TARGET1_OUT);
      const t2 = read(TARGET2_OUT);
      const t3 = read(TARGET3_OUT);
      const input = read(INPUT_FILE);
      t1_records = toRecords(t1);
      t2_records = toRecords(t2);
      t3_records = toRecords(t3);

      input_records = toRecords(input);
      target_records = t1_records.concat(t2_records).concat(t3_records);

      const INVALID_INPUT_SCHEMA = input_records.filter(r => !isValidRecord(r));
      if(INVALID_INPUT_SCHEMA.length > 0) {
          console.log('INPUT_FILE - Found records with invalid schema', INVALID_INPUT_SCHEMA);
      } else {
          console.log('All records from INPUT file follow valid schema');
      }

      const INVALID_TARGET_SCHEMA = target_records.filter(r => !isValidRecord(r));
      if(INVALID_TARGET_SCHEMA.length > 0) {
          test.step('Sample test step', async() =>{
          console.log('TARGET_FILE - Found records with invalid schema', INVALID_TARGET_SCHEMA);
          });
      } else {
          console.log('All records from TARGET_FILE follow valid schema');
      }
  });

  test('Read data using streams', async() => {

      let t1_records:string[] = [];
      let t2_records:string[] = [];
      let t3_records:string[] = [];
      let input_records:string[] = [];
      let target_records:string[] = [];

      await waitForContainerExit('agent', 600_000);
      //await waitForContainerExit('splitter', 600_000);

      await waitForFile(TARGET1_OUT, 70_000);
      await waitForFile(TARGET2_OUT, 70_000);
      await waitForFile(TARGET3_OUT, 70_000);
      await waitForFilesStable([TARGET1_OUT, TARGET2_OUT, TARGET3_OUT]);

      console.log("Starting to read files.");

      const t1 = read(TARGET1_OUT);
      const t2 = read(TARGET2_OUT);
      const t3 = read(TARGET3_OUT);
      const input = read(INPUT_FILE);
      t1_records = toRecords(t1);
      t2_records = toRecords(t2);
      t3_records = toRecords(t3);

      input_records = toRecords(input);
      target_records = t1_records.concat(t2_records).concat(t3_records);

      let rl = readline.createInterface({input: fs.createReadStream(INPUT_FILE)});
      let input_freq = new Map<string,number>();
      for await (const line of rl) {
          input_freq.set(line, (input_freq.get(line) || 0) + 1);
      }

      console.log('INPUT STREAM size: ', input_freq.size);

      rl = readline.createInterface({input: fs.createReadStream(TARGET1_OUT)});
      for await (const line of rl) {
          const count = input_freq.get(line);
          if (!count) {
              console.log('invalid record found in TARGET_1:', line);
          } else if (count === 1) {
              input_freq.delete(line);
          } else {
              input_freq.set(line, count-1);
          }
      }

      rl = readline.createInterface({input: fs.createReadStream(TARGET2_OUT)});
      for await (const line of rl) {
          const count = input_freq.get(line);
          if (!count) {
              console.log('invalid record found in TARGET_2:', line);
          } else if (count === 1) {
              input_freq.delete(line);
          } else {
              input_freq.set(line, count-1);
          }
      }

      rl = readline.createInterface({input: fs.createReadStream(TARGET3_OUT)});
      let target3_freq = new Map<string, number>();
      for await (const line of rl) {
          const count = input_freq.get(line);
          if (!count) {
              console.log('invalid record found in TARGET_3:', line);
          } else if (count === 1) {
              input_freq.delete(line);
          } else {
              input_freq.set(line, count-1);
          }
      }

      expect(input_freq.size, "input frequency map should be empty.").toBe(0);
  });

  test('read targets from JSON', async()=>{

      // await Promise.all(targets.map((t:any) => waitForFile(path.join(process.cwd(), t.output_path), 20_000)));

      // await Promise.all(targets.map((t:any) => console.log(fs.readFileSync(path.join(process.cwd(), t.output_path), "utf-8"))));
      test.step('test step:', async() => {
          const targets = JSON.parse(fs.readFileSync('targets.json', "utf-8"));
          await Promise.all(targets.map((t: { output_path: any; }) => console.log(t.output_path)));
      });


  })
});