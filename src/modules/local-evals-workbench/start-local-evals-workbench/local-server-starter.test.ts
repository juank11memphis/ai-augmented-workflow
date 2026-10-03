import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult, InternalEvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { RunLocalEvalSuiteDependencies } from '../run-local-eval-suite/index.js';
import type { AnalyzeFailedAssertionDependencies } from '../analyze-failed-assertion/index.js';
import type { DraftEvalRepairProposalDependencies } from '../draft-eval-repair-proposal/index.js';
import { APPLY_APPROVED_REPAIR_MARKER } from '../apply-approved-eval-repair/index.js';
import type { ApplyApprovedEvalRepairDependencies } from '../apply-approved-eval-repair/index.js';
import type { StoredRunArtifact } from '../run-local-eval-suite/run-artifact-store.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';
import { queued } from '../run-history/test-fixtures.js';
import './start-http-correlation.test.js';
import './read-http.test.js';
import './proposal-http.test.js';
import './apply-route-http.test.js';
import { readyDiscovery, blockedDiscovery, runDependencies, FakeLocalHttpServer, runtimeDependencies, applyRepairDependencies, analysisPayload, proposalPayload, analysisDependencies, proposalDependencies, failedArtifact, withOfflineWorkbench } from './local-server-starter-test-fixture.js';

describe('NodeLocalWorkbenchServerStarter', () => {
  it('returns safe read issues without changing handler outcomes or logging successful polls', async () => {
    const server = new FakeLocalHttpServer(4321);
    const events: unknown[] = [];
    let getCalls = 0;
    const dependencies = { ...runtimeDependencies(),
      get: async () => { getCalls++; return getCalls === 1
        ? { status: 'blocked' as const, reason: 'corrupt' as const }
        : { status: 'ok' as const, value: { summary: queued(), evidenceStatus: 'not-requested' as const } }; },
      list: async () => ({ status: 'blocked' as const, reason: 'not-found' as const }),
    };
    const logger = { info: () => undefined, warn: (event: unknown) => events.push(event), error: () => undefined };
    const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; }, () => dependencies, logger);
    const started = await starter.startServer({ projectRoot: '/private/project', initialDiscoveryResult: readyDiscovery() });
    try {
      const bad = await server.renderGetResponse('/api/eval-runs/status?suiteId=secret-token');
      const invalid = await server.renderGetResponse('/api/eval-runs/status?suiteId=sk-secret%2Fpath');
      const oversized = await server.renderGetResponse('/api/eval-runs/history?suiteId=' + 'sk-secret'.repeat(10000));
      const corrupt = await server.renderGetResponse('/api/eval-runs/status?suiteId=suite&runId=run-1', '123e4567-e89b-42d3-a456-426614174000');
      const ready = await server.renderGetResponse('/api/eval-runs/status?suiteId=suite&runId=run-1');
      const history = await server.renderGetResponse('/api/eval-runs/history?suiteId=suite');
      assert.equal(bad.statusCode, 400);
      assert.equal(invalid.statusCode, 400);
      assert.equal(oversized.statusCode, 400);
      assert.equal(corrupt.statusCode, 422);
      assert.equal((JSON.parse(corrupt.body) as { issue: { reference: string } }).issue.reference, '123e4567-e89b-42d3-a456-426614174000');
      assert.equal(ready.statusCode, 200);
      assert.equal(history.statusCode, 422);
      const issue = (JSON.parse(history.body) as { issue: { stage: string; category: string; reference: string } }).issue;
      assert.deepEqual({ stage: issue.stage, category: issue.category }, { stage: 'history', category: 'not-found' });
      assert.match(issue.reference, /^[a-f0-9-]{36}$/);
      assert.equal(history.headers['x-sibu-request-reference'], issue.reference);
      assert.equal((JSON.parse(corrupt.body) as { issue: { category: string } }).issue.category, 'corrupt');
      assert.equal('issue' in JSON.parse(ready.body), false);
      assert.equal(events.length, 5);
      assert.doesNotMatch(JSON.stringify(events) + invalid.body + oversized.body + history.body, /sk-secret|private\/project/);
    } finally { await started.stop?.(); }
  });
  it('serves inline setup and passes offline Describe, Preview, and Start through authoritative handlers', async () => {
    await withOfflineWorkbench(async ({ getHtml, post, setRunnerMode }) => {
      const html = await getHtml();
      assert.match(html, /data-run-setup/);
      assert.match(html, /data-setup-fields/);
      assert.match(html, /data-action="review"/);
      assert.doesNotMatch(html, /data-action="new-run"|selection-sheet/);

      const described = await post('/api/eval-suites/describe', { suiteId: 'offline' });
      assert.equal(described.code, 200);
      assert.deepEqual(described.payload.models, ['fake/available', 'fake/unavailable']);

      const all = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'all' }, model: 'fake/available' });
      assert.equal(all.code, 200);
      assert.deepEqual(all.payload.selectedCaseIds, ['first', 'second']);
      assert.equal(all.payload.totalCalls, 2);
      assert.equal((all.payload.cost as { status: string }).status, 'available');

      const one = await post('/api/eval-runs/preview', { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'first' }, model: 'fake/unavailable' });
      assert.equal(one.code, 200);
      assert.deepEqual(one.payload.selectedCaseIds, ['first']);
      assert.equal(one.payload.totalCalls, 1);
      assert.equal((one.payload.cost as { status: string }).status, 'unavailable');
      const review = ({ selectedCaseIds, targetCalls, judgeCalls, totalCalls, cost }: typeof one.payload) =>
        ({ selectedCaseIds, targetCalls, judgeCalls, totalCalls, cost });
      const selection = { suiteId: 'offline', scope: { type: 'test_case', testCaseId: 'first' }, model: 'fake/unavailable' };
      const stale = await post('/api/eval-runs/start', { ...selection, review: review(all.payload) });
      assert.equal(stale.payload.status, 'blocked');
      assert.equal(stale.payload.reason, 'review-stale');
      assert.equal((stale.payload.issue as { category: string }).category, 'review-stale');
      assert.equal(stale.code, 422);

      await setRunnerMode('no-models');
      const noModels = await post('/api/eval-suites/describe', { suiteId: 'offline' });
      assert.equal(noModels.payload.status, 'blocked');
      assert.equal(noModels.payload.reason, 'model-unavailable');
      await setRunnerMode('failure');
      const failure = await post('/api/eval-suites/describe', { suiteId: 'offline' });
      assert.equal(failure.payload.status, 'blocked');
      assert.doesNotMatch(JSON.stringify(failure.payload), /evals\/runner|\/tmp\/|secret/);

      await setRunnerMode('ready');
      const started = await post('/api/eval-runs/start', { ...selection, review: review(one.payload) });
      assert.equal(started.code, 202);
      assert.equal(started.payload.status, 'queued');
      assert.equal(started.payload.suiteId, 'offline');
    });
  });
  it('binds to localhost and serves only safe initial content', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    });
    process.env.OPENAI_API_KEY = 'openai-secret-for-test';
    process.env.SIBU_EVALS_MODEL = 'model-secret-for-test';

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = fakeServer.renderResponse('/');

      assert.equal(fakeServer.listenHost, '127.0.0.1');
      assert.equal(result.host, '127.0.0.1');
      assert.equal(result.url, 'http://127.0.0.1:4321/');
      assert.match(response.body, /Sibu Evals/);
      assert.match(response.body, /Eval Suite/);
      assert.match(response.body, /Skill authoring checks/);
      assert.match(response.body, /Run scope/);
      assert.match(response.body, /Review run/);
      assert.match(response.body, /Model/);
      assert.match(response.body, /0\/2 complete/);
      assert.match(response.body, /OPENAI_API_KEY.*project-root \.env.*\.env\.local/);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.doesNotMatch(response.body, /openai-secret-for-test|model-secret-for-test|SIBU_EVALS_MODEL|PRIVATE_RUNTIME_TOKEN|private prompt content|private-runner|private-tool|private expected output|process\.env|mutation|mutate|\/repo/);
    } finally {
      await result.stop?.();
      delete process.env.OPENAI_API_KEY;
      delete process.env.SIBU_EVALS_MODEL;
    }
  });

  it('serves discovered eval suite summaries from a local JSON endpoint', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    });

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = fakeServer.renderResponse('/api/eval-suites');
      const payload = JSON.parse(response.body) as EvalSuiteDiscoveryResult;

      assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
      assert.equal(payload.status, 'ready');
      assert.equal('issue' in payload, false);
      assert.equal(payload.suites[0]?.name, 'Skill authoring checks');
      assert.equal(payload.suites[0]?.readyTestCaseCount, 2);
      assert.equal(payload.suites[0]?.testCases[0]?.id, 'names-artifact');
      assert.equal(payload.suites[0]?.modelOptions[0]?.id, 'gpt-5-mini');
      assert.equal('definitions' in payload, false);
      assert.doesNotMatch(response.body, /\/repo|OPENAI_API_KEY|PRIVATE_RUNTIME_TOKEN|private prompt content|private-runner|private-tool|private expected output|secret/);
    } finally {
      await result.stop?.();
    }
  });


  it('serves blocked empty setup state from the local JSON endpoint', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    });

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: blockedDiscovery() });
    try {
      const response = fakeServer.renderResponse('/api/eval-suites');
      const payload = JSON.parse(response.body) as EvalSuiteDiscoveryResult;

      assert.equal(payload.status, 'blocked');
      assert.equal(payload.suites.length, 0);
      assert.match(response.body, /No conventional evals folder/);
    } finally {
      await result.stop?.();
    }
  });

  it('correlates a blocked discovery response with one safe local event', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const events: unknown[] = [];
    const logger = { info: () => undefined, warn: (event: unknown) => events.push(event), error: () => undefined };
    const starter = new NodeLocalWorkbenchServerStarter((handler) => { fakeServer.handler = handler; return fakeServer; }, () => runtimeDependencies(), logger);
    const started = await starter.startServer({ projectRoot: '/private/project', initialDiscoveryResult: blockedDiscovery() });
    try {
      const reference = '123e4567-e89b-42d3-a456-426614174000';
      const response = await requestDiscovery(fakeServer, reference);
      const payload = JSON.parse(response.body) as { issue: { category: string; reference: string } };
      assert.equal(payload.issue.category, 'missing-evals-folder');
      assert.equal(payload.issue.reference, reference);
      assert.equal(response.headers['x-sibu-request-reference'], reference);
      assert.deepEqual(events, [{ event: 'local_evals_workbench_request_issue', stage: 'discovery', outcome: 'blocked', reason: 'missing-evals-folder', reference }]);

      const replaced = await requestDiscovery(fakeServer, 'OPENAI_API_KEY=sk-secret'.repeat(30));
      const replacedPayload = JSON.parse(replaced.body) as { issue: { reference: string } };
      assert.match(replacedPayload.issue.reference, /^[a-f0-9-]{36}$/);
      assert.equal(replaced.headers['x-sibu-request-reference'], replacedPayload.issue.reference);
      assert.equal((events[1] as { reference: string }).reference, replacedPayload.issue.reference);
      assert.doesNotMatch(replaced.body + JSON.stringify(events), /sk-secret|private\/project/);
    } finally {
      await started.stop?.();
    }
  });

  it('contains a discovery request-boundary exception with unknown cause and a matching event', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const events: unknown[] = [];
    const logger = { info: () => undefined, warn: (event: unknown) => events.push(event), error: () => undefined };
    const badResult = Object.defineProperty(blockedDiscovery(), 'definitions', { get: () => { throw new Error('sk-secret /private/project'); } });
    const starter = new NodeLocalWorkbenchServerStarter((handler) => { fakeServer.handler = handler; return fakeServer; }, () => runtimeDependencies(), logger);
    const started = await starter.startServer({ projectRoot: '/private/project', initialDiscoveryResult: badResult });
    try {
      const response = await requestDiscovery(fakeServer, 'invalid-secret-reference');
      const payload = JSON.parse(response.body) as { issue: { outcome: string; category: string; reference: string } };
      assert.equal(response.statusCode, 500);
      assert.equal(payload.issue.outcome, 'failed');
      assert.equal(payload.issue.category, 'unknown');
      assert.equal((events[0] as { reference: string }).reference, payload.issue.reference);
      assert.doesNotMatch(response.body + JSON.stringify(events), /sk-secret|private\/project|invalid-secret-reference/);
    } finally {
      await started.stop?.();
    }
  });
  it('runs all test cases through POST /api/eval-runs', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const calls: string[][] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    }, () => runtimeDependencies({ run: runDependencies(calls) }));

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await fakeServer.renderJsonResponse('/api/eval-runs', { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } });
      const payload = JSON.parse(response.body) as { status: string; matrix: { rows: readonly { testCaseId: string }[] } };

      assert.equal(response.statusCode, 200);
      assert.equal(payload.status, 'completed');
      assert.deepEqual(payload.matrix.rows.map((row) => row.testCaseId), ['missing-skill-boundary', 'names-artifact']);
      assert.deepEqual(calls, [['missing-skill-boundary', 'names-artifact']]);
      assert.doesNotMatch(response.body, /\/repo|secret|full raw output/);
    } finally {
      await result.stop?.();
    }
  });

  it('runs one test case through POST /api/eval-runs', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const calls: string[][] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    }, () => runtimeDependencies({ run: runDependencies(calls) }));

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await fakeServer.renderJsonResponse('/api/eval-runs', { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'test_case', testCaseId: 'names-artifact' } });
      const payload = JSON.parse(response.body) as { status: string; matrix: { rows: readonly { testCaseId: string }[] } };

      assert.equal(response.statusCode, 200);
      assert.equal(payload.status, 'completed');
      assert.deepEqual(payload.matrix.rows.map((row) => row.testCaseId), ['names-artifact']);
      assert.deepEqual(calls, [['names-artifact']]);
    } finally {
      await result.stop?.();
    }
  });

  it('returns structured JSON for malformed, blocked, and error eval run requests', async () => {
    const malformedServer = new FakeLocalHttpServer(4321);
    const malformedStarter = new NodeLocalWorkbenchServerStarter((handler) => {
      malformedServer.handler = handler;
      return malformedServer;
    }, () => runtimeDependencies({ run: runDependencies([]) }));
    const malformedResult = await malformedStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      assert.equal((await malformedServer.renderRawResponse('/api/eval-runs', '{ not json')).statusCode, 400);
      assert.equal((await malformedServer.renderJsonResponse('/api/eval-runs', { suiteId: 'missing', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } })).statusCode, 422);
      assert.equal((await malformedServer.renderJsonResponse('/api/eval-runs', { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'test_case', testCaseId: 'missing' } })).statusCode, 422);
    } finally {
      await malformedResult.stop?.();
    }

    const errorServer = new FakeLocalHttpServer(4321);
    const errorStarter = new NodeLocalWorkbenchServerStarter((handler) => {
      errorServer.handler = handler;
      return errorServer;
    }, () => runtimeDependencies({ run: runDependencies([], { throws: true }) }));
    const errorResult = await errorStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await errorServer.renderJsonResponse('/api/eval-runs', { suiteId: 'skill-authoring', evalRunModel: 'gpt-5-mini', scope: { type: 'all' } });
      assert.equal(response.statusCode, 422);
      assert.match(response.body, /runner-error/);
      assert.doesNotMatch(response.body, /full raw output|secret|\/repo/);
    } finally {
      await errorResult.stop?.();
    }
  });

  it('serves failure analysis unavailable, success, LLM failure, invalid JSON, oversized body, and one-assertion scope checks', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const analysisCalls: unknown[] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    }, () => runtimeDependencies({ analysis: analysisDependencies({ hasKey: false, analysisCalls }) }));

    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const unavailable = await fakeServer.renderJsonResponse('/api/failure-analysis', analysisPayload());
      assert.equal(unavailable.statusCode, 200);
      assert.match(unavailable.body, /analysis-unavailable|Analysis unavailable|OPENAI_API_KEY/);
      assert.equal(analysisCalls.length, 0);
      assert.doesNotMatch(unavailable.body, /secret|raw prompt|full model response|other failed output|\/repo/);

      assert.equal((await fakeServer.renderRawResponse('/api/failure-analysis', '{ nope')).statusCode, 400);
      assert.equal((await fakeServer.renderRawResponse('/api/failure-analysis', JSON.stringify(analysisPayload()) + 'x'.repeat(70 * 1024))).statusCode, 400);
      assert.equal((await fakeServer.renderJsonResponse('/api/failure-analysis', { ...analysisPayload(), assertionIds: ['a1', 'a2'] })).statusCode, 400);
    } finally {
      await result.stop?.();
    }

    const successServer = new FakeLocalHttpServer(4321);
    const successCalls: unknown[] = [];
    const successStarter = new NodeLocalWorkbenchServerStarter((handler) => { successServer.handler = handler; return successServer; }, () => runtimeDependencies({ analysis: analysisDependencies({ model: 'override-model', analysisCalls: successCalls }) }));
    const successResult = await successStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await successServer.renderJsonResponse('/api/failure-analysis', analysisPayload());
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /analysis-ready|override-model|prompt_issue/);
      assert.equal(successCalls.length, 1);
      assert.doesNotMatch(response.body, /secret|raw prompt|full model response|other failed output|proposal|approve|mutation|\/repo/);
    } finally {
      await successResult.stop?.();
    }

    const failureServer = new FakeLocalHttpServer(4321);
    const failureStarter = new NodeLocalWorkbenchServerStarter((handler) => { failureServer.handler = handler; return failureServer; }, () => runtimeDependencies({ analysis: analysisDependencies({ throws: true }) }));
    const failureResult = await failureStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await failureServer.renderJsonResponse('/api/failure-analysis', analysisPayload());
      assert.equal(response.statusCode, 502);
      const payload = JSON.parse(response.body) as {
        readonly reason: string;
        readonly issue: {
          readonly stage: string;
          readonly outcome: string;
          readonly category: string;
          readonly explanation: string;
          readonly nextStep: string;
          readonly reference: string;
        };
        readonly reference: string;
      };
      assert.equal(payload.reason, 'unknown');
      assert.equal(payload.issue.stage, 'analysis');
      assert.equal(payload.issue.outcome, 'failed');
      assert.equal(payload.issue.category, 'unknown');
      assert.match(payload.issue.explanation, /Cause unknown/i);
      assert.match(payload.issue.nextStep, /report the issue using this reference/i);
      assert.match(payload.issue.reference, /^[a-f0-9-]{36}$/);
      assert.equal(payload.reference, payload.issue.reference);
      assert.equal(response.headers['x-sibu-request-reference'], payload.issue.reference);
      assert.doesNotMatch(response.body, /full model response|secret|raw prompt|\/repo/);
    } finally {
      await failureResult.stop?.();
    }
  });

  it('serves repair proposal unavailable, success, rejection, LLM failure, invalid JSON, and active assertion scoping', async () => {
    const unavailableServer = new FakeLocalHttpServer(4321);
    const proposalCalls: unknown[] = [];
    const unavailableStarter = new NodeLocalWorkbenchServerStarter((handler) => { unavailableServer.handler = handler; return unavailableServer; }, () => runtimeDependencies({ proposal: proposalDependencies({ hasKey: false, proposalCalls }) }));
    const unavailableResult = await unavailableStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await unavailableServer.renderJsonResponse('/api/repair-proposals', proposalPayload());
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /proposal-unavailable|OPENAI_API_KEY/);
      assert.equal(proposalCalls.length, 0);
      assert.doesNotMatch(response.body, /secret|raw prompt|full model response|other failed output|\/repo/);
      assert.equal((await unavailableServer.renderRawResponse('/api/repair-proposals', '{ nope')).statusCode, 400);
      assert.equal((await unavailableServer.renderRawResponse('/api/repair-proposals', JSON.stringify(proposalPayload()) + 'x'.repeat(70 * 1024))).statusCode, 400);
      assert.equal((await unavailableServer.renderJsonResponse('/api/repair-proposals', { ...proposalPayload(), assertionIds: ['a1', 'a2'] })).statusCode, 400);
    } finally { await unavailableResult.stop?.(); }

    const successServer = new FakeLocalHttpServer(4321);
    const successCalls: unknown[] = [];
    const successStarter = new NodeLocalWorkbenchServerStarter((handler) => { successServer.handler = handler; return successServer; }, () => runtimeDependencies({ proposal: proposalDependencies({ model: 'override-model', proposalCalls: successCalls }) }));
    const successResult = await successStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await successServer.renderJsonResponse('/api/repair-proposals', proposalPayload());
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /proposal-ready|override-model|pending|prompts\/skill-authoring\.md/);
      assert.equal(successCalls.length, 1);
      assert.doesNotMatch(response.body, /OPENAI_API_KEY|secret|raw prompt|full model response|other failed output|\/repo/);
    } finally { await successResult.stop?.(); }

    const rejectedServer = new FakeLocalHttpServer(4321);
    const rejectedStarter = new NodeLocalWorkbenchServerStarter((handler) => { rejectedServer.handler = handler; return rejectedServer; }, () => runtimeDependencies({ proposal: proposalDependencies({ summary: 'fix it' }) }));
    const rejectedResult = await rejectedStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try { assert.equal((await rejectedServer.renderJsonResponse('/api/repair-proposals', proposalPayload())).statusCode, 422); }
    finally { await rejectedResult.stop?.(); }

    const failureServer = new FakeLocalHttpServer(4321);
    const failureStarter = new NodeLocalWorkbenchServerStarter((handler) => { failureServer.handler = handler; return failureServer; }, () => runtimeDependencies({ proposal: proposalDependencies({ throws: true }) }));
    const failureResult = await failureStarter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await failureServer.renderJsonResponse('/api/repair-proposals', proposalPayload());
      assert.equal(response.statusCode, 502);
      assert.match(response.body, /unknown-cause/);
      assert.doesNotMatch(response.body, /full model response|secret|raw prompt/);
    } finally { await failureResult.stop?.(); }
  });

  it('maps approved repair apply endpoint invalid, missing approval, stale, blocked, and successful results', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const mutationCalls: unknown[] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => { fakeServer.handler = handler; return fakeServer; }, () => runtimeDependencies({ applyRepair: applyRepairDependencies({ mutationCalls }) }));
    const result = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      assert.equal((await fakeServer.renderRawResponse('/api/repair-proposals/apply', '{ nope')).statusCode, 400);
      assert.equal((await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { proposalId: 'repair_1' })).statusCode, 400);

      const selection = analysisPayload();
      const missingApproval = await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { ...selection, proposalId: 'repair_1', approvalMarker: 'not-approved' });
      assert.equal(missingApproval.statusCode, 422);
      assert.match(missingApproval.body, /missing-approval/);
      assert.equal(mutationCalls.length, 0);

      const stale = await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { ...selection, proposalId: 'stale', approvalMarker: APPLY_APPROVED_REPAIR_MARKER });
      assert.equal(stale.statusCode, 422);
      assert.match(stale.body, /stale-proposal/);
      assert.equal(mutationCalls.length, 0);

      const blocked = await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { ...selection, proposalId: 'unsafe', approvalMarker: APPLY_APPROVED_REPAIR_MARKER });
      assert.equal(blocked.statusCode, 422);
      assert.match(blocked.body, /unsafe-target/);
      assert.equal(mutationCalls.length, 0);

      const applied = await fakeServer.renderJsonResponse('/api/repair-proposals/apply', { ...selection, proposalId: 'repair_1', approvalMarker: APPLY_APPROVED_REPAIR_MARKER });
      assert.equal(applied.statusCode, 200);
      assert.match(applied.body, /applied|prompts\/skill-authoring\.md|changedFileCount|rerunRecommendation/);
      assert.match(applied.body, /Rerun this test case|Rerun full suite/);
      assert.equal(mutationCalls.length, 1);
      assert.doesNotMatch(applied.body, /secret|OPENAI_API_KEY|workflow health|old content|new content/);
    } finally { await result.stop?.(); }
  });

  it('correlates partial apply uncertainty without leaking proposal text, paths, or thrown errors', async () => {
    const server = new FakeLocalHttpServer(4321);
    const events: unknown[] = [];
    const reference = '123e4567-e89b-42d3-a456-426614174000';
    const dependencies = applyRepairDependencies();
    const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; },
      () => runtimeDependencies({ applyRepair: { ...dependencies, mutator: { applyApprovedChange: async () => ({
        status: 'failed', reason: 'sk-secret thrown mutator error', changedFiles: [{ path: 'prompts/skill-authoring.md' }],
      }) } } }), { info: event => events.push(event), warn: event => events.push(event), error: event => events.push(event) });
    const started = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const selection = analysisPayload();
      const request = { ...selection, proposalId: 'repair_1', approvalMarker: APPLY_APPROVED_REPAIR_MARKER,
        privateText: 'sk-secret proposal text' };
      const response = await server.renderJsonResponse('/api/repair-proposals/apply', request, reference);
      const payload = JSON.parse(response.body) as { status: string; mutationState: string; inspectionPaths: string[];
        issue: { stage: string; outcome: string; category: string; reference: string } };
      assert.equal(response.statusCode, 500);
      assert.equal(payload.status, 'error');
      assert.equal(payload.mutationState, 'attempted-outcome-uncertain');
      assert.deepEqual(payload.inspectionPaths, ['prompts/skill-authoring.md']);
      assert.deepEqual(payload.issue, { stage: 'repair-apply', outcome: 'uncertain', category: 'mutation-failure', reference,
        title: 'Repair outcome not confirmed', explanation: 'Sibu could not confirm the file outcome.',
        nextStep: 'Inspect the named project files before drafting another proposal. Do not repeat this approved change.', recoveryAction: 'inspect' });
      assert.equal(response.headers['x-sibu-request-reference'], reference);
      const terminal = events.at(-1) as { outcome: string; reason: string; reference: string; changedFileCount: number };
      assert.deepEqual({ outcome: terminal.outcome, reason: terminal.reason, reference: terminal.reference,
        changedFileCount: terminal.changedFileCount }, { outcome: 'uncertain', reason: 'mutation-failure', reference, changedFileCount: 1 });
      assert.doesNotMatch(JSON.stringify(events) + JSON.stringify(payload.issue), /sk-secret|prompts\/|proposalId|privateText/);
    } finally { await started.stop?.(); }
  });
});

async function requestDiscovery(server: FakeLocalHttpServer, reference: string): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  assert.ok(server.handler);
  let statusCode = 0;
  let headers: Record<string, string> = {};
  let body = '';
  server.handler(Object.assign({ url: '/api/eval-suites', method: 'GET' }, { headers: { 'x-sibu-request-reference': reference } }), {
    writeHead: (status, values) => { statusCode = status; headers = values; },
    end: (value) => { body = value; },
  });
  await new Promise((resolve) => setImmediate(resolve));
  return { statusCode, headers, body };
}
