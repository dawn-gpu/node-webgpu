import path from 'node:path';
import fs from 'node:fs';

import {execute} from './execute.js';
import {addElemIf, appendPathIfItExists, exists, prependPathIfItExists} from './utils.js';

//const __dirname = dirname(fileURLToPath(import.meta.url));
const kCwd = process.cwd();
const kDepotToolsPath = path.join(kCwd, 'third_party', 'depot_tools');
const kDawnPath = `${kCwd}/third_party/dawn`;
const kOutDir = 'out/cmake-release';
const kBuildPath = `${kDawnPath}/${kOutDir}`
const kConfig = process.env.CMAKE_BUILD_TYPE ?? 'Release';

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

prependPathIfItExists(kDepotToolsPath);
appendPathIfItExists('/Applications/CMake.app/Contents/bin');
appendPathIfItExists('C:\\Program Files\\CMake\\bin');

async function processThenRestoreCWD(fn) {
  const cwd = process.cwd(); 
  try {
    await fn();
  } finally {
    process.chdir(cwd);
  }
}

async function compile() {
  await processThenRestoreCWD(async () => {
    process.chdir(kBuildPath);
    if (isWin) {
      await execute('cmake', ['--build', '.', '--target', 'dawn_node', '--config', kConfig]);
    } else {
      await execute('ninja', ['dawn.node']);
    }
  });
}

async function createProject() {
  await processThenRestoreCWD(async () => {
    process.env.DEPOT_TOOLS_WIN_TOOLCHAIN = '0'
    process.chdir(kDawnPath);
    fs.copyFileSync('scripts/standalone-with-node.gclient', '.gclient');
    await execute('gclient', ['metrics', '--opt-out']);
    await execute('gclient', ['sync']);
    if (exists(kOutDir)) {
      fs.rmSync(kOutDir, {recursive: true});
    }
    fs.mkdirSync(kOutDir, {recursive: true});
    process.chdir(kOutDir);

    await execute('cmake', [
      kDawnPath,
      ...addElemIf(!isWin, '-GNinja'),
      '-DDAWN_BUILD_NODE_BINDINGS=1',
      '-DDAWN_USE_X11=OFF',
      `-DCMAKE_BUILD_TYPE=${kConfig}`,
      ...addElemIf(isWin, '-DCMAKE_SYSTEM_VERSION=10.0.26100.0'),
      ...addElemIf(isMac, '-DCMAKE_OSX_SYSROOT=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk'),
    ]);
  });
}

async function copyResult(filepath, target) {
  const srcFilename = path.join(...[filepath, ...addElemIf(isWin, kConfig), 'dawn.node']);
  const dstFilename = path.join('dist', `${target}.dawn.node`);
  fs.mkdirSync(path.dirname(dstFilename), {recursive: true});
  fs.copyFileSync(srcFilename, dstFilename);
  return dstFilename;
}

async function main() {
  const compileOnly = process.argv[2] === '--compile-only';
  try {
    const target = `${process.platform}-${process.arch}`;
    console.log('building for:', target);
    if (!compileOnly) {
      await execute('git', ['submodule', 'update', '--init']);
      await createProject();
    }
    await compile();
    const packageName = await copyResult(kBuildPath, target);
    console.log('created:', packageName);
  } catch (e) {
    console.error(e);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
