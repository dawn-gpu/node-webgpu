import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const isMac = process.platform === 'darwin';
    
const __dirname = dirname(fileURLToPath(import.meta.url));
const arch = isMac ? 'universal' : process.arch;
// One directory per platform-arch so each build can sit next to its own
// runtime deps (win32 needs its matching d3dcompiler_47.dll beside it).
const dawnNodePath = join(__dirname, 'dist', `${process.platform}-${arch}`, 'dawn.node');
const { create, globals } = require(dawnNodePath);
export { create, globals }
