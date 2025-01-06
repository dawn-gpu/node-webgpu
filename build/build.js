import path from 'path';
import fs from 'fs';

import {execute} from './execute.js';
import {addElemIf, appendPathIfItExists, prependPathIfItExists} from './utils.js';
    
//const __dirname = dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd(); 
const depotToolsPath = path.join(cwd, 'third_party', 'depot_tools');
const dawnPath = `${cwd}/third_party/dawn`;
const buildPath = `${dawnPath}/out/cmake-release`

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

prependPathIfItExists(depotToolsPath);
appendPathIfItExists('/Applications/CMake.app/Contents/bin');
appendPathIfItExists('C:\\Program Files\\CMake\\bin');

async function buildDawnNode() {
  try {
    process.env.DEPOT_TOOLS_WIN_TOOLCHAIN = '0'
    process.chdir('third_party/dawn');
    fs.copyFileSync('scripts/standalone-with-node.gclient', '.gclient');
    await execute('gclient', ['metrics', '--opt-out']);
    await execute('gclient', ['sync']);
    fs.mkdirSync('out/cmake-release', {recursive: true});
    process.chdir('out/cmake-release');

    await execute('cmake', [
      dawnPath,
      ...addElemIf(!isWin, '-GNinja'),
      '-DDAWN_BUILD_NODE_BINDINGS=1',
      '-DDAWN_USE_X11=OFF',
      '-DCMAKE_BUILD_TYPE=Release',
      ...addElemIf(isWin, '-DCMAKE_SYSTEM_VERSION=10.0.26100.0'),
      ...addElemIf(isMac, '-DCMAKE_OSX_SYSROOT=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk'),
    ]);
    if (isWin) {
      await execute('cmake', ['--build', '.', '--target', 'dawn_node'])
    } else {
      await execute('ninja', ['dawn.node']);
    }
  } finally {
    process.chdir(cwd);
  }
}

async function copyResult(filepath, target) {
  const srcFilename = path.join(...[filepath, ...addElemIf(isWin, 'Debug'), 'dawn.node']);
  const dstFilename = path.join('dist', `${target}.dawn.node`);
  fs.mkdirSync(path.dirname(dstFilename), {recursive: true});
  fs.copyFileSync(srcFilename, dstFilename);
  return dstFilename;
}

async function main() {
  try {
    const target = `${process.platform}-${process.arch}`;
    console.log('building for:', target);
    await execute('git', ['submodule', 'update', '--init']);
    await buildDawnNode();
    const packageName = await copyResult(buildPath, target);
    console.log('created:', packageName);
  } catch (e) {
    console.error(e);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
