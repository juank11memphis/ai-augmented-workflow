#!/usr/bin/env node

const PHASES = [
  'preparation_context',
  'planning',
  'implementation',
  'focused_validation',
  'aggregate_validation',
  'specialist_review',
  'repair',
];
const OUTCOMES = new Set(['completed', 'failed', 'blocked', 'interrupted', 'cancelled', 'incomplete']);
const RUN_KEYS = new Set(['startedAtEpochMs', 'finishedAtEpochMs', 'outcome', 'phases']);
const PHASE_KEYS = new Set(['phase', 'occurrence', 'startedAtEpochMs', 'finishedAtEpochMs', 'outcome', 'children']);
const CHILD_KEYS = new Set(['workerLabel', 'startedAtEpochMs', 'finishedAtEpochMs', 'elapsedMs', 'outcome']);
const WORKER_LABELS = new Set([
  'implementation-planner',
  'implementation-executor',
  'architecture-reviewer',
  'technical-lead-reviewer',
]);

function diagnostic(code, location) {
  return { code, location };
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isBoundary(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isOutcome(value) {
  return typeof value === 'string' && OUTCOMES.has(value);
}

function formatDuration(milliseconds) {
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${(seconds - minutes * 60).toFixed(1)}s`;
}

function mergeIntervals(intervals) {
  const sorted = intervals.toSorted((left, right) => left.start - right.start || left.finish - right.finish);
  const merged = [];

  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.finish) {
      previous.finish = Math.max(previous.finish, interval.finish);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

function intervalDuration(intervals) {
  return intervals.reduce((total, interval) => total + interval.finish - interval.start, 0);
}

function parseChild(value, location, enclosingStart, enclosingFinish, diagnostics) {
  if (!isRecord(value) || !hasOnlyKeys(value, CHILD_KEYS)) {
    diagnostics.push(diagnostic('invalid_child_schema', location));
    return undefined;
  }
  if (!WORKER_LABELS.has(value.workerLabel) || !isOutcome(value.outcome)) {
    diagnostics.push(diagnostic('invalid_child_identity', location));
    return undefined;
  }

  const hasElapsed = value.elapsedMs !== undefined;
  const hasStarted = value.startedAtEpochMs !== undefined;
  const hasFinished = value.finishedAtEpochMs !== undefined;
  if (hasElapsed && !isBoundary(value.elapsedMs)) {
    diagnostics.push(diagnostic('invalid_child_elapsed', location));
    return undefined;
  }
  if (hasStarted !== hasFinished || (hasStarted && (!isBoundary(value.startedAtEpochMs) || !isBoundary(value.finishedAtEpochMs)))) {
    diagnostics.push(diagnostic('incomplete_child_boundary', location));
    return undefined;
  }
  if (!hasElapsed && !hasStarted) {
    diagnostics.push(diagnostic('missing_child_timing', location));
    return undefined;
  }

  const boundaryElapsed = hasStarted ? value.finishedAtEpochMs - value.startedAtEpochMs : undefined;
  if (boundaryElapsed !== undefined && boundaryElapsed < 0) {
    diagnostics.push(diagnostic('reversed_child_boundary', location));
    return undefined;
  }
  if (hasElapsed && boundaryElapsed !== undefined && value.elapsedMs !== boundaryElapsed) {
    diagnostics.push(diagnostic('inconsistent_child_elapsed', location));
    return undefined;
  }

  const elapsedMs = hasElapsed ? value.elapsedMs : boundaryElapsed;
  if (
    elapsedMs > enclosingFinish - enclosingStart
    || (hasStarted && (value.startedAtEpochMs < enclosingStart || value.finishedAtEpochMs > enclosingFinish))
  ) {
    diagnostics.push(diagnostic('child_outside_phase', location));
    return undefined;
  }
  return {
    workerLabel: value.workerLabel,
    elapsedMs,
    displayDuration: formatDuration(elapsedMs),
    outcome: value.outcome,
  };
}

function parsePhase(value, index, runStart, runFinish, diagnostics) {
  const location = `phases[${index}]`;
  if (!isRecord(value) || !hasOnlyKeys(value, PHASE_KEYS)) {
    diagnostics.push(diagnostic('invalid_phase_schema', location));
    return undefined;
  }
  if (!PHASES.includes(value.phase) || !Number.isSafeInteger(value.occurrence) || value.occurrence < 1 || !isOutcome(value.outcome)) {
    diagnostics.push(diagnostic('invalid_phase_identity', location));
    return undefined;
  }
  if (!isBoundary(value.startedAtEpochMs)) {
    diagnostics.push(diagnostic('invalid_phase_start', location));
    return undefined;
  }
  if (value.finishedAtEpochMs === undefined) {
    diagnostics.push(diagnostic('incomplete_phase_interval', location));
    return undefined;
  }
  if (!isBoundary(value.finishedAtEpochMs)) {
    diagnostics.push(diagnostic('invalid_phase_finish', location));
    return undefined;
  }
  if (value.finishedAtEpochMs < value.startedAtEpochMs) {
    diagnostics.push(diagnostic('reversed_phase_interval', location));
    return undefined;
  }

  const start = Math.max(value.startedAtEpochMs, runStart);
  const finish = Math.min(value.finishedAtEpochMs, runFinish);
  if (finish < start) {
    diagnostics.push(diagnostic('phase_outside_run', location));
    return undefined;
  }

  const children = [];
  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) {
      diagnostics.push(diagnostic('invalid_children', location));
    } else {
      value.children.forEach((child, childIndex) => {
        const parsed = parseChild(
          child,
          `${location}.children[${childIndex}]`,
          start,
          finish,
          diagnostics,
        );
        if (parsed) children.push(parsed);
      });
    }
  }

  return { phase: value.phase, occurrence: value.occurrence, start, finish, outcome: value.outcome, children };
}

function hasCrossPhaseOverlap(occurrences) {
  const sorted = occurrences
    .filter(({ start, finish }) => start < finish)
    .toSorted((left, right) => left.start - right.start || left.finish - right.finish);

  for (let index = 0; index < sorted.length; index += 1) {
    for (let candidateIndex = index + 1; candidateIndex < sorted.length; candidateIndex += 1) {
      const current = sorted[index];
      const candidate = sorted[candidateIndex];
      if (candidate.start >= current.finish) break;
      if (candidate.phase !== current.phase && candidate.finish > current.start) return true;
    }
  }

  return false;
}

export function reconcile(input) {
  if (!isRecord(input) || !hasOnlyKeys(input, RUN_KEYS)) {
    return { ok: false, diagnostics: [diagnostic('invalid_run_schema', 'run')] };
  }
  if (!isBoundary(input.startedAtEpochMs) || !isBoundary(input.finishedAtEpochMs)) {
    return { ok: false, diagnostics: [diagnostic('invalid_run_boundary', 'run')] };
  }
  if (input.finishedAtEpochMs < input.startedAtEpochMs) {
    return { ok: false, diagnostics: [diagnostic('reversed_run_boundary', 'run')] };
  }
  if (!isOutcome(input.outcome) || !Array.isArray(input.phases)) {
    return { ok: false, diagnostics: [diagnostic('invalid_run_identity', 'run')] };
  }

  const diagnostics = [];
  const occurrences = input.phases
    .map((phase, index) => parsePhase(phase, index, input.startedAtEpochMs, input.finishedAtEpochMs, diagnostics))
    .filter(Boolean);
  if (hasCrossPhaseOverlap(occurrences)) {
    diagnostics.push(diagnostic('cross_phase_overlap', 'phases'));
    return { ok: false, diagnostics };
  }
  const phaseResults = [];

  for (const phase of PHASES) {
    const matching = occurrences.filter((occurrence) => occurrence.phase === phase);
    if (matching.length === 0) continue;
    const intervals = mergeIntervals(matching.map(({ start, finish }) => ({ start, finish })));
    const durationMs = intervalDuration(intervals);
    phaseResults.push({
      phase,
      durationMs,
      displayDuration: formatDuration(durationMs),
      occurrences: matching.map(({ occurrence, start, finish, outcome, children }) => ({
        occurrence,
        startedAtEpochMs: start,
        finishedAtEpochMs: finish,
        durationMs: finish - start,
        outcome,
        children,
      })),
    });
  }

  const totalDurationMs = input.finishedAtEpochMs - input.startedAtEpochMs;
  const coveredDurationMs = intervalDuration(mergeIntervals(occurrences.map(({ start, finish }) => ({ start, finish }))));
  const orchestrationOverheadMs = totalDurationMs - coveredDurationMs;
  const canonicalDurations = [
    ...phaseResults.map(({ phase, durationMs }) => ({ phase, durationMs })),
    { phase: 'orchestration_overhead', durationMs: orchestrationOverheadMs },
  ];
  const longestDuration = Math.max(0, ...canonicalDurations.map(({ durationMs }) => durationMs));
  const dominantPhases = longestDuration === 0
    ? []
    : canonicalDurations.filter(({ durationMs }) => durationMs === longestDuration).map(({ phase }) => phase);

  return {
    ok: true,
    outcome: input.outcome,
    totalDurationMs,
    displayTotalDuration: formatDuration(totalDurationMs),
    coveredDurationMs,
    orchestrationOverheadMs,
    displayOrchestrationOverhead: formatDuration(orchestrationOverheadMs),
    dominantPhases,
    phases: phaseResults,
    diagnostics,
  };
}

export function clock() {
  const epochMs = Date.now();
  return isBoundary(epochMs)
    ? { ok: true, epochMs }
    : { ok: false, diagnostics: [diagnostic('invalid_clock', 'clock')] };
}

async function main() {
  const operation = process.argv[2];
  if (operation === 'clock') {
    process.stdout.write(`${JSON.stringify(clock())}\n`);
    return;
  }
  if (operation !== 'reconcile') {
    process.stdout.write(`${JSON.stringify({ ok: false, diagnostics: [diagnostic('unknown_operation', 'operation')] })}\n`);
    return;
  }

  try {
    let source = '';
    for await (const chunk of process.stdin) source += chunk;
    process.stdout.write(`${JSON.stringify(reconcile(JSON.parse(source)))}\n`);
  } catch {
    process.stdout.write(`${JSON.stringify({ ok: false, diagnostics: [diagnostic('invalid_json', 'run')] })}\n`);
  }
}

const invokedPath = process.argv[1]?.replaceAll('\\', '/');
if (invokedPath?.endsWith('/implementation-phase-timing.mjs')) {
  await main();
}
