import { assert } from 'chai';
import DEBUG from 'debug';

const debug = DEBUG('reference-count-tests');

async function waitForGC(ref, label) {
  assert(global.gc, 'global.gc is not exposed. use --expose-gc');
  // wait for the device to be collected
  while (ref.deref()) {
    debug('gc');
    global.gc();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  debug(label, 'was GCed');
}

const kGCTimeout = 5000;

describe('reference count tests', () => {

  it('correctly handles GC with device.features', async function() {
    this.timeout(kGCTimeout);
    const adapter = await navigator.gpu.requestAdapter();

    const [iterWeakRef, featuresWeakRef] = await (async () => {
      const [iter, deviceWeakRef, featuresWeakRef] = await (async () => {
        const device = await adapter.requestDevice({requiredFeatures: [...adapter.features]});
        const iter = device.features[Symbol.iterator]();
        device.destroy();
        return [iter, new WeakRef(device), new WeakRef(device.features)];
      })();

      await waitForGC(deviceWeakRef, 'device');

      debug([...iter]);

      return [new WeakRef(iter), featuresWeakRef]
    })();

    await waitForGC(iterWeakRef, 'iter');
    await waitForGC(featuresWeakRef, 'features');
    // dawn.node will likely crash before this if this is not working.
  });

  it('persists the GPUBuffer until the arrayBuffer is destroyed', async function() {
    this.timeout(kGCTimeout);

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    const arrayBufferRef = await (async() => {
      const [arrayBuffer, bufferWeakRef] = await (async () => {
        const buffer = device.createBuffer({size: 16, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE })
        await buffer.mapAsync(GPUMapMode.WRITE);
        const arrayBuffer = buffer.getMappedRange();
        buffer.destroy();
        return [arrayBuffer, new WeakRef(buffer)];
      })();

      await waitForGC(bufferWeakRef, 'buffer');
      // access the arrayBuffer
      assert(typeof arrayBuffer.byteLength === 'number');

      return new WeakRef(arrayBuffer);
    })();

    // Will timeout if never released
    await waitForGC(arrayBufferRef, 'arrayBuffer');
  });

  it('persists the GPUBuffer until the arrayBuffer is GCed without being destroyed', async function() {
    this.timeout(kGCTimeout);

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    const arrayBufferRef = await (async() => {
      const [arrayBuffer, bufferWeakRef] = await (async () => {
        const buffer = device.createBuffer({size: 16, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE })
        await buffer.mapAsync(GPUMapMode.WRITE);
        const arrayBuffer = buffer.getMappedRange();
        return [arrayBuffer, new WeakRef(buffer)];
      })();

      await waitForGC(bufferWeakRef, 'buffer');
      // access the arrayBuffer
      assert(typeof arrayBuffer.byteLength === 'number');

      return new WeakRef(arrayBuffer);
    })();

    // Will timeout if never released
    await waitForGC(arrayBufferRef, 'arrayBuffer');
  });

  it('GCs GPUBuffer and arrayBuffer when buffer references arrayBuffer', async function() {
    this.timeout(kGCTimeout);

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    const [arrayBufferRef, bufferWeakRef] = await (async () => {
      const buffer = device.createBuffer({size: 16, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE })
      await buffer.mapAsync(GPUMapMode.WRITE);
      const arrayBuffer = buffer.getMappedRange();
      buffer.buf = arrayBuffer;
      return [new WeakRef(arrayBuffer), new WeakRef(buffer)];
    })();

    // Will timeout if never released
    await waitForGC(bufferWeakRef, 'buffer');
    await waitForGC(arrayBufferRef, 'arrayBuffer');
  });

  it('GCs GPUBuffer and arrayBuffer when arrayBuffer references Buffer', async function() {
    this.timeout(kGCTimeout);

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    const [arrayBufferRef, bufferWeakRef] = await (async () => {
      const buffer = device.createBuffer({size: 16, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE })
      await buffer.mapAsync(GPUMapMode.WRITE);
      const arrayBuffer = buffer.getMappedRange();
      arrayBuffer.buf = buffer;
      return [new WeakRef(arrayBuffer), new WeakRef(buffer)];
    })();

    // Will timeout if never released
    await waitForGC(bufferWeakRef, 'buffer');
    await waitForGC(arrayBufferRef, 'arrayBuffer');
  });

});
