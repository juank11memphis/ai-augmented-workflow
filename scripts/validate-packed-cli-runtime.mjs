#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function main() {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'sibu-packed-runtime-'));
  const packDir = path.join(workspace, 'pack');
  const npmPrefix = path.join(workspace, 'prefix');
  const npmCache = path.join(workspace, 'cache');

  mkdirSync(packDir, { recursive: true });
  mkdirSync(npmPrefix, { recursive: true });
  mkdirSync(npmCache, { recursive: true });

  try {
    logStep(`Using isolated workspace at ${workspace}`);

    runNpm(['pack', '--json', '--silent', '--pack-destination', packDir], {
      cwd: getRepoRoot(),
      env: {
        npm_config_cache: npmCache,
      },
    });

    const tarballPath = getPackedTarballPath(packDir);
    logStep(`Packed tarball: ${tarballPath}`);

    runNpm(['install', '--global', tarballPath], {
      cwd: getRepoRoot(),
      env: {
        npm_config_cache: npmCache,
        npm_config_prefix: npmPrefix,
      },
    });

    const npmBinPath = getNpmBinPath(npmPrefix);
    const installedExecutable = resolveExecutable('sibu', npmBinPath);
    const expectedExecutable = path.join(npmBinPath, executableName('sibu'));

    if (installedExecutable !== expectedExecutable) {
      throw new Error(`Expected installed sibu executable at ${expectedExecutable}, got ${installedExecutable}`);
    }

    console.log(`Packed runtime install is isolated and ready: ${installedExecutable}`);
  } finally {
    if (process.env.KEEP_PACKED_RUNTIME_TMP === '1') {
      console.log(`Keeping temporary workspace: ${workspace}`);
      return;
    }

    rmSync(workspace, { recursive: true, force: true });
  }
}

function getRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function getPackedTarballPath(packDir) {
  const tarballs = readdirSync(packDir)
    .filter((entry) => entry.endsWith('.tgz'))
    .sort();

  if (tarballs.length !== 1) {
    throw new Error(`Expected exactly one tarball in ${packDir}, found ${tarballs.length}.`);
  }

  return path.join(packDir, tarballs[0]);
}

function getNpmBinPath(npmPrefix) {
  return process.platform === 'win32' ? npmPrefix : path.join(npmPrefix, 'bin');
}

function executableName(command) {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}

function resolveExecutable(command, npmBinPath) {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const output = execFileSync(locator, [executableName(command)], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: [npmBinPath, process.env.PATH].filter(Boolean).join(path.delimiter),
    },
  }).trim();

  const [firstMatch] = output.split(/\r?\n/);
  if (!firstMatch) {
    throw new Error(`Unable to locate ${command} on PATH after packed install.`);
  }

  return firstMatch;
}

function runNpm(args, options) {
  logStep(`npm ${args.join(' ')}`);
  return execFileSync('npm', args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: {
      ...process.env,
      ...options.env,
    },
  }).trim();
}

function logStep(message) {
  console.log(`[validate-packed-runtime] ${message}`);
}

main();
