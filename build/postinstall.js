import child_process from 'node:child_process';

import DEBUG from 'debug';

import {execute} from './execute.js';
import {isMac} from './constants.js';
import {exists} from './utils.js';

const debug = DEBUG('postinstall');

async function main() {
  if (isMac) {
    const dawnNode = 'dist/darwin-universal.dawn.node';
    const attribute = 'com.apple.quarantine'
    if (!exists(dawnNode)) {
      debug(`${dawnNode} does not exist`);
      return;
    }

    const result = child_process.execFileSync('xattr', ['-l', dawnNode], {encoding: 'utf8'});
    if (!result.includes(attribute)) {
      debug(`${dawnNode} does not have attribute: ${attribute}`);
      return;
    }

    // The user has already indicated they trust this by installing it,
    // This executable can not do anything a JavaScript node script couldn't also do.
    await execute('xattr', ['-d', attribute, dawnNode]);
    debug(`removed attribute: ${attribute}`);
  }
}

main();
