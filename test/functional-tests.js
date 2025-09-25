import { isMac, isWin } from '../build/constants.js';

Promise.withResolvers = Promise.withResolvers ?? function() {
  const o = {};
  o.promise = new Promise((resolve, reject) => {
    Object.assign(o, { resolve, reject } );
  });
  return o;
};

await import('./tests/basic-tests.js');
//await import('./tests/reference-count-tests.js');
