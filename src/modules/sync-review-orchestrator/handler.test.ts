import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import type { SibuState } from '../../shared/types.js';
import { sha256 } from '../../shared/hash.js';
import { inspectWorkflow } from '../workflow-health-inspector/index.js';
import { lookupSkillIdentity, parseSkillRetirements } from '../template-catalog/index.js';
import { reviewRetiredSkills } from './retired-skill-review-adapters.js';
import { createRetiredSkillFileAdapter } from './retired-skill-file-adapter.js';
import type { RetiredSkillReviewChoice } from './retired-skill-review-command.js';
import { SELECTABLE_ARCHITECTURE_SKILLS, SUPPORTED_AGENTS, getWorkflowTargets, renderMissingWorkflowFiles } from '../template-catalog/index.js';
import { writeSibuState } from '../workflow-state-ledger/index.js';
import { getSyncVersionAdvisoryLines, handleSyncProject as runSyncProject } from './handler.js';

const handleSyncProject = (command: Parameters<typeof runSyncProject>[0], dependencies: Parameters<typeof runSyncProject>[1] = {}) =>
  runSyncProject(command, { checkForLatestSibuVersion: async () => ({
    status: 'unavailable', checkedAt: '2026-01-01T00:00:00Z', packageName: '@juancr11/sibu', source: 'override', reason: 'override',
  }), ...dependencies });

it('sync advises package update only when a newer version is known', () => {
  const available = getSyncVersionAdvisoryLines({
    status: 'update-available', checkedAt: '2026-01-01T00:00:00Z', currentVersion: '1.1.0', latestVersion: '1.2.0',
    packageName: '@juancr11/sibu', source: 'live',
  });
  assert.match(available.join(' '), /npm install -g @juancr11\/sibu.*updating Sibu is how you get Sibu Evals fixes/);
  assert.deepEqual(getSyncVersionAdvisoryLines({
    status: 'unavailable', checkedAt: '2026-01-01T00:00:00Z', packageName: '@juancr11/sibu', source: 'override', reason: 'override',
  }), []);
});

const temporaryRoots: string[] = [];
const originalCwd = process.cwd();
const LEGACY_AGENT_ID = 'legacy-agent';
const LEGACY_ONLY_FILE = '.legacy-agent/settings.json';

const retiredSkills = parseSkillRetirements({ schemaVersion: 1, retirements: ['old-a', 'old-b'].map((id) => ({
  id, category: 'workflow', explanation: `${id} is retired`, formerTemplateRelativePath: `skills/${id}/SKILL.md`,
  formerTargetsByAgent: { codex: [`.agents/skills/${id}/SKILL.md`], gemini: [`.gemini/skills/${id}/SKILL.md`],
    claude: [`.claude/skills/${id}/SKILL.md`] },
  generatedRoutingTargetsByAgent: { codex: ['AGENTS.md'], gemini: ['GEMINI.md'], claude: ['CLAUDE.md'] },
})) });

function retiredFixture(options: { unsafeShared?: boolean } = {}) {
  const root = createCleanInitializedRepo(SELECTABLE_ARCHITECTURE_SKILLS[0]);
  const statePath = path.join(root, '.sibu/state.json');
  const state = readState(root);
  state.selectedWorkflowSkills = ['old-a', 'old-b'] as unknown as SibuState['selectedWorkflowSkills'];
  const routing = `${fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8')}\n- old-a guidance\n${options.unsafeShared ? 'old-b guidance spans unowned lines' : '- old-b guidance'}\n`;
  fs.writeFileSync(path.join(root, 'AGENTS.md'), routing);
  state.managedFiles['AGENTS.md'].sha256 = sha256(routing);
  for (const id of ['old-a', 'old-b']) {
    const relativePath = `.agents/skills/${id}/SKILL.md`;
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${id} content\n`);
    state.managedFiles[relativePath] = { template: `skills/${id}/SKILL.md`, templateVersion: '1', sha256: sha256(`${id} content\n`) };
  }
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  const inspect = (actual: SibuState) => inspectWorkflow({ type: 'inspect-workflow' }, actual, {
    resolveSkill: (id) => lookupSkillIdentity(id, retiredSkills), retirements: () => retiredSkills,
    exists: (relativePath) => fs.existsSync(path.join(root, relativePath)),
    readText: (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8'),
  });
  return { root, statePath, inspect, findingIds: () => inspect(readState(root)).findings
    .filter((finding) => finding.kind === 'retired-skill').map((finding) => finding.skillId) };
}

it('reviews multiple retirements before ordinary sync, preserving kept shared routing and doctor finding across runs', async () => {
  const fixture = retiredFixture();
  process.chdir(fixture.root);
  const ordinaryMissingPath = '.agents/skills/clean-code/SKILL.md';
  fs.rmSync(path.join(fixture.root, ordinaryMissingPath));
  const order: string[] = [];
  const choices: RetiredSkillReviewChoice[] = ['clean-up', 'keep', 'keep'];
  const review = (root: string, statePath: string) => reviewRetiredSkills(root, statePath, {
    retirements: () => retiredSkills, inspect: (state) => fixture.inspect(state), interaction: {
      summary: (ids) => order.push(`summary:${ids.join(',')}`),
      choose: async (preview) => { order.push(`choice:${preview.skillId}`); return choices.shift()!; },
      outcome: () => {},
    },
  });
  const ordinary: string[] = [];
  const deps = { renderIntro: async () => {}, reviewRetiredSkills: review,
    askForNewLanguageSkills: async (state: SibuState) => { ordinary.push('ordinary'); return { state, changedState: false }; },
    askForMissingFrameworkSkills: async (state: SibuState) => ({ state, changedState: false }),
    askForNewArchitectureSkill: async (state: SibuState) => ({ state, changedState: false }),
    askForSyncAction: async (preview: { relativePath: string }) => { ordinary.push(preview.relativePath); return 'skip' as const; },
    reviewProjectModelRoutes: (() => ({ status: 'preview', notices: [], reviewUnavailable: false })) as never,
  };
  await handleSyncProject({ type: 'sync' }, deps);
  assert.deepEqual(order, ['summary:old-a,old-b', 'choice:old-a', 'choice:old-b']);
  assert.equal(order.at(-1), 'choice:old-b');
  assert.equal(ordinary[0], 'ordinary');
  assert.equal(ordinary.includes(ordinaryMissingPath), true);
  assert.equal(ordinary.includes('AGENTS.md'), false);
  assert.equal(ordinary.includes('.agents/skills/old-a/SKILL.md'), false);
  assert.equal(fs.existsSync(path.join(fixture.root, '.agents/skills/old-a/SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(fixture.root, '.agents/skills/old-b/SKILL.md')), true);
  assert.match(fs.readFileSync(path.join(fixture.root, 'AGENTS.md'), 'utf8'), /- old-b guidance/);
  assert.deepEqual(readState(fixture.root).selectedWorkflowSkills, ['old-b']);
  assert.deepEqual(fixture.findingIds(), ['old-b']);
  ordinary.length = 0;
  await handleSyncProject({ type: 'sync' }, deps);
  assert.deepEqual(order.slice(-2), ['summary:old-b', 'choice:old-b']);
  assert.equal(ordinary.includes('AGENTS.md'), false);
  assert.match(fs.readFileSync(path.join(fixture.root, 'AGENTS.md'), 'utf8'), /- old-b guidance/);
  assert.deepEqual(fixture.findingIds(), ['old-b']);
});

it('cancelled retirement review stops before ordinary sync without changing files or findings', async () => {
  const fixture = retiredFixture();
  process.chdir(fixture.root);
  const before = fs.readFileSync(fixture.statePath, 'utf8');
  const routing = fs.readFileSync(path.join(fixture.root, 'AGENTS.md'), 'utf8');
  let ordinary = false;
  await handleSyncProject({ type: 'sync' }, {
    renderIntro: async () => {},
    reviewRetiredSkills: (root, statePath) => reviewRetiredSkills(root, statePath, {
      retirements: () => retiredSkills, inspect: (state) => fixture.inspect(state),
      interaction: { summary: () => {}, choose: async () => 'cancel', outcome: () => {} },
    }),
    askForNewLanguageSkills: async (state) => { ordinary = true; return { state, changedState: false }; },
  });
  assert.equal(ordinary, false);
  assert.equal(process.exitCode, 1);
  assert.equal(fs.readFileSync(fixture.statePath, 'utf8'), before);
  assert.equal(fs.readFileSync(path.join(fixture.root, 'AGENTS.md'), 'utf8'), routing);
  assert.deepEqual(fixture.findingIds(), ['old-a', 'old-b']);
});

it('unsafe shared routing preservation blocks before ordinary sync can erase kept guidance', async () => {
  const fixture = retiredFixture({ unsafeShared: true });
  process.chdir(fixture.root);
  const routing = fs.readFileSync(path.join(fixture.root, 'AGENTS.md'), 'utf8');
  let ordinary = false;
  await handleSyncProject({ type: 'sync' }, {
    renderIntro: async () => {},
    reviewRetiredSkills: (root, statePath) => reviewRetiredSkills(root, statePath, {
      retirements: () => retiredSkills, inspect: (state) => fixture.inspect(state),
      interaction: { summary: () => {}, choose: async () => 'clean-up', outcome: () => {} },
    }),
    askForNewLanguageSkills: async (state) => { ordinary = true; return { state, changedState: false }; },
  });
  assert.equal(ordinary, false);
  assert.equal(process.exitCode, 1);
  assert.equal(fs.readFileSync(path.join(fixture.root, 'AGENTS.md'), 'utf8'), routing);
  assert.deepEqual(fixture.findingIds(), ['old-a', 'old-b']);
});

it('unknown recorded skill is never offered as retired cleanup', async () => {
  const fixture = retiredFixture();
  const state = readState(fixture.root);
  state.selectedWorkflowSkills = [...(state.selectedWorkflowSkills ?? []), 'unknown-skill' as never];
  fs.writeFileSync(fixture.statePath, `${JSON.stringify(state, null, 2)}\n`);
  const chosen: string[] = [];
  const result = await reviewRetiredSkills(fixture.root, fixture.statePath, {
    retirements: () => retiredSkills, inspect: (current) => fixture.inspect(current),
    interaction: { summary: () => {}, choose: async (preview) => { chosen.push(preview.skillId); return 'keep'; }, outcome: () => {} },
  });
  assert.equal(result.status, 'ready');
  assert.deepEqual(chosen, ['old-a', 'old-b']);
  assert.equal(fixture.inspect(readState(fixture.root)).findings.some((finding) =>
    finding.kind === 'unrecognized-skill' && finding.skillId === 'unknown-skill'), true);
});

it('partial cleanup stops ordinary sync and the next run uses observed state rather than assuming completion', async () => {
  const fixture = retiredFixture();
  process.chdir(fixture.root);
  let ordinary = false;
  const review = (root: string, statePath: string) => reviewRetiredSkills(root, statePath, {
    retirements: () => retiredSkills, inspect: (state) => fixture.inspect(state),
    createFiles: (projectRoot, projectStatePath) => {
      const actual = createRetiredSkillFileAdapter(projectRoot, projectStatePath);
      return { ...actual, state: { ...actual.state, checkpoint: () => 'stale' as const } };
    },
    interaction: { summary: () => {}, choose: async () => 'clean-up', outcome: () => {} },
  });
  await handleSyncProject({ type: 'sync' }, { renderIntro: async () => {}, reviewRetiredSkills: review,
    askForNewLanguageSkills: async (state) => { ordinary = true; return { state, changedState: false }; } });
  assert.equal(ordinary, false);
  assert.equal(process.exitCode, 1);
  assert.equal(fs.existsSync(path.join(fixture.root, '.agents/skills/old-a/SKILL.md')), false);
  assert.equal(readState(fixture.root).managedFiles['.agents/skills/old-a/SKILL.md'] !== undefined, true);
  const second = await reviewRetiredSkills(fixture.root, fixture.statePath, {
    retirements: () => retiredSkills, inspect: (state) => fixture.inspect(state),
    interaction: { summary: () => {}, choose: async () => 'clean-up', outcome: () => {} },
  });
  assert.equal(second.status, 'stopped');
  assert.deepEqual(fixture.findingIds(), ['old-a', 'old-b']);
});

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = undefined;

  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('handleSyncProject unsupported-agent cleanup', () => {
  it('declined cleanup leaves files and state unchanged and stops sync', async () => {
    const rootPath = createLegacyOnlyRepo();
    process.chdir(rootPath);
    const statePath = path.join(rootPath, '.sibu/state.json');
    const beforeState = fs.readFileSync(statePath, 'utf8');
    const beforeAgents = fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8');
    const beforeLegacyFile = fs.readFileSync(path.join(rootPath, LEGACY_ONLY_FILE), 'utf8');
    let askedForCleanup = false;
    let continuedToNormalSync = false;

    await handleSyncProject(
      { type: 'sync' },
      {
        renderIntro: async () => {},
        checkForLatestSibuVersion: async () => { throw new Error('network unavailable'); },
        askForUnsupportedAgentCleanup: async () => {
          askedForCleanup = true;
          return false;
        },
        askForNewLanguageSkills: async (state) => {
          continuedToNormalSync = true;
          return { state, changedState: false };
        },
      }
    );

    assert.equal(askedForCleanup, true);
    assert.equal(continuedToNormalSync, false);
    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(statePath, 'utf8'), beforeState);
    assert.equal(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), beforeAgents);
    assert.equal(fs.readFileSync(path.join(rootPath, LEGACY_ONLY_FILE), 'utf8'), beforeLegacyFile);
  });

  it('accepted cleanup with no supported agents removes managed files and state without normal sync', async () => {
    const rootPath = createLegacyOnlyRepo();
    process.chdir(rootPath);
    let continuedToNormalSync = false;

    await handleSyncProject(
      { type: 'sync' },
      {
        renderIntro: async () => {},
        askForUnsupportedAgentCleanup: async () => true,
        askForNewLanguageSkills: async (state) => {
          continuedToNormalSync = true;
          return { state, changedState: false };
        },
      }
    );

    assert.equal(continuedToNormalSync, false);
    assert.equal(process.exitCode, undefined);
    assert.equal(fs.existsSync(path.join(rootPath, '.sibu/state.json')), false);
    assert.equal(fs.existsSync(path.join(rootPath, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(rootPath, LEGACY_ONLY_FILE)), false);
  });
});

describe('handleSyncProject missing architecture repair', () => {
  it('reports incomplete sync when route history is unavailable and no notices remain', async () => {
    const rootPath = createCleanInitializedRepo(SELECTABLE_ARCHITECTURE_SKILLS[0]);
    process.chdir(rootPath);
    const before = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');
    let prompted = false;
    await handleSyncProject({ type: 'sync' }, {
      renderIntro: async () => {},
      askForNewLanguageSkills: async (state) => ({ state, changedState: false }),
      askForMissingFrameworkSkills: async (state) => ({ state, changedState: false }),
      askForNewArchitectureSkill: async (state) => ({ state, changedState: false }),
      reviewProjectModelRoutes: (() => ({ status: 'preview', notices: [], reviewUnavailable: true })) as never,
      askForModelRouteReview: async () => { prompted = true; return 'later'; },
    });
    assert.equal(prompted, false);
    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), before);
  });
  it('reviews model changes even when no template update is actionable', async () => {
    const rootPath = createCleanInitializedRepo(SELECTABLE_ARCHITECTURE_SKILLS[0]);
    process.chdir(rootPath);
    const before = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');
    let prompted = false;
    let decided = false;
    await handleSyncProject({ type: 'sync' }, {
      renderIntro: async () => {},
      askForNewLanguageSkills: async (state) => ({ state, changedState: false }),
      askForMissingFrameworkSkills: async (state) => ({ state, changedState: false }),
      askForNewArchitectureSkill: async (state) => ({ state, changedState: false }),
      reviewProjectModelRoutes: ((command: { type: string }) => {
        if (command.type === 'preview') return { status: 'preview', notices: decided ? [] : [{
          route: { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded', model: 'old',
            reasoningEffort: 'low', origin: 'user-selected', selectedAt: '2026-09-23T00:00:00.000Z', catalogVersionAtSelection: '2026-09-23.2' },
          recommendation: { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded', model: 'new',
            reasoningEffort: 'medium', rationale: { expectedFit: 'Fit.', relativeCost: 'Cost.', relativeSpeed: 'Speed.', nonGuarantee: 'Not a guarantee.' } },
          reasons: ['Revised cost guidance.'], catalogVersion: '2026-09-23.3', stateBasis: 'a'.repeat(64),
        }], reviewUnavailable: false };
        decided = true;
        return { status: 'later' };
      }) as never,
      askForModelRouteReview: async () => { prompted = true; return 'later'; },
    });
    assert.equal(prompted, true);
    assert.equal(decided, true);
    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), before);
  });
  it('keeps sync incomplete when the same route conflicts twice', async () => {
    const rootPath = createCleanInitializedRepo(SELECTABLE_ARCHITECTURE_SKILLS[0]);
    process.chdir(rootPath);
    const before = fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8');
    const notice = {
      route: { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded', model: 'old',
        reasoningEffort: 'low', origin: 'user-selected', selectedAt: '2026-09-23T00:00:00.000Z', catalogVersionAtSelection: '2026-09-23.2' },
      recommendation: { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded', model: 'new',
        reasoningEffort: 'medium', rationale: { expectedFit: 'Fit.', relativeCost: 'Cost.', relativeSpeed: 'Speed.', nonGuarantee: 'Not a guarantee.' } },
      reasons: ['Revised cost guidance.'], catalogVersion: '2026-09-23.3', stateBasis: 'a'.repeat(64),
    };
    let prompts = 0;
    let conflicts = 0;
    await handleSyncProject({ type: 'sync' }, {
      renderIntro: async () => {},
      askForNewLanguageSkills: async (state) => ({ state, changedState: false }),
      askForMissingFrameworkSkills: async (state) => ({ state, changedState: false }),
      askForNewArchitectureSkill: async (state) => ({ state, changedState: false }),
      reviewProjectModelRoutes: ((command: { type: string }) => {
        if (command.type === 'preview') return { status: 'preview', notices: [notice], reviewUnavailable: false };
        conflicts++;
        return { status: 'conflict' };
      }) as never,
      askForModelRouteReview: async () => { prompts++; return 'replace'; },
    });
    assert.equal(prompts, 2);
    assert.equal(conflicts, 2);
    assert.equal(process.exitCode, 1);
    assert.equal(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'), before);
  });
  it('requires architecture selection, updates state, and applies normal architecture previews', async () => {
    const rootPath = createCleanInitializedRepo();
    process.chdir(rootPath);
    const selectedArchitectureSkill = SELECTABLE_ARCHITECTURE_SKILLS[1];
    let askedForArchitectureRepair = false;

    await handleSyncProject(
      { type: 'sync' },
      {
        renderIntro: async () => {},
        askForNewLanguageSkills: async (state) => ({ state, changedState: false }),
        askForMissingFrameworkSkills: async (state) => ({ state, changedState: false }),
        askForNewArchitectureSkill: async (state) => {
          askedForArchitectureRepair = true;
          return {
            state: {
              ...state,
              selectedArchitectureSkill: selectedArchitectureSkill.id,
              updatedAt: new Date().toISOString(),
            },
            changedState: true,
          };
        },
        askForSyncAction: async () => 'apply-update',
      }
    );

    const state = readState(rootPath);
    const architectureTargetPath = selectedArchitectureSkill.targetRelativePathsByAgent.codex;

    assert.equal(askedForArchitectureRepair, true);
    assert.equal(process.exitCode, undefined);
    assert.equal(state.selectedArchitectureSkill, selectedArchitectureSkill.id);
    assert.ok(architectureTargetPath);
    assert.equal(fs.existsSync(path.join(rootPath, architectureTargetPath)), true);
    assert.equal(state.managedFiles[architectureTargetPath]?.template, selectedArchitectureSkill.templateRelativePath);
  });

  it('preserves existing architecture selection when no repair change is returned', async () => {
    const rootPath = createCleanInitializedRepo(SELECTABLE_ARCHITECTURE_SKILLS[0]);
    process.chdir(rootPath);
    let askedForArchitectureRepair = false;

    await handleSyncProject(
      { type: 'sync' },
      {
        renderIntro: async () => {},
        askForNewLanguageSkills: async (state) => ({ state, changedState: false }),
        askForMissingFrameworkSkills: async (state) => ({ state, changedState: false }),
        askForNewArchitectureSkill: async (state) => {
          askedForArchitectureRepair = true;
          return { state, changedState: false };
        },
      }
    );

    assert.equal(askedForArchitectureRepair, true);
    assert.equal(readState(rootPath).selectedArchitectureSkill, SELECTABLE_ARCHITECTURE_SKILLS[0].id);
  });
});

function createLegacyOnlyRepo(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-sync-handler-unsupported-agent-'));
  temporaryRoots.push(rootPath);
  fs.mkdirSync(path.join(rootPath, '.sibu'), { recursive: true });
  fs.writeFileSync(path.join(rootPath, 'AGENTS.md'), 'legacy agents\n', 'utf8');
  fs.mkdirSync(path.dirname(path.join(rootPath, LEGACY_ONLY_FILE)), { recursive: true });
  fs.writeFileSync(path.join(rootPath, LEGACY_ONLY_FILE), '{}\n', 'utf8');

  const state: SibuState = {
    sibuVersion: '0.0.0',
    templateVersion: '1',
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selectedAgents: [LEGACY_AGENT_ID],
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    managedFiles: {
      'AGENTS.md': {
        template: 'AGENTS.md',
        templateVersion: '1',
        sha256: 'legacy-agents-hash',
      },
      [LEGACY_ONLY_FILE]: {
        template: 'legacy-agent/settings.json',
        templateVersion: '1',
        sha256: 'legacy-hash',
      },
    },
  };
  fs.writeFileSync(path.join(rootPath, '.sibu/state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  return rootPath;
}

function createCleanInitializedRepo(selectedArchitectureSkill?: (typeof SELECTABLE_ARCHITECTURE_SKILLS)[number]): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-sync-handler-architecture-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex')];
  const targets = getWorkflowTargets(rootPath, selectedAgents, [], [], selectedArchitectureSkill);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedArchitectureSkill,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }

  writeSibuState({
    rootPath,
    statePath: path.join(rootPath, '.sibu/state.json'),
    selectedAgents,
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedArchitectureSkill,
    targets,
  });

  return rootPath;
}

function readState(rootPath: string): SibuState {
  return JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
}

function getSupportedAgent(agentId: (typeof SUPPORTED_AGENTS)[number]['id']): (typeof SUPPORTED_AGENTS)[number] {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}
