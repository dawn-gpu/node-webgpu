import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const isMac = process.platform === 'darwin';
    
const __dirname = dirname(fileURLToPath(import.meta.url));
const arch = isMac ? 'universal' : process.arch;
const dawnNodePath = join(__dirname, 'dist', `${process.platform}-${arch}.dawn.node`);
const { create, globals } = require(dawnNodePath);
export { create, globals }
