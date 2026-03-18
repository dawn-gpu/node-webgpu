import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { create } from '../../index.js';

if (isMainThread) {
  describe('worker threads tests', () => {
    it('can request adapter in multiple worker threads simultaneously', async () => {
      const numWorkers = 4;
      const workers = [];
      
      // Initialize in main thread to ensure no conflict with workers
      const gpu = create([]);
      const adapter = await gpu.requestAdapter();
      assert.ok(adapter, 'Main thread got adapter');

      for (let i = 0; i < numWorkers; i++) {
        workers.push(new Promise((resolve, reject) => {
          const worker = new Worker(fileURLToPath(import.meta.url));
          worker.on('message', (msg) => {
            if (msg === 'success') resolve();
            else reject(new Error(`Worker failed: ${msg}`));
          });
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
          });
        }));
      }

      await Promise.all(workers);
    });
  });
} else {
  // Worker code
  async function run() {
    const { create } = await import('../../index.js');
    const gpu = create([]);
    const adapter = await gpu.requestAdapter();
    if (adapter) {
      parentPort.postMessage('success');
    } else {
      parentPort.postMessage('failure');
    }
  }
  run().catch(err => {
    parentPort.postMessage(err.message || String(err));
    process.exit(1);
  });
}
