import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import { acceptedRequestReference, acceptedStartReference, discoveryIssue, invalidModelCheckIssue, invalidPreviewIssue, invalidStartIssue, modelCheckIssue, previewIssue, startIssue, unavailablePreviewIssue, unknownDiscoveryIssue, unknownModelCheckIssue, unknownPreviewIssue, unknownStartIssue } from './public-issue.js';
import { SafeConsoleLocalEvalsLogger } from './safe-console-logger.js';
import type { RuntimeBlockReason } from '../runtime-description.js';

const knownReasons = ['missing-evals-folder', 'no-eval-suites', 'unreadable-eval-suites', 'discovery-failed'] as const;
const reference = '123e4567-e89b-42d3-a456-426614174000';

it('maps every known blocked discovery reason to bounded, distinct guidance', () => {
  const issues = knownReasons.map((reason) => {
    const result: Extract<EvalSuiteDiscoveryResult, { status: 'blocked' }> = {
      status: 'blocked', reason, message: 'OPENAI_API_KEY=sk-secret',
      guidance: ['/private/project'], suites: [], diagnostics: [],
    };
    return discoveryIssue(result, reference);
  });
  assert.deepEqual(issues.map((issue) => issue.category), [...knownReasons]);
  assert.equal(new Set(issues.map((issue) => issue.title)).size, knownReasons.length);
  assert.equal(issues[0]?.recoveryAction, 'edit-suites');
  assert.equal(issues[1]?.recoveryAction, 'edit-suites');
  assert.equal(issues[2]?.recoveryAction, 'edit-suites');
  assert.equal(issues[3]?.recoveryAction, 'retry');
  assert.ok(issues.every((issue) => issue.stage === 'discovery' && issue.outcome === 'blocked' && issue.reference === reference));
  assert.doesNotMatch(JSON.stringify(issues), /sk-secret|private\/project/);
});

it('accepts only bounded UUID references and replaces malformed, oversized, or non-string values', () => {
  assert.equal(acceptedRequestReference(reference.toUpperCase()), reference);
  for (const bad of ['private-path/secret', 'x'.repeat(500), '', ['one'], null]) {
    const replacement = acceptedRequestReference(bad);
    assert.match(replacement, /^[a-f0-9-]{36}$/);
    assert.notEqual(replacement, bad);
  }
});

it('labels unobserved discovery causes as unknown without reflecting inputs', () => {
  const issue = unknownDiscoveryIssue(reference);
  assert.equal(issue.category, 'unknown');
  assert.equal(issue.outcome, 'failed');
  assert.match(issue.explanation, /Cause unknown/);
  assert.equal(issue.reference, reference);
});

it('emits a safe correlated terminal event without unexpected payloads', () => {
  const messages: string[] = [];
  const original = console.error;
  console.error = (message?: unknown) => messages.push(String(message));
  try {
    new SafeConsoleLocalEvalsLogger().warn(Object.assign({
      event: 'local_evals_workbench_request_issue' as const,
      stage: 'discovery' as const,
      outcome: 'blocked' as const,
      reason: 'unreadable-eval-suites' as const,
      reference,
    }, { path: '/private/project', token: 'sk-secret' }));
  } finally {
    console.error = original;
  }
  assert.deepEqual(JSON.parse(messages[0] ?? '{}'), {
    level: 'warn', event: 'local_evals_workbench_request_issue', stage: 'discovery',
    outcome: 'blocked', reason: 'unreadable-eval-suites', reference,
  });
  assert.doesNotMatch(messages[0] ?? '', /private|sk-secret/);
});

const modelReasons: readonly RuntimeBlockReason[] = [
  'suite-unavailable', 'runner-unavailable', 'runner-absent', 'runner-start-failed',
  'runner-exited', 'runner-protocol-invalid', 'runner-invalid', 'runner-timeout',
  'environment-missing', 'required-setting-rejected', 'runner-request-too-large',
  'environment-undeclared', 'capability-unsupported', 'model-unavailable',
  'judge-unavailable', 'case-unavailable', 'repeats-invalid', 'artifact-unsafe',
  'artifact-not-ignored', 'artifact-tracked', 'artifact-git-unavailable',
  'artifact-root-unsafe', 'estimate-invalid', 'input-unsafe',
];

it('maps every known model-check cause to bounded issue guidance', () => {
  for (const reason of modelReasons) {
    const issue = modelCheckIssue({ status: 'blocked', reason } as Parameters<typeof modelCheckIssue>[0], reference);
    assert.equal(issue.stage, 'model-check');
    assert.equal(issue.category, reason);
    assert.equal(issue.reference, reference);
    assert.ok(issue.title && issue.explanation && issue.nextStep && issue.recoveryAction);
    assert.doesNotMatch(JSON.stringify(issue), /sk-secret|private\/project/);
  }
  assert.notEqual(modelCheckIssue({ status: 'blocked', reason: 'runner-request-too-large' }, reference).nextStep,
    modelCheckIssue({ status: 'blocked', reason: 'required-setting-rejected' }, reference).nextStep);
  assert.match(modelCheckIssue({ status: 'blocked', reason: 'input-unsafe' }, reference).explanation, /unclassified/);
  assert.match(unknownModelCheckIssue(reference).explanation, /Cause unknown/);
  assert.equal(invalidModelCheckIssue(reference).category, 'invalid-request');
});

it('includes only validated setting names in model-check user copy', () => {
  const safe = modelCheckIssue({ status: 'blocked', reason: 'environment-missing', missingEnvironmentName: 'OPENAI_API_KEY' }, reference);
  assert.match(safe.explanation, /OPENAI_API_KEY/);
  const unsafe = modelCheckIssue({ status: 'blocked', reason: 'required-setting-rejected', rejectedSettingName: 'sk-secret' }, reference);
  assert.doesNotMatch(JSON.stringify(unsafe), /sk-secret/);
});

it('maps every known preview cause with observed stage and safe recovery', () => {
  for (const reason of modelReasons) {
    const issue = previewIssue({ status: 'blocked', stage: 'estimation', reason }, reference);
    assert.equal(issue.stage, 'preview');
    assert.equal(issue.observedStage, 'estimation');
    assert.equal(issue.category, reason);
    assert.equal(issue.outcome, 'blocked');
    assert.equal(issue.reference, reference);
    assert.ok(issue.title && issue.explanation && issue.nextStep && issue.recoveryAction);
    assert.doesNotMatch(JSON.stringify(issue), /sk-secret|private\/project/);
  }
  assert.notEqual(previewIssue({ status: 'blocked', stage: 'estimation', reason: 'runner-request-too-large' }, reference).nextStep,
    previewIssue({ status: 'blocked', stage: 'description', reason: 'required-setting-rejected' }, reference).nextStep);
  const unknown = previewIssue({ status: 'error', stage: 'resolved-inputs', reason: 'unknown-cause' }, reference);
  assert.equal(unknown.outcome, 'failed');
  assert.equal(unknown.category, 'unknown');
  assert.equal(unknown.observedStage, 'resolved-inputs');
  assert.match(unknown.explanation, /Cause unknown/);
  assert.equal(invalidPreviewIssue(reference).category, 'invalid-request');
  assert.equal(unavailablePreviewIssue(reference).category, 'runner-unavailable');
  assert.equal(unknownPreviewIssue(reference).category, 'unknown');
});

it('maps every known run-start block to stage-specific safe guidance', () => {
  const storageReasons = ['invalid-input', 'unsafe-path', 'not-ignored', 'tracked-artifacts', 'git-unavailable',
    'unverifiable-root', 'unavailable', 'not-found', 'corrupt', 'limit-exceeded', 'invalid-transition',
    'owner-unknown', 'index-stale', 'review-stale', 'schedule-failed'] as const;
  for (const reason of [...modelReasons, ...storageReasons]) {
    const issue = startIssue({ status: 'blocked', reason }, reference);
    assert.equal(issue.stage, 'run-start');
    assert.equal(issue.outcome, 'blocked');
    assert.equal(issue.category, reason);
    assert.equal(issue.reference, reference);
    assert.ok(issue.title && issue.explanation && issue.nextStep && issue.recoveryAction);
    assert.doesNotMatch(JSON.stringify(issue), /sk-secret|private\/project/);
  }
  assert.match(startIssue({ status: 'blocked', reason: 'input-unsafe' }, reference).explanation, /unclassified/);
  assert.match(unknownStartIssue(reference).explanation, /Cause unknown/);
  assert.equal(invalidStartIssue(reference).category, 'invalid-request');
  assert.equal(acceptedStartReference(reference), reference);
  assert.notEqual(acceptedStartReference('injected-sk-secret'), 'injected-sk-secret');
});
