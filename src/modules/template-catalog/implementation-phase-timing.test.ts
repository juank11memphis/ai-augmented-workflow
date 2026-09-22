import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
// @ts-expect-error The distributed JavaScript helper intentionally has no TypeScript declaration artifact.
import { clock, reconcile as reconcileTiming } from '../../../templates/scripts/implementation-phase-timing.mjs';

type TimingResult = {
  ok: boolean;
  totalDurationMs?: number;
  coveredDurationMs?: number;
  orchestrationOverheadMs?: number;
  displayTotalDuration?: string;
  dominantPhases?: string[];
  phases?: Array<{
    phase: string;
    durationMs: number;
    displayDuration: string;
    occurrences: Array<{
      occurrence: number;
      startedAtEpochMs: number;
      finishedAtEpochMs: number;
      durationMs: number;
      children: Array<{ workerLabel: string; elapsedMs: number }>;
    }>;
  }>;
  diagnostics: Array<{ code: string; location: string }>;
};

const CLI_PATHS = [
  path.resolve('templates/scripts/implementation-phase-timing.mjs'),
  path.resolve('.agents/scripts/implementation-phase-timing.mjs'),
];

describe('implementation phase timing clock', () => {
  it('returns a finite non-negative epoch boundary without persisted state', () => {
    const first = clock();
    const second = clock();

    assert.equal(first.ok, true);
    assert.equal(Number.isFinite(first.epochMs), true);
    assert.equal(first.epochMs >= 0, true);
    assert.equal(second.ok, true);
  });
});

describe('implementation phase timing reconciliation', () => {
  it('reconciles sequential, repeated, adjacent, overlapping, and clipped phase occurrences', () => {
    const result = reconcile({
      startedAtEpochMs: 100,
      finishedAtEpochMs: 1100,
      outcome: 'completed',
      phases: [
        phase('implementation', 2, 500, 800),
        phase('preparation_context', 1, 0, 200),
        phase('implementation', 1, 200, 500),
        phase('implementation', 3, 700, 900),
        phase('focused_validation', 1, 1000, 1200),
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(result.totalDurationMs, 1000);
    assert.equal(result.coveredDurationMs, 900);
    assert.equal(result.orchestrationOverheadMs, 100);
    assert.deepEqual(result.dominantPhases, ['implementation']);
    assert.deepEqual(
      result.phases?.map(({ phase: label, durationMs }) => [label, durationMs]),
      [['preparation_context', 100], ['implementation', 700], ['focused_validation', 100]],
    );
    assert.deepEqual(result.diagnostics, []);
  });

  it('reports tied dominant phases using unrounded milliseconds and formats minute-scale durations', () => {
    const result = reconcile({
      startedAtEpochMs: 0,
      finishedAtEpochMs: 130_060,
      outcome: 'completed',
      phases: [phase('planning', 1, 0, 65_025), phase('implementation', 1, 65_025, 130_050)],
    });

    assert.deepEqual(result.dominantPhases, ['planning', 'implementation']);
    assert.equal(result.displayTotalDuration, '2m 10.1s');
    assert.deepEqual(result.phases?.map(({ displayDuration }) => displayDuration), ['1m 5.0s', '1m 5.0s']);
    assert.equal(result.orchestrationOverheadMs, 10);
  });

  it('includes computed orchestration overhead in dominant and tied phase selection', () => {
    const overheadOnly = reconcile({
      startedAtEpochMs: 0,
      finishedAtEpochMs: 1000,
      outcome: 'completed',
      phases: [],
    });
    const tied = reconcile({
      startedAtEpochMs: 0,
      finishedAtEpochMs: 1000,
      outcome: 'completed',
      phases: [phase('implementation', 1, 0, 500)],
    });

    assert.deepEqual(overheadOnly.dominantPhases, ['orchestration_overhead']);
    assert.deepEqual(tied.dominantPhases, ['implementation', 'orchestration_overhead']);
  });

  it('fails closed when different top-level phases overlap', () => {
    const result = reconcile({
      startedAtEpochMs: 0,
      finishedAtEpochMs: 1000,
      outcome: 'failed',
      phases: [phase('implementation', 1, 100, 700), phase('focused_validation', 1, 600, 900)],
    });

    assert.equal(result.ok, false);
    assert.deepEqual(result.diagnostics, [{ code: 'cross_phase_overlap', location: 'phases' }]);
    assert.equal(result.totalDurationMs, undefined);
    assert.equal(result.phases, undefined);
  });

  it('treats zero-duration phases inside and at boundaries of another phase as non-overlapping', () => {
    for (const timestamp of [100, 500, 900]) {
      const result = reconcile({
        startedAtEpochMs: 0,
        finishedAtEpochMs: 1000,
        outcome: 'completed',
        phases: [
          phase('implementation', 1, 100, 900),
          phase('focused_validation', 1, timestamp, timestamp),
        ],
      });

      assert.equal(result.ok, true);
      assert.deepEqual(result.diagnostics, []);
      assert.equal(result.coveredDurationMs, 800);
      assert.deepEqual(result.phases?.map(({ phase: label, durationMs }) => [label, durationMs]), [
        ['implementation', 800],
        ['focused_validation', 0],
      ]);
    }
  });

  it('keeps concurrent child durations visible without inflating enclosing or total durations', () => {
    const result = reconcile({
      startedAtEpochMs: 0,
      finishedAtEpochMs: 1000,
      outcome: 'completed',
      phases: [{
        ...phase('specialist_review', 1, 100, 800),
        children: [
          { workerLabel: 'architecture-reviewer', startedAtEpochMs: 100, finishedAtEpochMs: 700, outcome: 'completed' },
          { workerLabel: 'technical-lead-reviewer', elapsedMs: 650, outcome: 'completed' },
        ],
      }],
    });

    assert.equal(result.phases?.[0]?.durationMs, 700);
    assert.deepEqual(result.phases?.[0]?.occurrences[0]?.children.map(({ elapsedMs }) => elapsedMs), [600, 650]);
    assert.equal(result.coveredDurationMs, 700);
    assert.equal(result.orchestrationOverheadMs, 300);
    assert.equal(result.totalDurationMs, 1000);
  });

  it('rejects absolute child evidence outside the clipped enclosing phase', () => {
    const result = reconcile({
      startedAtEpochMs: 100,
      finishedAtEpochMs: 900,
      outcome: 'completed',
      phases: [{
        ...phase('specialist_review', 1, 0, 1000),
        children: [
          { workerLabel: 'architecture-reviewer', startedAtEpochMs: 0, finishedAtEpochMs: 200, outcome: 'completed' },
          { workerLabel: 'technical-lead-reviewer', startedAtEpochMs: 200, finishedAtEpochMs: 800, outcome: 'completed' },
        ],
      }],
    });

    assert.deepEqual(result.diagnostics, [{ code: 'child_outside_phase', location: 'phases[0].children[0]' }]);
    assert.deepEqual(result.phases?.[0]?.occurrences[0]?.children.map(({ workerLabel }) => workerLabel), [
      'technical-lead-reviewer',
    ]);
    assert.equal(result.phases?.[0]?.durationMs, 800);
  });

  it('omits invalid or incomplete occurrences while preserving valid enclosing evidence', () => {
    const input = {
      startedAtEpochMs: 0,
      finishedAtEpochMs: 1000,
      outcome: 'blocked',
      phases: [
        phase('implementation', 1, 100, 500),
        { phase: 'repair', occurrence: 1, startedAtEpochMs: 800, outcome: 'incomplete' },
        phase('focused_validation', 1, 700, 600),
        { ...phase('specialist_review', 1, 500, 700), children: [
          { workerLabel: 'architecture-reviewer', startedAtEpochMs: 650, outcome: 'incomplete' },
          { workerLabel: 'technical-lead-reviewer', elapsedMs: 50, outcome: 'completed' },
          { workerLabel: 'implementation-executor', elapsedMs: 300, outcome: 'completed' },
        ] },
      ],
    };
    const result = reconcile(input);

    assert.equal(result.ok, true);
    assert.deepEqual(result.phases?.map(({ phase: label }) => label), ['implementation', 'specialist_review']);
    assert.deepEqual(result.diagnostics.map(({ code }) => code), [
      'incomplete_phase_interval',
      'reversed_phase_interval',
      'incomplete_child_boundary',
      'child_outside_phase',
    ]);
    assert.equal(result.totalDurationMs, result.coveredDurationMs! + result.orchestrationOverheadMs!);
  });

  it('is ordering-independent, interval-union idempotent, and conserves total milliseconds', () => {
    const occurrences = [
      phase('implementation', 1, 100, 400),
      phase('implementation', 2, 250, 500),
      phase('implementation', 2, 250, 500),
      phase('focused_validation', 1, 600, 900),
    ];
    const permutations = [occurrences, [...occurrences].reverse(), [occurrences[2], occurrences[0], occurrences[3], occurrences[1]]];
    const snapshots = permutations.map((phases) => reconcile({ startedAtEpochMs: 0, finishedAtEpochMs: 1000, outcome: 'completed', phases }));

    for (const result of snapshots) {
      assert.deepEqual(result.phases?.map(({ phase: label, durationMs }) => [label, durationMs]), [
        ['implementation', 400],
        ['focused_validation', 300],
      ]);
      assert.equal(result.totalDurationMs, result.coveredDurationMs! + result.orchestrationOverheadMs!);
    }
  });
});

describe('implementation phase timing schema safety', () => {
  it('rejects invalid run boundaries, values, types, and malformed JSON with explicit diagnostics', () => {
    const cases = [
      [{ startedAtEpochMs: 2, finishedAtEpochMs: 1, outcome: 'failed', phases: [] }, 'reversed_run_boundary'],
      [{ startedAtEpochMs: -1, finishedAtEpochMs: 1, outcome: 'failed', phases: [] }, 'invalid_run_boundary'],
      [{ startedAtEpochMs: 0, finishedAtEpochMs: '1', outcome: 'failed', phases: [] }, 'invalid_run_boundary'],
      [{ startedAtEpochMs: 0, finishedAtEpochMs: 1, outcome: 'unknown', phases: [] }, 'invalid_run_identity'],
    ] as const;

    for (const [input, code] of cases) {
      const result = reconcile(input);
      assert.equal(result.ok, false);
      assert.equal(result.diagnostics[0]?.code, code);
    }
    assert.equal(reconcile({ startedAtEpochMs: 0, finishedAtEpochMs: Number.POSITIVE_INFINITY, outcome: 'failed', phases: [] }).diagnostics[0]?.code, 'invalid_run_boundary');
  });

  it('rejects unexpected privacy-unsafe fields without echoing their names or values', () => {
    const forbiddenFields = ['prompt', 'content', 'source', 'path', 'token', 'cost', 'model', 'command', 'environment', 'credential', 'secret'];

    for (const field of forbiddenFields) {
      const secret = `private-${field}-value`;
      const input = { startedAtEpochMs: 0, finishedAtEpochMs: 1, outcome: 'failed', phases: [], [field]: secret };
      const raw = JSON.stringify(reconcileTiming(input));
      assert.equal(JSON.parse(raw).ok, false);
      assert.doesNotMatch(raw, new RegExp(field, 'i'));
      assert.doesNotMatch(raw, new RegExp(secret, 'i'));
    }
  });

  it('rejects nested unexpected fields without leaking supplied content', () => {
    const input = {
      startedAtEpochMs: 0,
      finishedAtEpochMs: 10,
      outcome: 'completed',
      phases: [{ ...phase('implementation', 1, 0, 10), prompt: 'private payload' }],
    };
    const raw = JSON.stringify(reconcileTiming(input));

    assert.equal(JSON.parse(raw).diagnostics[0]?.code, 'invalid_phase_schema');
    assert.doesNotMatch(raw, /private payload/);
  });

  it('rejects non-contract and prohibited worker labels without leaking supplied values', () => {
    const prohibitedLabels = [
      'payload-summary',
      'model-gpt-5',
      'credential-prod',
      'secret-value',
      'prompt-user',
      'source-content',
      'path-home',
      'token-count',
      'cost-usd',
      'command-test',
      'environment-prod',
      'reviewer-two',
    ];

    for (const workerLabel of prohibitedLabels) {
      const input = {
        startedAtEpochMs: 0,
        finishedAtEpochMs: 10,
        outcome: 'completed',
        phases: [{
          ...phase('specialist_review', 1, 0, 10),
          children: [{ workerLabel, elapsedMs: 5, outcome: 'completed' }],
        }],
      };
      const raw = JSON.stringify(reconcileTiming(input));

      assert.equal(JSON.parse(raw).diagnostics[0]?.code, 'invalid_child_identity');
      assert.doesNotMatch(raw, new RegExp(workerLabel, 'i'));
    }
  });
});

describe('implementation phase timing command entrypoints', () => {
  for (const cliPath of CLI_PATHS) {
    it(`runs clock and reconcile through ${path.relative(process.cwd(), cliPath)} without persistence`, () => {
      const workingDirectory = mkdtempSync(path.join(tmpdir(), 'sibu-timing-cli-'));

      try {
        const clockResult = runCli(cliPath, workingDirectory, ['clock']);
        assert.equal(clockResult.status, 0);
        assert.equal(clockResult.stderr, '');
        const clockOutput = JSON.parse(clockResult.stdout);
        assert.equal(clockOutput.ok, true);
        assert.equal(Number.isFinite(clockOutput.epochMs), true);

        const reconcileResult = runCli(cliPath, workingDirectory, ['reconcile'], JSON.stringify({
          startedAtEpochMs: 10,
          finishedAtEpochMs: 30,
          outcome: 'completed',
          phases: [phase('implementation', 1, 10, 25)],
        }));
        assert.equal(reconcileResult.status, 0);
        assert.equal(reconcileResult.stderr, '');
        assert.deepEqual(JSON.parse(reconcileResult.stdout), {
          ok: true,
          outcome: 'completed',
          totalDurationMs: 20,
          displayTotalDuration: '0.0s',
          coveredDurationMs: 15,
          orchestrationOverheadMs: 5,
          displayOrchestrationOverhead: '0.0s',
          dominantPhases: ['implementation'],
          phases: [{
            phase: 'implementation',
            durationMs: 15,
            displayDuration: '0.0s',
            occurrences: [{
              occurrence: 1,
              startedAtEpochMs: 10,
              finishedAtEpochMs: 25,
              durationMs: 15,
              outcome: 'completed',
              children: [],
            }],
          }],
          diagnostics: [],
        });

        assert.deepEqual(readdirSync(workingDirectory), []);
      } finally {
        rmSync(workingDirectory, { recursive: true, force: true });
      }
    });

    it(`returns privacy-safe CLI diagnostics through ${path.relative(process.cwd(), cliPath)}`, () => {
      const workingDirectory = mkdtempSync(path.join(tmpdir(), 'sibu-timing-cli-'));
      const privateValue = 'private-cli-payload';

      try {
        const malformed = runCli(cliPath, workingDirectory, ['reconcile'], `{${privateValue}`);
        assert.equal(malformed.status, 0);
        assert.equal(malformed.stderr, '');
        assert.deepEqual(JSON.parse(malformed.stdout), {
          ok: false,
          diagnostics: [{ code: 'invalid_json', location: 'run' }],
        });
        assert.doesNotMatch(malformed.stdout, new RegExp(privateValue));

        const unsafeInput = runCli(cliPath, workingDirectory, ['reconcile'], JSON.stringify({
          startedAtEpochMs: 0,
          finishedAtEpochMs: 1,
          outcome: 'failed',
          phases: [],
          secret: privateValue,
        }));
        assert.equal(unsafeInput.status, 0);
        assert.deepEqual(JSON.parse(unsafeInput.stdout), {
          ok: false,
          diagnostics: [{ code: 'invalid_run_schema', location: 'run' }],
        });
        assert.doesNotMatch(unsafeInput.stdout, /secret|private-cli-payload/i);

        const unknownOperation = runCli(cliPath, workingDirectory, [`unknown-${privateValue}`]);
        assert.equal(unknownOperation.status, 0);
        assert.equal(unknownOperation.stderr, '');
        assert.deepEqual(JSON.parse(unknownOperation.stdout), {
          ok: false,
          diagnostics: [{ code: 'unknown_operation', location: 'operation' }],
        });
        assert.doesNotMatch(unknownOperation.stdout, new RegExp(privateValue));
        assert.deepEqual(readdirSync(workingDirectory), []);
      } finally {
        rmSync(workingDirectory, { recursive: true, force: true });
      }
    });
  }
});

function phase(label: string, occurrence: number, startedAtEpochMs: number, finishedAtEpochMs: number) {
  return { phase: label, occurrence, startedAtEpochMs, finishedAtEpochMs, outcome: 'completed' };
}

function reconcile(input: unknown): TimingResult {
  return reconcileTiming(input) as TimingResult;
}

function runCli(cliPath: string, cwd: string, args: string[], input?: string) {
  const environment = { ...process.env };
  delete environment.NODE_TEST_CONTEXT;

  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: environment,
    input,
  });
  if (result.error) throw result.error;
  return result;
}
