import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

await describe('basic tests', async () => {
  await it('creates a device', async () => {
    const device = await(await navigator.gpu.requestAdapter()).requestDevice();
    assert(!!device, 'got device');
    assert(!!device.limits, 'have limits');
    assert(device.limits.maxBindGroups > 0, 'have maxBindGroups');
    device.destroy();
  });
});

