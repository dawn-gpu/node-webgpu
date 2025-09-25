import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { getGPU } from '../webgpu.js';

await describe('basic tests', async () => {
  let device;
  let navigator;
  let adapter
  let globals;

  before(async () => {
    const { gpu, globals: g } = getGPU();
    globals = g;
    navigator = { gpu };
    adapter = await navigator.gpu.requestAdapter();
    assert(adapter, 'got adapter');

    device = await adapter.requestDevice({label: "test-device"});
  });

  after(async () => {
    device.destroy();
    device = undefined;
    navigator = undefined;
    adapter = undefined;

    await new Promise(r => setTimeout(r, 1000));
  })

  function withErrorScope(fn) {
    return async () => {
      device.pushErrorScope('validation');
      await fn();
      const error = await device.popErrorScope();
      assert(!error, `device error: ${error?.message || error}`);
    };
  }

  await it('creates a device', withErrorScope(async () => {
    console.log('adapter.info.description:', adapter.info.description);
    console.log('adapter.info.vendor:', adapter.info.vendor);
    console.log('adapter.info.architecture:', adapter.info.architecture);
    assert(!!device, 'got device');
    assert(!!device.limits, 'have limits');
    assert(device.limits.maxBindGroups > 0, 'have maxBindGroups');
  }));

  await it('computes',  withErrorScope(async () => {
    const { GPUBufferUsage, GPUMapMode } = globals;
    const module = device.createShaderModule({
      label: 'doubling compute module',
      code: `
        @group(0) @binding(0) var<storage, read_write> data: array<f32>;

        @compute @workgroup_size(1) fn computeSomething(
          @builtin(global_invocation_id) id: vec3u
        ) {
          let i = id.x;
          data[i] = data[i] * 2.0;
        }
      `,
    });

    const pipeline = device.createComputePipeline({
      label: 'doubling compute pipeline',
      layout: 'auto',
      compute: {
        module,
      },
    });

    const input = new Float32Array([1, 3, 5]);
    const workBuffer = device.createBuffer({
      label: 'work buffer',
      size: input.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(workBuffer, 0, input);

    const resultBuffer = device.createBuffer({
      label: 'result buffer',
      size: input.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
      label: 'bindGroup for work buffer',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: workBuffer } },
      ],
    });

    const encoder = device.createCommandEncoder({
      label: 'doubling encoder',
    });
    const pass = encoder.beginComputePass({
      label: 'doubling compute pass',
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(input.length);
    pass.end();

    encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    await resultBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(resultBuffer.getMappedRange().slice());
    resultBuffer.unmap();

    assert.deepEqual(result, input.map(x => x * 2), 'correct result');
  }));

  await it('renders',  withErrorScope(async () => {
    const { GPUTextureUsage, GPUBufferUsage, GPUMapMode } = globals;
    const format = 'r8unorm';
    const module = device.createShaderModule({
      label: 'our hardcoded red triangle shaders',
      code: `
        @vertex fn vs(
          @builtin(vertex_index) vertexIndex : u32
        ) -> @builtin(position) vec4f {
          let pos = array(
            vec2f(-1.1, -1.0),
            vec2f(-1.1,  1.1),
            vec2f( 1.0,  1.1),
          );

          return vec4f(pos[vertexIndex], 0.0, 1.0);
        }

        @fragment fn fs() -> @location(0) vec4f {
          return vec4f(1, 0, 0, 1);
        }
      `,
    });

    const pipeline = device.createRenderPipeline({
      label: 'our hardcoded red triangle pipeline',
      layout: 'auto',
      vertex: {
        module,
      },
      fragment: {
        module,
        targets: [{ format }],
      },
    });

    const texture = device.createTexture({
      size: [4, 4],
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    const renderPassDescriptor = {
      label: 'our basic canvas renderPass',
      colorAttachments: [
        {
          view: texture,
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const buffer = device.createBuffer({
      label: 'readback buffer',
      size: 256 * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.draw(3);  // call our vertex shader 3 times.
    pass.end();
    encoder.copyTextureToBuffer(
      { texture },
      { buffer, bytesPerRow: 256 },
      [4, 4],
    );
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    await buffer.mapAsync(GPUMapMode.READ);
    const data = new Uint8Array(buffer.getMappedRange()).slice();
    buffer.unmap();

    const expected = new Uint8Array(256 * 4);
    expected.set([255, 255, 255,   0], 0);
    expected.set([255, 255,   0,   0], 256);
    expected.set([255,   0,   0,   0], 512);
    expected.set([  0,   0,   0,   0], 768);
    assert.deepEqual(data, expected, 'correct result');
  }));

});

