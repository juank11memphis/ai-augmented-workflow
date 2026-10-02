import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DraftEvalRepairProposalResult } from '../draft-eval-repair-proposal/result.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';
import { proposalIssue } from './proposal-public-issue.js';
import { FakeLocalHttpServer, readyDiscovery, runtimeDependencies, proposalDependencies, proposalPayload, applyRepairDependencies } from './local-server-starter-test-fixture.js';

const acceptedReference = '123e4567-e89b-72d3-a456-426614174000';
const privateMarker = 'sk-private-prompt-provider-body';

describe('proposal HTTP diagnostics', () => {
  it('maps every known result reason without exposing result evidence or arbitrary text in public copy', () => {
    const reasons = [
      'missing-openai-api-key', 'invalid-scope', 'unclear-direction', 'stale-analysis', 'missing-artifact',
      'missing-cell', 'missing-assertion', 'non-failed-assertion', 'unsafe-target-files', 'vague-proposal',
      'provider-authorization', 'provider-rate-limit', 'provider-timeout', 'provider-unavailable',
      'invalid-llm-response', 'llm-failure', 'unknown-cause',
    ] as const;
    for (const reason of reasons) {
      const status = reason === 'missing-openai-api-key' ? 'proposal-unavailable'
        : reason === 'vague-proposal' ? 'proposal-rejected'
        : reason.startsWith('provider-') || ['invalid-llm-response', 'llm-failure', 'unknown-cause'].includes(reason) ? 'error' : 'blocked';
      const result = { status, reason, message: privateMarker, evidence: { secret: privateMarker } } as unknown as Exclude<DraftEvalRepairProposalResult, { status: 'proposal-ready' }>;
      const issue = proposalIssue(result, acceptedReference);
      assert.equal(issue.category, reason);
      assert.equal(issue.outcome, status === 'error' ? 'failed' : 'blocked');
      assert.deepEqual(Object.keys(issue).sort(), ['stage', 'outcome', 'category', 'title', 'explanation', 'nextStep', 'recoveryAction', 'reference'].sort());
      assert.doesNotMatch(JSON.stringify(issue), /sk-private|secret|provider-body/);
    }
  });

  it('correlates blocked, rejected, provider-failed, and unknown outcomes while leaving evidence and apply untouched', async () => {
    const cases = [
      { name: 'blocked', overrides: { hasKey: false }, status: 'proposal-unavailable', reason: 'missing-openai-api-key', code: 200 },
      { name: 'rejected', overrides: { summary: 'fix it' }, status: 'proposal-rejected', reason: 'vague-proposal', code: 422 },
      { name: 'provider-failed', overrides: { throws: true }, status: 'error', reason: 'unknown-cause', code: 502 },
    ] as const;
    for (const entry of cases) {
      const server = new FakeLocalHttpServer(4321);
      const events: Record<string, unknown>[] = [];
      let saves = 0;
      const mutationCalls: unknown[] = [];
      const proposal = proposalDependencies(entry.overrides);
      const dependencies = runtimeDependencies({ proposal: { ...proposal,
        proposalStore: { savePendingProposal: async request => { saves++; return proposal.proposalStore.savePendingProposal(request); } },
      }, applyRepair: applyRepairDependencies({ mutationCalls }) });
      const logger = { info: (event: Record<string, unknown>) => events.push(event), warn: (event: Record<string, unknown>) => events.push(event), error: (event: Record<string, unknown>) => events.push(event) };
      const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; }, () => dependencies, logger);
      const started = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
      try {
        const response = await server.renderJsonResponse('/api/repair-proposals', proposalPayload(), acceptedReference);
        const payload = JSON.parse(response.body) as { status: string; reason: string; issue: { category: string; reference: string; stage: string }; reference: string; evidence?: unknown };
        assert.equal(response.statusCode, entry.code, entry.name);
        assert.equal(payload.status, entry.status);
        assert.equal(payload.reason, entry.reason);
        assert.equal(payload.issue.category, entry.reason);
        assert.equal(payload.issue.stage, 'proposal');
        assert.equal(payload.issue.reference, acceptedReference);
        assert.equal(payload.reference, acceptedReference);
        assert.equal(response.headers['x-sibu-request-reference'], acceptedReference);
        assert.ok(payload.evidence, 'saved selected evidence stays in the result');
        assert.equal(saves, 0);
        assert.equal(mutationCalls.length, 0);
        assert.deepEqual(events.filter(event => event.outcome !== 'started').map(event => ({ event: event.event, reason: event.reason, reference: event.reference })),
          [{ event: entry.status === 'proposal-unavailable' ? 'repair_proposal_unavailable' : entry.status === 'proposal-rejected' ? 'repair_proposal_rejected' : 'repair_proposal_failed', reason: entry.reason, reference: acceptedReference }]);
        assert.doesNotMatch(JSON.stringify(payload.issue) + JSON.stringify(events), /sk-private|full model response|raw prompt|provider-body|\/repo/);
      } finally { await started.stop?.(); }
    }
  });

  it('returns one matching boundary event for malformed and oversized input, replacing unsafe references', async () => {
    const server = new FakeLocalHttpServer(4321);
    const events: Record<string, unknown>[] = [];
    const logger = { info: () => undefined, warn: (event: Record<string, unknown>) => events.push(event), error: () => undefined };
    const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; }, () => runtimeDependencies(), logger);
    const started = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      for (const body of ['{ nope ' + privateMarker, JSON.stringify(proposalPayload()) + privateMarker.repeat(5000)]) {
        const response = await server.renderRawResponse('/api/repair-proposals', body, privateMarker);
        const payload = JSON.parse(response.body) as { issue: { reference: string; category: string }; reference: string };
        assert.equal(response.statusCode, 400);
        assert.equal(payload.issue.category, 'invalid-request');
        assert.equal(payload.issue.reference, payload.reference);
        assert.equal(response.headers['x-sibu-request-reference'], payload.reference);
        assert.match(payload.reference, /^[a-f0-9-]{36}$/);
        assert.equal(events.at(-1)?.reference, payload.reference);
        assert.doesNotMatch(response.body + JSON.stringify(events), /sk-private|provider-body/);
      }
      assert.equal(events.length, 2);
    } finally { await started.stop?.(); }
  });

  it('keeps a handler result when the diagnostic sink fails', async () => {
    const server = new FakeLocalHttpServer(4321);
    const logger = { info: () => { throw new Error(privateMarker); }, warn: () => { throw new Error(privateMarker); }, error: () => { throw new Error(privateMarker); } };
    const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; }, () => runtimeDependencies({ proposal: proposalDependencies({ hasKey: false }) }), logger);
    const started = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      const response = await server.renderJsonResponse('/api/repair-proposals', proposalPayload(), acceptedReference);
      assert.equal(response.statusCode, 200);
      assert.equal((JSON.parse(response.body) as { issue: { reference: string } }).issue.reference, acceptedReference);
      assert.doesNotMatch(response.body, /sk-private|provider-body/);
    } finally { await started.stop?.(); }
  });

  it('contains a pre-handler request failure with an unknown issue and matching boundary event', async () => {
    const server = new FakeLocalHttpServer(4321);
    const events: Record<string, unknown>[] = [];
    const logger = { info: () => undefined, warn: () => undefined, error: (event: Record<string, unknown>) => events.push(event) };
    const starter = new NodeLocalWorkbenchServerStarter(handler => { server.handler = handler; return server; }, () => runtimeDependencies(), logger);
    const started = await starter.startServer({ projectRoot: '/repo', initialDiscoveryResult: readyDiscovery() });
    try {
      let body = '';
      let status = 0;
      let headers: Record<string, string> = {};
      server.handler?.({ url: '/api/repair-proposals', method: 'POST', headers: { 'x-sibu-request-reference': acceptedReference },
        on: () => { throw new Error(privateMarker); } }, {
        writeHead: (code, responseHeaders) => { status = code; headers = responseHeaders; },
        end: value => { body = value; },
      });
      await new Promise(resolve => setImmediate(resolve));
      const payload = JSON.parse(body) as { reason: string; issue: { category: string; reference: string } };
      assert.equal(status, 500);
      assert.equal(payload.reason, 'unknown-cause');
      assert.equal(payload.issue.category, 'unknown-cause');
      assert.equal(headers['x-sibu-request-reference'], acceptedReference);
      assert.deepEqual(events.map(event => ({ event: event.event, reason: event.reason, reference: event.reference })),
        [{ event: 'local_evals_workbench_proposal_boundary_issue', reason: 'unknown-cause', reference: acceptedReference }]);
      assert.doesNotMatch(body + JSON.stringify(events), /sk-private|provider-body/);
    } finally { await started.stop?.(); }
  });
});
