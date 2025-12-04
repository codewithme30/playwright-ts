import { dcUpTargets, dcUpSplitter, dcUpAgent, dcDown, waitForContainerExit } from '../utils/docker';
import {exists} from "../utils/common";
import path from "path";
import {test} from "@playwright/test";
import fs from "fs";
import targets from "../targets.json";

const APP_DIR = path.resolve(__dirname, '../../app');
const INPUT_FILE  = path.join(APP_DIR, 'agent/inputs',   'large_1M_events.log');


export default async function () {
    for(const target of targets) {
        console.log(`${target.name} : ${target.output_path}`)
        fs.rmSync(`${target.output_path}`, {force: true});
    }

    if (!exists(path.join(APP_DIR, 'app.js'))) {
        test.skip(true, 'app is missing — place the provided app in ./app/');
    }

    if (!exists(INPUT_FILE)) {
        test.skip(true, `Expected input file not found: ${INPUT_FILE}`);
    }
    dcUpTargets();
    dcUpSplitter();
    dcUpAgent();
}