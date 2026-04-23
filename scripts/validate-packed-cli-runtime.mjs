#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
      env: npmEnv({ npmCache, npmPrefix }),
    });

    const npmBinPath = getNpmBinPath(npmPrefix);
    const installedExecutable = resolveExecutable('sibu', npmBinPath);
    const expectedExecutable = path.join(npmBinPath, executableName('sibu'));

    if (installedExecutable !== expectedExecutable) {
      throw new Error(`Expected installed sibu executable at ${expectedExecutable}, got ${installedExecutable}`);
    }

    logStep(`Installed executable resolved to ${installedExecutable}`);
    runInstalledSibu(installedExecutable, ['--help'], npmBinPath);

    const installedPackageRoot = getInstalledPackageRoot({ npmCache, npmPrefix });
    const fixtureProjectPath = prepareFixtureProject({ workspace, installedPackageRoot });

    const doctorOutput = runInstalledSibu(installedExecutable, ['doctor'], npmBinPath, fixtureProjectPath);
    if (!doctorOutput.includes('Workflow is healthy. No drift detected.')) {
      throw new Error(`Expected healthy doctor output from packed runtime, got:\n${doctorOutput}`);
    }

    console.log(`Packed runtime install is isolated and ready: ${installedExecutable}`);
    console.log(`Packed runtime doctor smoke test passed in ${fixtureProjectPath}`);
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

function getFixtureTemplateRoot() {
  return path.join(getRepoRoot(), 'test', 'fixtures', 'packed-runtime', 'project');
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

function getInstalledPackageRoot({ npmCache, npmPrefix }) {
  const globalNodeModulesPath = runNpm(['root', '--global'], {
    cwd: getRepoRoot(),
    env: npmEnv({ npmCache, npmPrefix }),
  });
  const packageRoot = path.join(globalNodeModulesPath, '@juancr11', 'sibu');

  if (!existsSync(packageRoot)) {
    throw new Error(`Expected installed package root at ${packageRoot}.`);
  }

  return packageRoot;
}

function prepareFixtureProject({ workspace, installedPackageRoot }) {
  const fixtureProjectPath = path.join(workspace, 'fixture-project');
  const fixtureTemplateRoot = getFixtureTemplateRoot();

  cpSync(fixtureTemplateRoot, fixtureProjectPath, { recursive: true });
  writeFixtureState({ fixtureProjectPath, installedPackageRoot });

  return fixtureProjectPath;
}

function writeFixtureState({ fixtureProjectPath, installedPackageRoot }) {
  const manifest = JSON.parse(readFileSync(path.join(installedPackageRoot, 'templates', 'manifest.json'), 'utf8'));
  const installedPackage = JSON.parse(readFileSync(path.join(installedPackageRoot, 'package.json'), 'utf8'));
  const timestamp = new Date().toISOString();

  const managedFiles = {
    'AGENTS.md': buildManagedFileState({
      fixtureProjectPath,
      relativePath: 'AGENTS.md',
      templateRelativePath: 'AGENTS.md',
      manifest,
    }),
  };

  const state = {
    sibuVersion: installedPackage.version,
    templateVersion: manifest.templateVersion,
    generatedAt: timestamp,
    updatedAt: timestamp,
    selectedAgents: [],
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    managedFiles,
  };

  const statePath = path.join(fixtureProjectPath, '.sibu', 'state.json');
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function buildManagedFileState({ fixtureProjectPath, relativePath, templateRelativePath, manifest }) {
  const absolutePath = path.join(fixtureProjectPath, relativePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Fixture file is missing: ${absolutePath}`);
  }

  const template = manifest.templates[templateRelativePath];
  if (!template) {
    throw new Error(`Template manifest entry is missing for ${templateRelativePath}`);
  }

  return {
    template: templateRelativePath,
    templateVersion: template.version,
    sha256: sha256(readFileSync(absolutePath, 'utf8')),
    status: 'managed',
  };
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
    env: buildChildEnv({ PATH: buildPath(npmBinPath) }),
  }).trim();

  const [firstMatch] = output.split(/\r?\n/);
  if (!firstMatch) {
    throw new Error(`Unable to locate ${command} on PATH after packed install.`);
  }

  return firstMatch;
}

function runInstalledSibu(installedExecutable, args, npmBinPath, cwd = getRepoRoot()) {
  logStep(`Running ${path.basename(installedExecutable)} ${args.join(' ')} in ${cwd}`);
  return execFileSync(installedExecutable, args, {
    cwd,
    encoding: 'utf8',
    env: buildChildEnv({ PATH: buildPath(npmBinPath) }),
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function runNpm(args, options) {
  logStep(`npm ${args.join(' ')}`);
  return execFileSync('npm', args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: buildChildEnv(options.env),
  }).trim();
}

function npmEnv({ npmCache, npmPrefix }) {
  return {
    npm_config_cache: npmCache,
    npm_config_prefix: npmPrefix,
  };
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

function buildPath(npmBinPath) {
  return [npmBinPath, process.env.PATH].filter(Boolean).join(path.delimiter);
}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function logStep(message) {
  console.log(`[validate-packed-runtime] ${message}`);
}

main();
