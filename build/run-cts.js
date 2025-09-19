import fs from 'node:fs';
import util from 'node:util';

import {execute} from './execute.js';
import {
  prependPathIfItExists,
} from './utils.js';
import {
  kDepotToolsPath,
  kDawnPath,
  kOutDir,
  kBuildPath,
} from './constants.js';

prependPathIfItExists(kDepotToolsPath);

function showHelp(options) {
  const longest = Object.entries(options).reduce((max, [k]) => Math.max(max, k.length), 0);
  const help = `
Usage: node run cts [options] [query]

Options:
${Object.entries(options).map(([k, v]) => `${k.padEnd(longest)} : ${v.description ?? ''}`).join('\n')}
`;
  console.log(help);
}

function parseArgs(options) {
  try {
    const args = process.argv.slice(2);
    const { values, positionals } = util.parseArgs({ args, options });
    if (values.help) {
      showHelp(options);
      process.exit(0);
    }
    return { values, positionals };
  } catch (e) {
    console.error(e.message);
    showHelp(options);
    process.exit(1);
  }
}

async function main() {
  const kDefaultCTSPath = `${kDawnPath}/third_party/webgpu-cts`;
  const options = {
    help: { type: 'boolean', short: 'h', description: 'show this help' },
    cts: { type: 'string', description: 'path to CTS', default: kDefaultCTSPath},
  }
  const { values, positionals } = parseArgs(options);
  const ctsPath = values.cts;
  const ctsQuery = positionals[0] ?? 'webgpu:*';

  // hack around the fact that run-cts modifies the listing file (T_T)
  // This isn't perfect because Ctrl-C fails to stop run-cts (-_-;)
  const listingFilename = `${ctsPath}/src/webgpu/listing_meta.json`;
  const listing = fs.readFileSync(listingFilename, {encoding: 'utf-8'});

  try {
    process.chdir(`${kDawnPath}/third_party/webgpu-cts`);
    await execute('npm', ['ci']);
    fs.writeFileSync(`${kOutDir}/package.json`, JSON.stringify({
      name: "placeholder",
      version: "1.0.0",
    }));
    process.chdir(kDawnPath);
    await execute('vpython3', ['tools/run.py', 'run-cts', `--cts=${ctsPath}`,`--bin=${kBuildPath}`, ctsQuery]);
  } finally {
    fs.writeFileSync(listingFilename, listing);
  }
}

main();
