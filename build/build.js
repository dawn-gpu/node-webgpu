import path from 'node:path';
import fs from 'node:fs';

import {execute} from './execute.js';
import {
  addElemIf,
  appendPath,
  appendPathIfItExists,
  exists,
  prependPathIfItExists,
  processThenRestoreCWD,
} from './utils.js';
import {
  kDepotToolsPath,
  kDawnPath,
  kBuildPath,
  kConfig,
  isMac,
  isWin,
  isLinux,
} from './constants.js';

prependPathIfItExists(kDepotToolsPath);
appendPathIfItExists('/Applications/CMake.app/Contents/bin');
appendPathIfItExists('C:\\Program Files\\CMake\\bin');
appendPath(`${kDawnPath}/third_party/ninja`);

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
    //process.env.DEPOT_TOOLS_UPDATE = '0'
    process.chdir(kDawnPath);
    fs.copyFileSync('scripts/standalone-with-node.gclient', '.gclient');
    await execute('gclient', ['metrics', '--opt-out']);
    // add -D only if gclient sync was run before.
    await execute('gclient', ['sync', ...addElemIf(exists('.gclient_entries'), '-D')]);
    if (exists(kBuildPath)) {
      fs.rmSync(kBuildPath, {recursive: true});
    }
    fs.mkdirSync(kBuildPath, {recursive: true});
    process.chdir(kBuildPath);

    await execute('cmake', [
      kDawnPath,
      ...addElemIf(!isWin, '-GNinja'),
      '-DDAWN_BUILD_NODE_BINDINGS=1',
      '-DDAWN_USE_X11=OFF',
      // dawn defaults both of these ON for linux, which makes it build GLFW's
      // wayland backend, which needs wayland-scanner. dawn.node never opens a
      // window, so turn it off rather than requiring the tool on every runner.
      '-DDAWN_USE_WAYLAND=OFF',
      // dawn's module check only gates clang on clang-scan-deps, so gcc 13
      // passes it but then cmake can't scan the import graph (gcc only emits
      // p1689 deps from 14 on) and the generate step fails. dawn.node doesn't
      // use the C++20 module interface, so seed the check as off.
      ...addElemIf(isLinux, '-DDAWN_SUPPORTS_CXX_MODULES=OFF'),
      `-DCMAKE_BUILD_TYPE=${kConfig}`,
      '-DCMAKE_CXX_VISIBILITY_PRESET=hidden',
      '-DCMAKE_VISIBILITY_INLINES_HIDDEN=1',
      ...addElemIf(isMac, '-DCMAKE_OSX_ARCHITECTURES="x86_64;arm64"'),
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
    const arch = isMac ? 'universal' : process.arch;
    const target = `${process.platform}-${arch}`;
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
