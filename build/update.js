import fs from 'node:fs';
import path from 'node:path';

import {execute} from './execute.js';
import {prependPathIfItExists} from './utils.js';

const cwd = process.cwd(); 
const depotToolsPath = path.join(cwd, 'third_party', 'depot_tools');
prependPathIfItExists(depotToolsPath);

async function main() {
  try {
    await execute('git', ['submodule', 'update', '--init']);

    process.chdir('third_party/depot_tools');
    await execute('git', ['pull', 'origin', 'main']);
    process.chdir(cwd);

    process.chdir('third_party/dawn');
    await execute('git', ['pull', 'origin', 'main']);
    fs.copyFileSync('scripts/standalone-with-node.gclient', '.gclient');
    await execute('gclient', ['sync', '-D']);
    process.chdir(cwd);

    // Stage the new submodule revisions. Otherwise the `git submodule update --init`
    // in build.js rewinds them to the revisions still recorded in the index and
    // you silently build the old dawn.
    await execute('git', ['add', 'third_party/dawn', 'third_party/depot_tools']);

    await execute('npm', ['install', '--save', '@webgpu/types@latest']);

   } catch (e) {
    console.error(e);
    console.error(e.stack);
    process.exit(1);
  }
}

main();