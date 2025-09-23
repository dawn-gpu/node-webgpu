import child_process from 'node:child_process';

import {execute} from './execute.js';
import {isMac} from './constants.js';

async function main() {
  if (isMac) {
    const result = child_process.execFileSync('xattr', ['-l', 'dist/darwin-universal.dawn.node']);
    if (!result.toString().includes('com.apple.quarantine')) {
      return;
    }

    // The user has already indicated they trust this by installing it,
    // This executable can not do anything a JavaScript node script couldn't also do.
    await execute('xattr', ['-d', 'com.apple.quarantine', 'dist/darwin-universal.dawn.node']);
  }
}

main();
