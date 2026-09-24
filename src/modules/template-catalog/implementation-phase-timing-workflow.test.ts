import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
// @ts-expect-error The installed managed helper intentionally has no TypeScript declaration artifact.
import { reconcile as reconcileInstalledTiming } from '../../../.agents/scripts/implementation-phase-timing.mjs';

import {
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_WORKFLOW_SKILLS,
  SUPPORTED_AGENTS,
  getWorkflowTargets,
  readTemplate,
  renderTemplateForSync,
} from './index.js';

const EXECUTOR_TEMPLATE = 'skills/ai-implementation-plan-executor/SKILL.md';
const PLANNER_TOOLBOX_TEMPLATE = 'skills/ai-implementation-planner-toolbox/SKILL.md';
const EXECUTOR_TOOLBOX_TEMPLATE = 'skills/ai-implementation-executor-toolbox/SKILL.md';
const TIMING_HELPER_TARGET = '.agents/scripts/implementation-phase-timing.mjs';
const CANONICAL_PHASES = [
  'preparation_context',
  'planning',
  'implementation',
  'focused_validation',
  'aggregate_validation',
  'specialist_review',
  'repair',
  'orchestration_overhead',
];

describe('implementation workflow timing contract', () => {
  it('defines the run boundary, phase ledger, source precedence, and exactly-once transition delivery', () => {
    const executor = readTemplate(EXECUTOR_TEMPLATE);

    assert.match(executor, /immediately after accepting one story or plan target and before `preparation_context`/);
    assert.match(executor, /immediately before presenting the first human story-review packet/);
    assert.match(executor, /Human reading, discussion, decisions, approval metadata, commit, and continuation are outside that run/);
    assert.match(executor, /later human-authorized repair starts separately bounded continuation timing/);
    assert.match(executor, /never include the intervening human pause in active automation/);
    for (const phase of CANONICAL_PHASES) {
      assert.match(executor, new RegExp(`\\b${phase}\\b`));
    }
    assert.match(executor, /ordered, non-overlapping top-level occurrences/);
    assert.match(executor, /Omit phases that do not occur/);
    assert.match(executor, /host-native absolute timestamp[\s\S]*implementation-phase-timing\.mjs clock/);
    assert.match(executor, /Never estimate missing timing/);
    assert.match(executor, /Separate boundary ownership from user-visible delivery/);
    assert.match(executor, /any usable sub-agent spawn capability[\s\S]*Do not choose inline execution merely because worker progress is completion-only/);
    assert.match(executor, /selected transition-delivery route:[\s\S]*sole user-visible delivery owner/);
    assert.match(executor, /Direct foreground progress:[\s\S]*worker is the sole delivery owner/);
    assert.match(executor, /Main-mediated foreground progress:[\s\S]*main is the sole user-visible delivery owner/);
    assert.match(executor, /Completion-only evidence:[\s\S]*delegate normally/);
    assert.match(executor, /Inline fallback:[\s\S]*spawning or resuming is unavailable or blocked/);
    assert.match(executor, /Completion-only delivery may omit those live transitions and must not change who executes the work/);
    assert.match(executor, /Track delivered `\(phase, occurrence, edge\)` keys/);
    assert.match(executor, /evidence remains authoritative[\s\S]*not a substitute for live transition delivery/);
    assert.match(executor, /main executor owns run-level occurrence identity/);
    assert.match(executor, /per-phase next-occurrence counter/);
    assert.match(executor, /reserve and pass the next run-level number/);
    assert.match(executor, /Never accept a fresh worker's reset local occurrence numbering as run-level identity/);
    assert.match(executor, /exactly-once transition identity is `\(phase, run-level occurrence, edge\)`/);
  });

  it('covers final, partial, failure, privacy, concurrency, and repeated-cycle scenarios', () => {
    const executor = readTemplate(EXECUTOR_TEMPLATE);

    assert.match(executor, /total wall-clock duration/);
    assert.match(executor, /dominant or tied phases/);
    assert.match(executor, /orchestration overhead/);
    assert.match(executor, /`failed`, `blocked`, `interrupted`, or `cancelled`/);
    assert.match(executor, /last active phase/);
    assert.match(executor, /Abrupt host termination may prevent any partial report/);
    assert.match(executor, /unavailable reviewer/);
    assert.match(executor, /invalid, reversed, privacy-unsafe, or missing nested evidence/);
    assert.match(executor, /architecture-reviewer.*technical-lead-reviewer[\s\S]*never add child durations/i);
    assert.match(executor, /sequential fallback[\s\S]*ordered specialist-review occurrences/i);
    assert.match(executor, /Record every human-authorized repair and revalidation occurrence in order within its bounded continuation/);
    assert.match(executor, /Never combine runs across human pauses into one continuous duration/);
    assert.match(executor, /Every completed or partial summary[\s\S]*privacy-safe warning/);
    assert.match(executor, /unavailable, incomplete, invalid, or rejected/);
    assert.match(executor, /timing evidence is incomplete and some durations are unavailable/);
    assert.match(executor, /without naming its source or echoing payload content/);
    assert.match(executor, /warning[\s\S]*never block or alter the workflow/);
    assert.match(executor, /prompts, source content, commands, paths, secrets[\s\S]*tokens, costs/);
    assert.match(executor, /Never write it to repository files, Sibu state, logs, caches, or analytics/);
  });

  it('keeps timing observational and preserves review and approval invariants', () => {
    const executor = readTemplate(EXECUTOR_TEMPLATE);

    assert.match(executor, /must never change execution order, validation, reviewer availability handling, human repair authorization/);
    assert.match(executor, /Timing does not alter immutable review snapshots or authorize another repair/);
    assert.match(executor, /Automated outcomes never authorize approval metadata, commits, or feature continuation/);
    assert.match(executor, /After every completed review round, including matching approvals or minor-only outcomes/);
    assert.match(executor, /Never run an implementation or repair executor while a reviewer is active/);
    assert.match(executor, /There is no automatic repair loop or fixed repair-round cap/);
    assert.match(executor, /exactly one final validation strategy/);
    assert.match(executor, /do not separately repeat standalone checks whose responsibilities it covers/i);
    assert.match(executor, /human story review/i);
    assert.match(executor, /All implementation and repair execution stays in the foreground/);
    assert.match(executor, /Completion-only worker:[\s\S]*spawn the usable worker/);
    assert.match(executor, /Inline compressed-context fallback:[\s\S]*only when spawning or resuming is unavailable or blocked/);
  });
});

describe('implementation worker timing evidence', () => {
  it('gives planner and executor workers bounded message-only handoffs', () => {
    const planner = renderToolbox(PLANNER_TOOLBOX_TEMPLATE);
    const executor = renderToolbox(EXECUTOR_TOOLBOX_TEMPLATE);

    assert.match(planner, /timing-only child evidence item/);
    assert.match(planner, /`workerLabel: implementation-planner`/);
    assert.match(planner, /Do not include `phase` or `occurrence`/);
    assert.match(planner, /sole authoritative top-level planning boundary/);

    assert.match(executor, /Own the boundaries and evidence for each applicable worker phase/);
    assert.match(executor, /selects one delivery route for each occurrence/);
    assert.match(executor, /selected transition-delivery route:[\s\S]*exactly one owner for any available user-visible delivery/);
    assert.match(executor, /emit concise start and finish transitions directly to the user[\s\S]*foreground progress channel[\s\S]*completion packet/);
    assert.match(executor, /Completion-only timing must not block delegation or change who executes the work/);
    assert.match(executor, /Never emit both ways, refresh timers, detach work, or run in the background/);
    assert.match(executor, /handoff is reconciliation evidence, not permission to replay user-visible transitions/);
    assert.match(executor, /main executor owns run-level occurrence identity/);
    assert.match(executor, /packet's reserved run-level number/);
    assert.match(executor, /unanticipated occurrence[\s\S]*local order[\s\S]*remapping/);
    assert.match(executor, /`\(phase, assigned run-level occurrence, edge\)` as the transition key/);
    assert.match(executor, /delivered-key set[\s\S]*no duplicate/);
    assert.match(executor, /`implementation`, `focused_validation`, and `aggregate_validation`/);
    assert.match(executor, /`repair` followed by its `focused_validation` or `aggregate_validation` revalidation occurrences/);
    assert.match(executor, /Each occurrence contains only `phase`, `occurrence`, `startedAtEpochMs`, `finishedAtEpochMs`, and `outcome`/);
    assert.match(executor, /Validation intervals are exclusive/);
    assert.match(executor, /blocker or failure returns valid completed occurrences plus an `incomplete` active occurrence only when both boundaries are known/);

    for (const toolbox of [planner, executor]) {
      assert.match(toolbox, /handoff message only/);
      assert.match(toolbox, /Never add source, provenance, or availability fields/);
      assert.match(toolbox, /Never persist|Do not persist/);
      assert.match(toolbox, /prompts, source content, commands, paths, secrets/);
      assert.match(toolbox, /Timing failure never changes|never .*block work because timing/i);
    }
  });

  it('maps representative worker handoffs through the installed reconciliation helper', () => {
    const result = reconcileInstalledTiming({
      startedAtEpochMs: 0,
      finishedAtEpochMs: 1_000,
      outcome: 'completed',
      phases: [
        {
          phase: 'planning', occurrence: 1, startedAtEpochMs: 0, finishedAtEpochMs: 100, outcome: 'completed',
          children: [
            { workerLabel: 'implementation-planner', startedAtEpochMs: 10, finishedAtEpochMs: 90, outcome: 'completed' },
          ],
        },
        { phase: 'implementation', occurrence: 1, startedAtEpochMs: 100, finishedAtEpochMs: 300, outcome: 'completed' },
        { phase: 'focused_validation', occurrence: 1, startedAtEpochMs: 300, finishedAtEpochMs: 400, outcome: 'completed' },
        { phase: 'aggregate_validation', occurrence: 1, startedAtEpochMs: 400, finishedAtEpochMs: 500, outcome: 'completed' },
        {
          phase: 'specialist_review', occurrence: 1, startedAtEpochMs: 500, finishedAtEpochMs: 700, outcome: 'completed',
          children: [
            { workerLabel: 'architecture-reviewer', startedAtEpochMs: 500, finishedAtEpochMs: 680, outcome: 'completed' },
            { workerLabel: 'technical-lead-reviewer', elapsedMs: 190, outcome: 'completed' },
          ],
        },
        { phase: 'repair', occurrence: 1, startedAtEpochMs: 700, finishedAtEpochMs: 800, outcome: 'completed' },
        { phase: 'focused_validation', occurrence: 2, startedAtEpochMs: 800, finishedAtEpochMs: 900, outcome: 'completed' },
        { phase: 'aggregate_validation', occurrence: 2, startedAtEpochMs: 900, finishedAtEpochMs: 1_000, outcome: 'completed' },
      ],
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.totalDurationMs, 1_000);
    assert.equal(result.orchestrationOverheadMs, 0);
    assert.equal(result.phases[2].occurrences.length, 2);
    assert.equal(result.phases[4].occurrences[0].children.length, 2);
  });

  it('keeps occurrence identities and transition keys unique across repeated authorized continuations', () => {
    const repeatedPhases = [
      { phase: 'repair', occurrence: 1, startedAtEpochMs: 0, finishedAtEpochMs: 100, outcome: 'completed' },
      { phase: 'focused_validation', occurrence: 1, startedAtEpochMs: 100, finishedAtEpochMs: 150, outcome: 'completed' },
      { phase: 'aggregate_validation', occurrence: 1, startedAtEpochMs: 150, finishedAtEpochMs: 200, outcome: 'completed' },
      { phase: 'repair', occurrence: 2, startedAtEpochMs: 200, finishedAtEpochMs: 300, outcome: 'completed' },
      { phase: 'focused_validation', occurrence: 2, startedAtEpochMs: 300, finishedAtEpochMs: 350, outcome: 'completed' },
      { phase: 'aggregate_validation', occurrence: 2, startedAtEpochMs: 350, finishedAtEpochMs: 400, outcome: 'completed' },
      { phase: 'repair', occurrence: 3, startedAtEpochMs: 400, finishedAtEpochMs: 500, outcome: 'completed' },
      { phase: 'focused_validation', occurrence: 3, startedAtEpochMs: 500, finishedAtEpochMs: 550, outcome: 'completed' },
      { phase: 'aggregate_validation', occurrence: 3, startedAtEpochMs: 550, finishedAtEpochMs: 600, outcome: 'completed' },
    ] as const;
    const result = reconcileInstalledTiming({
      startedAtEpochMs: 0,
      finishedAtEpochMs: 600,
      outcome: 'completed',
      phases: repeatedPhases,
    });
    const transitionKeys = repeatedPhases.flatMap(({ phase, occurrence }) =>
      [`${phase}:${occurrence}:start`, `${phase}:${occurrence}:finish`],
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(new Set(transitionKeys).size, transitionKeys.length);
    assert.deepEqual(result.phases.find(({ phase }: { phase: string }) => phase === 'repair')?.occurrences
      .map(({ occurrence }: { occurrence: number }) => occurrence), [1, 2, 3]);
    assert.deepEqual(result.phases.find(({ phase }: { phase: string }) => phase === 'focused_validation')?.occurrences
      .map(({ occurrence }: { occurrence: number }) => occurrence), [1, 2, 3]);
    assert.deepEqual(result.phases.find(({ phase }: { phase: string }) => phase === 'aggregate_validation')?.occurrences
      .map(({ occurrence }: { occurrence: number }) => occurrence), [1, 2, 3]);
  });

  it('states the exact helper outcome vocabulary and keeps source mechanics out of evidence', () => {
    const executor = readTemplate(EXECUTOR_TEMPLATE);
    const planner = renderToolbox(PLANNER_TOOLBOX_TEMPLATE);
    const worker = renderToolbox(EXECUTOR_TOOLBOX_TEMPLATE);

    for (const contract of [executor, planner, worker]) {
      assert.match(contract, /`completed`, `failed`, `blocked`, `interrupted`, `cancelled`, and `incomplete`/);
    }
    for (const toolbox of [planner, worker]) {
      assert.doesNotMatch(toolbox, /source availability|timing-source availability|availability\/provenance/);
    }
    assert.match(executor, /Timing-source selection is private orchestration detail/);
    assert.match(executor, /never add source, provenance, or availability fields to helper payloads, worker evidence, or summaries/);
  });
});

describe('cross-agent timing distribution', () => {
  it('installs one shared helper and delivery contract for every supported host', () => {
    const executorContract = readTemplate(EXECUTOR_TEMPLATE);
    const workerContract = renderToolbox(EXECUTOR_TOOLBOX_TEMPLATE);

    for (const agent of SUPPORTED_AGENTS) {
      const targets = getWorkflowTargets('/test-project', [agent]);
      const targetPaths = targets.map(({ targetPath }) => path.relative('/test-project', targetPath));

      assert.equal(targetPaths.filter((target) => target === TIMING_HELPER_TARGET).length, 1, agent.id);
      assert.equal(targetPaths.includes('.agents/skills/ai-implementation-plan-executor/SKILL.md'), true, agent.id);
      assert.equal(targetPaths.includes('.agents/skills/ai-implementation-planner-toolbox/SKILL.md'), true, agent.id);
      assert.equal(targetPaths.includes('.agents/skills/ai-implementation-executor-toolbox/SKILL.md'), true, agent.id);
      assert.match(executorContract, /Direct foreground progress/);
      assert.match(executorContract, /Main-mediated foreground progress/);
      assert.match(executorContract, /Completion-only worker:[\s\S]*spawn the usable worker/);
      assert.match(workerContract, /main-agent packet selects one delivery route/);
    }

    for (const wrapperPath of findWorkerWrappers()) {
      const wrapper = fs.readFileSync(wrapperPath, 'utf8');
      assert.doesNotMatch(wrapper, /Automated-run timing contract|orchestration_overhead/);
      assert.match(wrapper, /Announce only major phase changes/);
    }
    assert.match(executorContract, /## Automated-run timing contract/);
  });

  it('keeps rendered installed copies aligned with template semantics', () => {
    const cases = [
      [EXECUTOR_TEMPLATE, '.agents/skills/ai-implementation-plan-executor/SKILL.md'],
      [PLANNER_TOOLBOX_TEMPLATE, '.agents/skills/ai-implementation-planner-toolbox/SKILL.md'],
      [EXECUTOR_TOOLBOX_TEMPLATE, '.agents/skills/ai-implementation-executor-toolbox/SKILL.md'],
    ] as const;

    for (const [templatePath, installedPath] of cases) {
      const rendered = renderToolbox(templatePath);
      const installed = fs.readFileSync(installedPath, 'utf8');
      if (templatePath === EXECUTOR_TEMPLATE) {
        const timingSection = (content: string) => content.split('## Automated-run timing contract')[1]?.split('\n## ')[0];
        assert.equal(timingSection(installed), timingSection(rendered), installedPath);
      } else {
        assert.equal(installed, rendered, installedPath);
      }
    }
  });
});

function renderToolbox(templateRelativePath: string): string {
  return renderTemplateForSync({
    templateRelativePath,
    currentPath: 'AGENTS.md',
    selectedLanguageSkills: SELECTABLE_LANGUAGE_SKILLS.filter(({ id }) => id === 'typescript'),
    selectedFrameworkSkills: [],
    selectedArchitectureSkill: SELECTABLE_ARCHITECTURE_SKILLS.find(({ id }) => id === 'command-pattern'),
    selectedWorkflowSkills: SELECTABLE_WORKFLOW_SKILLS.filter(({ id }) =>
      ['ai-prompt-engineer-master', 'ux-expert', 'export-to-github', 'export-to-notion'].includes(id),
    ),
  });
}

function findWorkerWrappers(): string[] {
  return [
    '.codex/agents/sibu-implementation-planner.toml',
    '.codex/agents/sibu-implementation-executor.toml',
    '.claude/agents/sibu-implementation-planner.md',
    '.claude/agents/sibu-implementation-executor.md',
    '.gemini/agents/sibu-implementation-planner.md',
    '.gemini/agents/sibu-implementation-executor.md',
  ];
}
