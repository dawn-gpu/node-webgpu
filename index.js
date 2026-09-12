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

// GPUDevice.destroy() is specified to unmap every buffer created on that device,
// but dawn.node leaves them mapped, so their getMappedRange ArrayBuffers stay
// attached. Track each device's buffers weakly and unmap the live ones here.
//
// Weakly matters: a strong Set would pin every buffer a device ever created
// until the device itself was destroyed.
const kPatched = Symbol.for('webgpu.deviceDestroyUnmapsBuffers');
const deviceBuffers = new WeakMap();
const collected = new FinalizationRegistry(({ buffers, ref }) => buffers.delete(ref));

function trackBuffer(device, buffer) {
  let buffers = deviceBuffers.get(device);
  if (!buffers) {
    buffers = new Set();
    deviceBuffers.set(device, buffers);
  }
  const ref = new WeakRef(buffer);
  buffers.add(ref);
  // The Set holds the WeakRefs themselves strongly, so drop each one once its
  // buffer has been collected. Entries can only pile up for buffers that have
  // not been collected yet, and those are costing far more than the ref is.
  collected.register(buffer, { buffers, ref });
}

function unmapBuffers(device) {
  const buffers = deviceBuffers.get(device);
  if (!buffers) {
    return;
  }
  for (const ref of buffers) {
    const buffer = ref.deref();
    // Buffers destroyed on their own read as unmapped, so they fall out here and
    // need no separate bookkeeping. GPUBuffer.destroy() already detaches.
    if (buffer?.mapState === 'mapped') {
      // Defensive only, no known throw: this runs on the way into destroy(),
      // and one bad buffer should not stop the device from being destroyed.
      try {
        buffer.unmap();
      } catch {}
    }
  }
  buffers.clear();
}

const { GPUDevice } = globals;
if (GPUDevice?.prototype && !GPUDevice.prototype[kPatched]) {
  const { createBuffer, destroy } = GPUDevice.prototype;

  GPUDevice.prototype.createBuffer = function (...args) {
    const buffer = createBuffer.apply(this, args);
    trackBuffer(this, buffer);
    return buffer;
  };

  GPUDevice.prototype.destroy = function (...args) {
    unmapBuffers(this);
    return destroy.apply(this, args);
  };

  GPUDevice.prototype[kPatched] = true;
}

export { create, globals }
