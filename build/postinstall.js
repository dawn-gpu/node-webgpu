import path from 'node:path';
import fs from 'node:fs';

import {execute} from './execute.js';
import {isMac} from './constants.js';

async function main() {
  if (isMac) {
    // The user has already indicated they trust this by installing it,
    // This executable can not do anything a JavaScript node script couldn't also do.
    await execute('xattr', ['-d', 'com.apple.quarantine', 'dist/darwin-universal.dawn.node']);
  }
}

main();
