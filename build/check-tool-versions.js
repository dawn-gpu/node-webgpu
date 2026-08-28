import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {kCwd, kDawnPath} from './constants.js';

const kWorkflowPath = path.join(kCwd, '.github', 'workflows', 'build.yml');
const kBuildJsPath = path.join(kCwd, 'build', 'build.js');

function read(filepath) {
  return fs.readFileSync(filepath, {encoding: 'utf8'});
}

// Throws rather than returning undefined so that an upstream rename moves this
// from "every check silently passes" to "one check loudly fails".
function extract(filepath, re, what) {
  const m = read(filepath).match(re);
  if (!m) {
    throw new Error(`could not find ${what} in ${path.relative(kCwd, filepath)}`);
  }
  return m[1];
}

function compareVersions(a, b) {
  const as = a.split('.').map(Number);
  const bs = b.split('.').map(Number);
  for (let i = 0; i < Math.max(as.length, bs.length); ++i) {
    const diff = (as[i] ?? 0) - (bs[i] ?? 0);
    if (diff) {
      return Math.sign(diff);
    }
  }
  return 0;
}

// dawn's go.mod states a minimum. Go downloads a newer toolchain on demand, so
// the CI pin only has to be >= that, not equal to it.
function checkGo() {
  const required = extract(`${kDawnPath}/go.mod`, /^go (\d[\d.]*)$/m, 'the go directive');
  const pinned = extract(kWorkflowPath, /go-version: *'([^']+)'/, 'go-version');
  const normalized = pinned.replace(/\.x$/, '');
  return compareVersions(normalized, required) < 0
    ? {level: 'error', message: `Go: CI pins ${pinned} but dawn's go.mod requires >= ${required}`}
    : {level: 'ok', message: `Go: CI pins ${pinned}, dawn's go.mod requires >= ${required}`};
}

// Also a minimum. Nothing in the workflow pins CMake -- both choco and brew
// install the latest -- so this is here to surface a floor that outruns the
// runner images rather than to compare against anything.
function checkCMake() {
  const required = extract(
      `${kDawnPath}/CMakeLists.txt`,
      /cmake_minimum_required\(VERSION ([\d.]+)/,
      'cmake_minimum_required');
  return {level: 'info', message: `CMake: dawn requires >= ${required}; CI installs the latest (unpinned)`};
}

// build.js sets DEPOT_TOOLS_WIN_TOOLCHAIN=0, so Windows builds use the SDK the
// workflow installs, not chromium's packaged one. dawn's SDK_VERSION is
// therefore a signal that upstream moved on, not a requirement.
function checkWindowsSdk() {
  const dawnSdk = extract(
      `${kDawnPath}/build/vs_toolchain.py`, /^SDK_VERSION = '([\d.]+)'$/m, 'SDK_VERSION');
  const ciSdk = extract(kWorkflowPath, /sdk-version: *(\d+)/, 'sdk-version');
  const buildSdk = extract(kBuildJsPath, /CMAKE_SYSTEM_VERSION=([\d.]+)/, 'CMAKE_SYSTEM_VERSION');

  if (buildSdk !== `10.0.${ciSdk}.0`) {
    return {
      level: 'error',
      message: `Windows SDK: build.js compiles against ${buildSdk} but the workflow installs ${ciSdk}`,
    };
  }
  return dawnSdk === buildSdk
    ? {level: 'ok', message: `Windows SDK: ${buildSdk}, matching dawn's packaged toolchain`}
    : {
        level: 'warn',
        message: `Windows SDK: this repo uses ${buildSdk}, dawn's packaged toolchain moved to ${dawnSdk} (advisory)`,
      };
}

// The first MSVS_VERSIONS entry is the version in chromium's packaged
// toolchain. Same caveat as the SDK -- advisory, since we use the system one.
function checkMsvc() {
  const dawnVs = extract(
      `${kDawnPath}/build/vs_toolchain.py`,
      /MSVS_VERSIONS[\s\S]*?\(\s*'(\d{4})'/,
      'MSVS_VERSIONS');
  const ciVs = extract(kWorkflowPath, /Microsoft Visual Studio\/(\d{4})\//, 'the vcvars64.bat path');
  return dawnVs === ciVs
    ? {level: 'ok', message: `Visual Studio: ${ciVs}, matching dawn's packaged toolchain`}
    : {
        level: 'warn',
        message: `Visual Studio: this repo assumes ${ciVs}, dawn's packaged toolchain moved to ${dawnVs} (advisory)`,
      };
}

const kChecks = [checkGo, checkCMake, checkWindowsSdk, checkMsvc];

export function checkToolVersions() {
  return kChecks.map(check => {
    try {
      return check();
    } catch (e) {
      return {level: 'error', message: `${check.name}: ${e.message}`};
    }
  });
}

export function reportToolVersions() {
  const results = checkToolVersions();
  console.log('tool versions (dawn -> node-webgpu):');
  for (const {level, message} of results) {
    console.log(`  ${level.toUpperCase().padEnd(5)} ${message}`);
  }
  return results;
}

function main() {
  const results = reportToolVersions();
  process.exit(results.some(r => r.level === 'error') ? 1 : 0);
}

// fileURLToPath, not URL.pathname, so this still matches on Windows.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
