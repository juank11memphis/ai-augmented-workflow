#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const workspace = mkdtempSync(path.join(os.tmpdir(), 'sibu-post-update-drift-'));
const cacheRoot = path.join(workspace, 'cache');
const npmPrefix = path.join(workspace, 'prefix');
const packDir = path.join(workspace, 'pack');

mkdirSync(cacheRoot, { recursive: true });
mkdirSync(npmPrefix, { recursive: true });
mkdirSync(packDir, { recursive: true });

try {
  logStep('Packing current repo as the new tarball');
  const newTarballPath = packCurrentRepo();
  logStep('Building the old tarball from the current package');
  const oldTarballPath = buildOlderTarballFromCurrent(newTarballPath);

  logStep('Installing the old tarball');
  installTarball(oldTarballPath);

  const npmBinPath = getNpmBinPath();
  const installedExecutable = resolveExecutable('sibu', npmBinPath);
  const oldPackageRoot = getInstalledPackageRoot();
  const fixtureProjectPath = prepareFixtureProject({ installedPackageRoot: oldPackageRoot });

  logStep('Running doctor from the old tarball with update advisory override');
  const advisoryOutput = runDoctorWithTty({
    cwd: fixtureProjectPath,
    extraEnv: {
      SIBU_CACHE_HOME: path.join(cacheRoot, 'old-doctor'),
      SIBU_NPM_LATEST_VERSION: '0.1.0',
    },
  });

  assertIncludes(advisoryOutput, 'A newer Sibu version is available: 0.1.0 (0.0.9 installed).');
  assertIncludes(advisoryOutput, 'Update with `npm install -g sibu`.');
  assertIncludes(advisoryOutput, 'Workflow is healthy. No drift detected.');

  const beforeHashes = snapshotProjectFiles(fixtureProjectPath);

  logStep('Installing the new tarball over the old one');
  installTarball(newTarballPath);

  logStep('Running doctor again after the local tarball update');
  const driftOutput = runDoctorWithTty({
    cwd: fixtureProjectPath,
    extraEnv: {
      SIBU_CACHE_HOME: path.join(cacheRoot, 'new-doctor'),
      SIBU_NPM_LOOKUP_MODE: 'offline',
    },
  });

  assertIncludes(driftOutput, 'Found workflow changes that need review.');
  assertIncludes(driftOutput, 'State was generated from template version 41; current template version is 42.');
  assertIncludes(driftOutput, 'Run `sibu sync` to review these workflow changes and choose whether to apply them.');
  assertIncludes(driftOutput, 'Sibu will not change project files until you explicitly run `sibu sync`.');
  assertExcludes(driftOutput, 'A newer Sibu version is available:');

  const afterHashes = snapshotProjectFiles(fixtureProjectPath);
  assertDeepEqual(beforeHashes, afterHashes, 'Expected `sibu doctor` to leave fixture project files unchanged after the update.');

  console.log(`Post-update doctor drift validation passed with ${installedExecutable}.`);
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

function packCurrentRepo() {
  runNpm(['pack', '--json', '--silent', '--pack-destination', packDir], repoRoot(), {
    npm_config_cache: cacheRoot,
  });

  const tarballs = readdirSync(packDir).filter((entry) => entry.endsWith('.tgz')).sort();
  if (tarballs.length !== 1) {
    throw new Error(`Expected one current tarball, found ${tarballs.length}.`);
  }

  return path.join(packDir, tarballs[0]);
}

function buildOlderTarballFromCurrent(newTarballPath) {
  const extractDir = path.join(workspace, 'extract');
  const packageDir = path.join(extractDir, 'package');
  mkdirSync(extractDir, { recursive: true });

  execFileSync('tar', ['-xzf', newTarballPath, '-C', extractDir], {
    env: buildChildEnv(),
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  patchOldPackageVersion(packageDir);
  patchOldTemplateManifest(packageDir);

  const oldTarballPath = path.join(packDir, 'sibu-0.0.9.tgz');
  execFileSync('tar', ['-czf', oldTarballPath, '-C', extractDir, 'package'], {
    env: buildChildEnv(),
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  return oldTarballPath;
}

function patchOldPackageVersion(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = '0.0.9';
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const catalogPath = path.join(packageDir, 'bin', 'shared', 'catalog.js');
  let catalogContents = readFileSync(catalogPath, 'utf8');
  catalogContents = catalogContents.replace("export const SIBU_VERSION = '0.1.0';", "export const SIBU_VERSION = '0.0.9';");
  writeFileSync(catalogPath, catalogContents, 'utf8');
}

function patchOldTemplateManifest(packageDir) {
  const manifestPath = path.join(packageDir, 'templates', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.templateVersion = '41';
  manifest.templates['AGENTS.md'].version = '17';
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function installTarball(tarballPath) {
  runNpm(['install', '--global', tarballPath], repoRoot(), {
    npm_config_cache: cacheRoot,
    npm_config_prefix: npmPrefix,
  });
}

function getInstalledPackageRoot() {
  const globalNodeModulesPath = runNpm(['root', '--global'], repoRoot(), {
    npm_config_cache: cacheRoot,
    npm_config_prefix: npmPrefix,
  });
  const packageRoot = path.join(globalNodeModulesPath, 'sibu');

  if (!existsSync(packageRoot)) {
    throw new Error(`Expected installed package root at ${packageRoot}.`);
  }

  return packageRoot;
}

function prepareFixtureProject({ installedPackageRoot }) {
  const fixtureProjectPath = path.join(workspace, 'fixture-project');
  const fixtureTemplateRoot = path.join(repoRoot(), 'test', 'fixtures', 'packed-runtime', 'project');

  cpSync(fixtureTemplateRoot, fixtureProjectPath, { recursive: true });
  writeFixtureState({ fixtureProjectPath, installedPackageRoot });

  return fixtureProjectPath;
}

function writeFixtureState({ fixtureProjectPath, installedPackageRoot }) {
  const manifest = JSON.parse(readFileSync(path.join(installedPackageRoot, 'templates', 'manifest.json'), 'utf8'));
  const installedPackage = JSON.parse(readFileSync(path.join(installedPackageRoot, 'package.json'), 'utf8'));
  const timestamp = new Date().toISOString();
  const agentsPath = path.join(fixtureProjectPath, 'AGENTS.md');

  const state = {
    sibuVersion: installedPackage.version,
    templateVersion: manifest.templateVersion,
    generatedAt: timestamp,
    updatedAt: timestamp,
    selectedAgents: [],
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    managedFiles: {
      'AGENTS.md': {
        template: 'AGENTS.md',
        templateVersion: manifest.templates['AGENTS.md'].version,
        sha256: sha256(readFileSync(agentsPath, 'utf8')),
        status: 'managed',
      },
    },
  };

  const statePath = path.join(fixtureProjectPath, '.sibu', 'state.json');
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function runDoctorWithTty({ cwd, extraEnv }) {
  const envAssignments = Object.entries({
    ...extraEnv,
    PATH: buildPath(getNpmBinPath()),
  })
    .map(([key, value]) => `${key}=${shellEscape(value)}`)
    .join(' ');
  const command = `cd ${shellEscape(cwd)} && ${envAssignments} ${shellEscape(process.execPath)} ./../prefix/bin/sibu doctor`;

  return execFileSync('script', ['-q', '-c', command, '/dev/null'], {
    cwd: workspace,
    encoding: 'utf8',
    env: {
      ...buildChildEnv(),
      TERM: process.env.TERM || 'xterm-256color',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function snapshotProjectFiles(projectPath) {
  return Object.fromEntries(
    collectRelativeFiles(projectPath).map((relativePath) => {
      const absolutePath = path.join(projectPath, relativePath);
      return [relativePath, sha256(readFileSync(absolutePath, 'utf8'))];
    })
  );
}

function collectRelativeFiles(rootPath) {
  const files = [];

  walk(rootPath, '');
  return files.sort();

  function walk(absoluteDir, relativeDir) {
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      const absolutePath = path.join(absoluteDir, entry.name);

      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
        continue;
      }

      files.push(relativePath.split(path.sep).join('/'));
    }
  }
}

function resolveExecutable(command, npmBinPath) {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const output = execFileSync(locator, [executableName(command)], {
    encoding: 'utf8',
    env: buildChildEnv({ PATH: buildPath(npmBinPath) }),
  }).trim();

  const [firstMatch] = output.split(/\r?\n/);
  if (!firstMatch) {
    throw new Error(`Unable to locate ${command} on PATH after packed install.`);
  }

  return firstMatch;
}

function runNpm(args, cwd, extraEnv = {}) {
  return execFileSync('npm', args, {
    cwd,
    encoding: 'utf8',
    env: buildChildEnv(extraEnv),
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function getNpmBinPath() {
  return process.platform === 'win32' ? npmPrefix : path.join(npmPrefix, 'bin');
}

function executableName(command) {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}

function buildPath(npmBinPath) {
  return [npmBinPath, process.env.PATH].filter(Boolean).join(path.delimiter);
}

function buildChildEnv(extraEnv = {}) {
  const baseEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith('npm_'))
  );

  return {
    ...baseEnv,
    ...extraEnv,
  };
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function assertIncludes(output, expected) {
  if (!output.includes(expected)) {
    throw new Error(`Expected output to include: ${expected}\n\nActual output:\n${output}`);
  }
}

function assertExcludes(output, unexpected) {
  if (output.includes(unexpected)) {
    throw new Error(`Did not expect output to include: ${unexpected}\n\nActual output:\n${output}`);
  }
}

function assertDeepEqual(left, right, message) {
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${message}\n\nBefore: ${JSON.stringify(left, null, 2)}\n\nAfter: ${JSON.stringify(right, null, 2)}`);
  }
}

function logStep(message) {
  console.log(`[validate-post-update] ${message}`);
}

function repoRoot() {
  return path.resolve(new URL('..', import.meta.url).pathname);
}
