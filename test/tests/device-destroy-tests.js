import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { getGPU } from '../webgpu.js';

// GPUDevice.destroy() is specified to unmap the device's buffers. dawn.node
// does not, so index.js wraps createBuffer/destroy to do it. These cover that
// wrapper, including that it does not keep the buffers it tracks alive.
await describe('device.destroy tests', async () => {
  let navigator;
  let globals;

  before(async () => {
    const { gpu, globals: g } = getGPU();
    globals = g;
    navigator = { gpu };
  });

  // An adapter is consumed by requestDevice, so each test needs its own.
  async function newDevice() {
    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter, 'got adapter');
    return await adapter.requestDevice();
  }

  await it('unmaps a mapped buffer', async () => {
    const { GPUBufferUsage, GPUMapMode } = globals;
    const device = await newDevice();
    const buffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.MAP_READ,
    });
    await buffer.mapAsync(GPUMapMode.READ);
    const range = buffer.getMappedRange();
    assert.equal(buffer.mapState, 'mapped', 'buffer is mapped');
    assert.equal(range.byteLength, 16, 'range has the buffer size');

    device.destroy();

    assert.equal(buffer.mapState, 'unmapped', 'destroy unmapped the buffer');
    assert.equal(range.byteLength, 0, 'destroy detached the mapped range');
  });

  await it('unmaps a mappedAtCreation buffer', async () => {
    const { GPUBufferUsage } = globals;
    const device = await newDevice();
    const buffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.MAP_WRITE,
      mappedAtCreation: true,
    });
    const range = buffer.getMappedRange();

    device.destroy();

    assert.equal(buffer.mapState, 'unmapped', 'destroy unmapped the buffer');
    assert.equal(range.byteLength, 0, 'destroy detached the mapped range');
  });

  // Not our code: dawn.node already gets this right. It is here because the
  // unmap-on-device-destroy wrapper relies on a destroyed buffer reading as
  // unmapped, which is how it skips them without tracking destroys itself.
  await it('buffer.destroy() detaches its own mapping', async () => {
    const { GPUBufferUsage, GPUMapMode } = globals;
    const device = await newDevice();
    const buffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.MAP_READ,
    });
    await buffer.mapAsync(GPUMapMode.READ);
    const range = buffer.getMappedRange();

    buffer.destroy();

    assert.equal(buffer.mapState, 'unmapped', 'destroyed buffer reads as unmapped');
    assert.equal(range.byteLength, 0, 'destroy detached the mapped range');
    device.destroy();
  });

  await it('survives unmapped, already destroyed, and doubly destroyed', async () => {
    const { GPUBufferUsage } = globals;
    const device = await newDevice();
    device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ });
    const destroyed = device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ });
    destroyed.destroy();

    device.destroy();
    device.destroy();
  });

  await it('does not keep the buffers it tracks alive', async () => {
    const { GPUBufferUsage } = globals;
    // Needs --expose-gc, which test/test.js passes.
    if (!globalThis.gc) {
      console.log('skipped: no --expose-gc');
      return;
    }
    const device = await newDevice();
    const kNumBuffers = 500;
    let collected = 0;
    const registry = new FinalizationRegistry(() => { ++collected; });

    for (let i = 0; i < kNumBuffers; ++i) {
      // Deliberately keeps no reference; only the wrapper's tracking sees these.
      registry.register(device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ }), i);
    }
    for (let i = 0; i < 6 && collected === 0; ++i) {
      globalThis.gc();
      await new Promise(r => setTimeout(r, 30));
    }

    assert(collected > 0, `buffers were collected with the device alive (${collected}/${kNumBuffers})`);
    device.destroy();
  });
});
