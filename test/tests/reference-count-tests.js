import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
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

await describe('reference count tests', async () => {

  await it('correctly handles GC with device.features', async function() {
    //this.timeout(20000);
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


});
