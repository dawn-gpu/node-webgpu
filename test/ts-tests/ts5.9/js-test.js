import { globals, create } from 'webgpu';

Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };

const adapter = await navigator.gpu.requestAdapter();
const device = await adapter?.requestDevice();
console.log(device?.adapterInfo.description);
device.destroy();

await new Promise(r => setTimeout(r, 1000));

