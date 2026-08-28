import fs from 'node:fs';
import path from 'node:path';
import {unzip} from 'unzipit';

import * as github from './github.js';
import {
  parseArgs,
} from './utils.js'

async function downloadFileFromZip(url, filepath) {
  console.log('downloading:', url);
  const res = await fetch(url);
  if (res.status !== 200) {
    const text = await res.text();
    throw new Error(`url: ${url}\n${text}`);
  }
  console.log(res.status, res.bytes);
  const zipData = await res.arrayBuffer();
  const {entries} = await unzip(zipData);
  return Promise.all(Object.entries(entries).map(async ([name, entry]) => {
    const data = await entry.arrayBuffer();
    const filename = path.join(filepath, name);
    console.log('extracted:', filename);
    fs.mkdirSync(filepath, {recursive: true});
    fs.writeFileSync(filename, new Uint8Array(data));
    return filename;
  }));
}

const options = {
  repo:   { type: 'string', inlineValue: true, required: true, description: 'owner/name of repo' },
  run_id: { type: 'string', inlineValue: true, required: true, description: 'run_id from action' },
};
const { values: args } = parseArgs({ args: process.argv.slice(2), options });

/*
const data = {
  "total_count": 3,
  "artifacts": [
    {
      "id": 2386423695,
      "node_id": "MDg6QXJ0aWZhY3QyMzg2NDIzNjk1",
      "name": "darwin-arm64.dawn.node",
      "size_in_bytes": 10841703,
      "url": "https://api.github.com/repos/greggman/node-webgpu/actions/artifacts/2386423695",
      "archive_download_url": "https://api.github.com/repos/greggman/node-webgpu/actions/artifacts/2386423695/zip",
      "expired": false,
      "created_at": "2025-01-04T23:01:06Z",
      "updated_at": "2025-01-04T23:01:06Z",
      "expires_at": "2025-04-04T22:49:48Z",
      "workflow_run": {
        "id": 12614358725,
        "repository_id": 911859581,
        "head_repository_id": 911859581,
        "head_branch": "main",
        "head_sha": "3bb7a9fec4559ddc789c424b92a92122ad09c1f4"
      }
    },
    {
      "id": 2386431784,
      "node_id": "MDg6QXJ0aWZhY3QyMzg2NDMxNzg0",
      "name": "linux-x64.dawn.node",
      "size_in_bytes": 120766916,
      "url": "https://api.github.com/repos/greggman/node-webgpu/actions/artifacts/2386431784",
      "archive_download_url": "https://api.github.com/repos/greggman/node-webgpu/actions/artifacts/2386431784/zip",
      "expired": false,
      "created_at": "2025-01-04T23:08:23Z",
      "updated_at": "2025-01-04T23:08:23Z",
      "expires_at": "2025-04-04T22:49:48Z",
      "workflow_run": {
        "id": 12614358725,
        "repository_id": 911859581,
        "head_repository_id": 911859581,
        "head_branch": "main",
        "head_sha": "3bb7a9fec4559ddc789c424b92a92122ad09c1f4"
      }
    },
    {
      "id": 2386436118,
      "node_id": "MDg6QXJ0aWZhY3QyMzg2NDM2MTE4",
      "name": "win32-x64.dawn.node",
      "size_in_bytes": 11265694,
      "url": "https://api.github.com/repos/greggman/node-webgpu/actions/artifacts/2386436118",
      "archive_download_url": "https://api.github.com/repos/greggman/node-webgpu/actions/artifacts/2386436118/zip",
      "expired": false,
      "created_at": "2025-01-04T23:12:55Z",
      "updated_at": "2025-01-04T23:12:55Z",
      "expires_at": "2025-04-04T22:49:48Z",
      "workflow_run": {
        "id": 12614358725,
        "repository_id": 911859581,
        "head_repository_id": 911859581,
        "head_branch": "main",
        "head_sha": "3bb7a9fec4559ddc789c424b92a92122ad09c1f4"
      }
    }
  ]
}

https://github.com/greggman/node-webgpu/actions/runs/12618872732/artifacts/2387232364
*/

const [owner, repo] = args.repo.split('/');
const data = await github.getRunArtifacts({
  owner,
  repo,
  run_id: args.run_id,
});
const filenames = await Promise.all(
  data.artifacts
    // Artifacts are named for the platform-arch they were built for, and each
    // unpacks into the dist directory of that same name.
    .filter(({name}) => /^(darwin|linux|win32)-/.test(name ?? ''))
    .map(({id, name}) => {
      const url = `https://github.com/${owner}/${repo}/actions/runs/${args.run_id}/artifacts/${id}`;
      return downloadFileFromZip(url, path.join('dist', name));
    })
);
