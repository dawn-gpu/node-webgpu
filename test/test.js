import Mocha from 'mocha';

import { create, globals } from '../index.js';

Object.assign(globalThis, globals);
globalThis.navigator = { gpu: create([]) };

const mocha = new Mocha({});

mocha.addFile('./test/tests/basic-tests.js');

await mocha.loadFilesAsync();
mocha.run(failures => {
  process.exit(failures);
});
