#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function main() {
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
    await validateInstalledModelCatalog(installedPackageRoot);
    runInstalledNodeScript(installedPackageRoot, ['bin/admin/changelog.js', '--help']);
    runInstalledNodeScript(installedPackageRoot, ['bin/admin/release.js', '--help']);

    const fixtureProjectPath = prepareFixtureProject({ workspace, installedPackageRoot });

    const doctorOutput = runInstalledSibu(installedExecutable, ['doctor'], npmBinPath, fixtureProjectPath);
    if (!doctorOutput.includes('Workflow is healthy. No drift detected.')) {
      throw new Error(`Expected healthy doctor output from packed runtime, got:\n${doctorOutput}`);
    }
    const fixtureState = JSON.parse(readFileSync(path.join(fixtureProjectPath, '.sibu', 'state.json'), 'utf8'));
    if ('modelRoutes' in fixtureState) {
      throw new Error('Packed-runtime fixture must remain free of implicit model route selections.');
    }

    const routeFlags = ['--agent', 'codex', '--role', 'implementation-executor', '--workload', 'bounded', '--json'];
    const missing = JSON.parse(runInstalledSibu(installedExecutable, ['models', 'resolve', ...routeFlags], npmBinPath, fixtureProjectPath));
    if (missing.schemaVersion !== 1 || missing.status !== 'missing') throw new Error('Installed route resolve did not return a versioned missing result.');
    const saved = JSON.parse(runInstalledSibu(installedExecutable, [
      'models', 'set', ...routeFlags, '--model', 'packed-external-model', '--reasoning', 'high',
      '--catalog-version', missing.catalog.catalogVersion, '--state-basis', missing.stateBasis,
    ], npmBinPath, fixtureProjectPath));
    if (saved.status !== 'saved') throw new Error('Installed route set did not save the explicit choice.');
    const configured = JSON.parse(runInstalledSibu(installedExecutable, ['models', 'resolve', ...routeFlags], npmBinPath, fixtureProjectPath));
    if (configured.status !== 'configured' || configured.route.model !== 'packed-external-model' || configured.route.reasoningEffort !== 'high') {
      throw new Error('Installed route resolve did not return the explicit saved choice.');
    }
    const guided = runInstalledSibu(installedExecutable, ['models'], npmBinPath, fixtureProjectPath, '4\n3\n20\n');
    if (!guided.includes('Model routes') || !guided.includes('Reset to current recommendation') || !guided.includes('Completed: 1 route.')) {
      throw new Error('Installed guided route review/reset did not complete.');
    }
    const reset = JSON.parse(runInstalledSibu(installedExecutable, ['models', 'resolve', ...routeFlags], npmBinPath, fixtureProjectPath));
    if (reset.status !== 'configured' || reset.origin !== 'recommended') {
      throw new Error('Installed guided reset did not persist the current recommendation.');
    }
    validateInstalledSyncReview({ installedPackageRoot, installedExecutable, npmBinPath, fixtureProjectPath });

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

function validateInstalledSyncReview({ installedPackageRoot, installedExecutable, npmBinPath, fixtureProjectPath }) {
  const catalogPath = path.join(installedPackageRoot, 'bin/modules/template-catalog/model-recommendations.json');
  const baseCatalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const statePath = path.join(fixtureProjectPath, '.sibu/state.json');
  const reviewState = JSON.parse(readFileSync(statePath, 'utf8'));
  reviewState.selectedLanguageSkills = ['typescript'];
  reviewState.managedFiles['AGENTS.md'].status = 'unmanaged';
  reviewState.modelRoutes.push({ ...reviewState.modelRoutes[0], workloadClass: 'demanding',
    model: 'unrelated-external-model', reasoningEffort: 'high', origin: 'user-selected',
    selectedAt: '2026-09-23T00:10:00.000Z' });
  const savedState = `${JSON.stringify(reviewState, null, 2)}\n`;
  for (const rationaleOnly of [false, true]) {
    const catalog = structuredClone(baseCatalog);
    const entry = catalog.recommendations.find((item) => item.role === 'implementation-executor' && item.workloadClass === 'bounded');
    const before = { model: entry.model, reasoningEffort: entry.reasoningEffort, rationale: entry.rationale };
    if (rationaleOnly) {
      entry.rationale = { ...entry.rationale, expectedFit: 'Revised expected-fit guidance for bounded tasks.' };
    } else {
      entry.model = 'gpt-6-sol';
      entry.reasoningEffort = 'medium';
    }
    const reason = rationaleOnly ? 'Fixture research revised expected-fit guidance.'
      : 'Fixture research suggests similar expected fit at lower expected cost.';
    catalog.catalogVersion = '2026-09-23.3';
    catalog.releases = [{ version: catalog.catalogVersion, changes: [{ agentEnvironment: entry.agentEnvironment,
      role: entry.role, workloadClass: entry.workloadClass, before,
      after: { model: entry.model, reasoningEffort: entry.reasoningEffort, rationale: entry.rationale }, reason }] }];
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    runInstalledSyncChoices({ installedExecutable, npmBinPath, fixtureProjectPath, statePath, savedState,
      catalogVersion: catalog.catalogVersion, reason, expectedModel: entry.model,
      expectedEffort: entry.reasoningEffort });
  }
  logStep('Installed sync reviewed model and rationale-only releases without unrelated route changes.');
}

function runInstalledSyncChoices({ installedExecutable, npmBinPath, fixtureProjectPath, statePath, savedState,
  catalogVersion, reason, expectedModel, expectedEffort }) {
  const beforeRoutes = JSON.parse(savedState).modelRoutes;
  for (const [choice, expected] of [['1', 'gpt-6-luna'], ['2', 'gpt-6-sol'], ['3', 'gpt-6-luna']]) {
    writeFileSync(statePath, savedState);
    const input = choice === '1' ? '\r' : choice === '2' ? '\u001b[B\r' : '\u001b[B\u001b[B\r';
    const output = runInstalledSibu(installedExecutable, ['sync'], npmBinPath, fixtureProjectPath, input);
    if (!output.includes('Model recommendation update') || !output.includes(reason)) {
      throw new Error(`Installed sync did not show route-scoped release guidance for choice ${choice}:\n${output}`);
    }
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    const route = state.modelRoutes.find((item) => item.role === 'implementation-executor' && item.workloadClass === 'bounded');
    const unrelated = state.modelRoutes.find((item) => item.role === 'implementation-executor' && item.workloadClass === 'demanding');
    if (state.modelRoutes.length !== beforeRoutes.length || JSON.stringify(unrelated) !== JSON.stringify(beforeRoutes[1])) {
      throw new Error(`Installed sync choice ${choice} changed an unrelated route.`);
    }
    if (choice !== '2' && JSON.stringify(route) !== JSON.stringify(beforeRoutes[0])) {
      throw new Error(`Installed sync choice ${choice} changed the saved route without replacement.`);
    }
    if (route.model !== (choice === '2' ? expectedModel : expected) ||
        route.reasoningEffort !== (choice === '2' ? expectedEffort : 'low')) {
      throw new Error(`Installed sync choice ${choice} changed the route unexpectedly.`);
    }
    if (choice === '2' && (route.origin !== 'recommended' || route.catalogVersionAtSelection !== catalogVersion ||
        route.selectedAt === beforeRoutes[0].selectedAt)) {
      throw new Error('Installed sync replacement did not persist current recommendation metadata.');
    }
    if (choice === '1' && state.modelRouteReviews?.[0]?.catalogVersion !== catalogVersion) {
      throw new Error(`Installed retain did not record a review marker:\n${output}`);
    }
    if (choice === '3' && state.modelRouteReviews?.length) {
      throw new Error('Installed review-later unexpectedly recorded a review marker.');
    }
  }
}

async function validateInstalledModelCatalog(installedPackageRoot) {
  const catalogAsset = path.join(installedPackageRoot, 'bin', 'modules', 'template-catalog', 'model-recommendations.json');
  if (!existsSync(catalogAsset)) {
    throw new Error(`Expected installed model recommendation catalog at ${catalogAsset}.`);
  }

  const catalogModule = await import(pathToFileURL(path.join(installedPackageRoot, 'bin', 'modules', 'template-catalog', 'index.js')).href);
  const catalog = catalogModule.loadModelRecommendationCatalog();
  const bounded = catalogModule.resolveModelRecommendation(catalog, {
    agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded',
  });
  const demanding = catalogModule.resolveModelRecommendation(catalog, {
    agentEnvironment: 'codex', role: 'implementation-planner', workloadClass: 'demanding',
  });
  const highRisk = catalogModule.resolveModelRecommendation(catalog, {
    agentEnvironment: 'codex', role: 'architecture-reviewer', workloadClass: 'high-risk',
  });
  if (catalog.catalogVersion !== '2026-09-23.2' || catalog.reviewedAt !== '2026-09-23T00:00:00.000Z') {
    throw new Error(`Unexpected installed model catalog metadata: ${catalog.catalogVersion}/${catalog.reviewedAt}.`);
  }
  if (catalog.historyBaseVersion !== catalog.catalogVersion || catalog.releases.length !== 0) {
    throw new Error('Installed catalog must not claim undocumented historical recommendation changes.');
  }
  if (bounded.model !== 'gpt-6-luna' || bounded.reasoningEffort !== 'low') {
    throw new Error(`Expected installed bounded recommendation to be GPT-6 Luna/low, got ${bounded.model}/${bounded.reasoningEffort}.`);
  }
  if (demanding.model !== 'gpt-6-sol' || demanding.reasoningEffort !== 'medium') {
    throw new Error(`Expected installed demanding recommendation to be GPT-6 Sol/medium, got ${demanding.model}/${demanding.reasoningEffort}.`);
  }
  if (highRisk.model !== 'gpt-6-astra' || highRisk.reasoningEffort !== 'high') {
    throw new Error(`Expected installed high-risk recommendation to be GPT-6 Astra/high, got ${highRisk.model}/${highRisk.reasoningEffort}.`);
  }
  if (catalog.recommendations.some((entry) => entry.workloadClass !== 'high-risk' && entry.model === 'gpt-6-astra')) {
    throw new Error('Installed catalog must not recommend GPT-6 Astra for bounded or demanding work.');
  }
  logStep('Installed model recommendation catalog resolved all three workload classes.');
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
    selectedArchitectureSkill: 'command-pattern',
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

function runInstalledSibu(installedExecutable, args, npmBinPath, cwd = getRepoRoot(), input) {
  logStep(`Running ${path.basename(installedExecutable)} ${args.join(' ')} in ${cwd}`);
  return execFileSync(installedExecutable, args, {
    cwd,
    encoding: 'utf8',
    env: buildChildEnv({ PATH: buildPath(npmBinPath) }),
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'inherit'],
    input,
  }).trim();
}

function runInstalledNodeScript(installedPackageRoot, scriptArgs) {
  const [relativeScriptPath, ...args] = scriptArgs;
  const scriptPath = path.join(installedPackageRoot, relativeScriptPath);

  if (!existsSync(scriptPath)) {
    throw new Error(`Expected installed admin entrypoint at ${scriptPath}.`);
  }

  logStep(`Running node ${scriptArgs.join(' ')} in installed package`);
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: installedPackageRoot,
    encoding: 'utf8',
    env: buildChildEnv(),
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

await main();
