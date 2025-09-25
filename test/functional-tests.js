import { isWin } from '../build/constants.js';

Promise.withResolvers = Promise.withResolvers ?? function() {
  const o = {};
  o.promise = new Promise((resolve, reject) => {
    Object.assign(o, { resolve, reject } );
  });
  return o;
};

if (isWin || isMac) {
  await import('./tests/basic-tests.js');
  //await import('./tests/reference-count-tests.js');
}
