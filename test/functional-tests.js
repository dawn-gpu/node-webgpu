import { create, globals } from '../index.js';

Object.assign(globalThis, globals);
globalThis.navigator = { gpu: create([]) };

Promise.withResolvers = Promise.withResolvers ?? function() {
  const o = {};
  o.promise = new Promise((resolve, reject) => {
    Object.assign(o, { resolve, reject } );
  });
  return o;
};

await import('./tests/basic-tests.js');
//await import('./tests/reference-count-tests.js');
