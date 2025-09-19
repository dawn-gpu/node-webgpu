import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';

export function exists(filename) {
  try {
    fs.statSync(filename);
    return true;
  } catch {
    return false;
  }
}

export function prependPath(filepath) {
  process.env.PATH = `${filepath}${path.delimiter}${process.env.PATH}`;
}

export function appendPath(filepath) {
  process.env.PATH = `${process.env.PATH}${path.delimiter}${filepath}`;
}

export function prependPathIfItExists(filepath) {
  if (exists(filepath)) {
    prependPath(filepath);
  }
}

export function appendPathIfItExists(filepath) {
  if (exists(filepath)) {
    appendPath(filepath);
  }
}

export function addElemIf(cond, elem) {
  return cond ? [elem] : [];
}

function formatOption(key, { type, inlineValue }) {
  return type === 'bool'
    ? `--${key}`
    : inlineValue
    ? `--${key}=value`
    : `--${key} value`;
}

export function showHelp(options) {
  const longest = Object.entries(options).reduce((max, [k, v]) => Math.max(max, formatOption(k, v).length), 0);
  const help = Object.entries(options).map(([k, v]) => `${formatOption(k, v).padEnd(longest + 1)} : ${v.description ?? ''}`);
  console.log(help.join('\n'));
}

export function parseArgs({options, args}) {
  const { values, positionals } = util.parseArgs({ args, options });
  for (const [k, {required}] of Object.entries(options)) {
    if (required && values[k] === undefined) {
      console.error(`missing required option: ${k}`);
      showHelp(options);
      process.exit(1);
    }
  }
  const ndx = positionals.findIndex(v => v.startsWith('-'));
  if (ndx >= 0) {
    console.error(`unknown option: ${positionals[ndx]}`);
    showHelp(options);
    process.exit(1);
  }
  return { values, positionals };
}

export async function processThenRestoreCWD(fn) {
  const cwd = process.cwd(); 
  try {
    await fn();
  } finally {
    process.chdir(cwd);
  }
}
