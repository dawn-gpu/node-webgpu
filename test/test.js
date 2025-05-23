import fs from 'node:fs';
import { execute } from '../build/execute.js';

Promise.withResolvers = Promise.withResolvers ?? function() {
  const o = {};
  o.promise = new Promise((resolve, reject) => {
    Object.assign(o, { resolve, reject } );
  });
  return o;
};

const cwd = process.cwd();

await execute('node', ['--expose-gc', 'test/functional-tests.js']);

const tsTestsDir = 'test/ts-tests';
const tests = fs.readdirSync(tsTestsDir, { withFileTypes: true })
  .filter(t => t.isDirectory())
  .map(t => `${tsTestsDir}/${t.name}`);

for (const test of tests) {
  console.log('testing:', test);
  process.chdir(test);
  fs.rmSync('node_modules', { recursive: true, force: true });
  await execute('npm', ['i', '--no-package-lock']);
  await execute('npm', ['test']);
  process.chdir(cwd);
}

