import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import { acceptedRequestReference, discoveryIssue, unknownDiscoveryIssue } from './public-issue.js';
import { SafeConsoleLocalEvalsLogger } from './safe-console-logger.js';

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
