import {spawn} from 'child_process';
import DEBUG from 'debug';
const debug = DEBUG('execute');

export function execute(cmd, args, options) {
  return new Promise((resolve, reject) => {
    debug(`${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, {...options || {}, shell: true, stdio: 'inherit'});
    proc.on('close', function(code) {
      const result = {exitCode: code};
      if (parseInt(code) !== 0) {
        reject(result);
      } else {
        resolve(null, result);
      }
    });
  });
}
