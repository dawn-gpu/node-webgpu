import { create, globals } from '../index.js';
import { isWin, isLinux } from '../build/constants.js';
import { addElemIf } from '../build/utils.js';

export function getGPU() {
  const options = [];
  if (!!process.env.WEBGPU_USE_CI_AVAILABLE_RENDERER) {
    options.push(...addElemIf(isWin, 'adapter=Microsoft'));
    options.push(...addElemIf(isLinux, 'adapter=llvmpipe'));
  }
  return { gpu: create(options), globals };
}

