import path from 'node:path';

export const kCwd = process.cwd();
export const kDepotToolsPath = path.join(kCwd, 'third_party', 'depot_tools');
export const kDawnPath = `${kCwd}/third_party/dawn`;
export const kOutDir = `${kCwd}/out`;
export const kBuildPath = `${kOutDir}/cmake-release`;
export const kConfig = process.env.CMAKE_BUILD_TYPE ?? 'Release';

export const isMac = process.platform === 'darwin';
export const isWin = process.platform === 'win32';
