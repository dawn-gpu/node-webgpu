import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
    
const __dirname = dirname(fileURLToPath(import.meta.url));
const dawnNodePath = join(__dirname, 'dist', `${process.platform}-${process.arch}.dawn.node`);
const { create, globals } = require(dawnNodePath);
export { create, globals }
