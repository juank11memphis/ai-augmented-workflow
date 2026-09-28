import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from '../run-history/store-fixture.js';
import { project } from '../run-history/test-project.js';
import { evidence as baseEvidence } from '../run-history/test-fixtures.js';
import { FileArtifactReader } from '../run-history/file-artifact-reader.js';
import { createSelectedFailureReader } from './selected-evidence.js';
import { analyzeFailedAssertion } from '../analyze-failed-assertion/handler.js';

test('one persisted failed check survives reader restart and analysis never mutates source or run evidence', async () => {
  const workspace = await project();
  try {
    const first = fixture(workspace.root);
    const configuration = { suiteId: 'suite', caseIds: ['case', 'other-case'], scope: 'all' as const,
      testedModel: 'synthetic', judgeModel: null, repeats: 2 };
    const created = await first.store.create(configuration);
    assert.equal(created.status, 'ok');
    if (created.status !== 'ok') return;
    const runId = created.value.runId;
    assert.equal((await first.store.start('suite', runId)).status, 'ok');
    for (const caseId of configuration.caseIds) {
      for (const number of [1, 2]) {
        const target = caseId === 'case' && number === 2;
        const base = baseEvidence(runId);
        const attempt = { ...base, caseId, number, outcome: target ? 'failed' as const : 'passed' as const,
          output: target ? 'RAW RESPONSE OPENAI_API_KEY=synthetic-local-only' : 'OTHER ATTEMPT OUTPUT',
          turns: [{ id: 'turn', role: 'assistant' as const, content: target ? 'SELECTED TURN' : 'OTHER TURN' },
            { id: 'unlinked', role: 'user' as const, content: 'UNLINKED TURN' }],
          tools: [{ id: 'tool', name: 'verify', arguments: target ? 'SELECTED TOOL' : 'OTHER TOOL', result: 'result' }],
          assertions: [{ ...base.assertions[0]!, outcome: target ? 'failed' as const : 'passed' as const,
            actual: target ? 'SELECTED ACTUAL OPENAI_API_KEY=synthetic-selected' : 'OTHER ACTUAL', expected: 'EXPECTED', score: target ? 0 : 1,
            diagnostics: target ? ['SELECTED DIAGNOSTIC'] : [], turnIds: ['turn'], toolIds: ['tool'] },
            { ...base.assertions[0]!, id: 'other-assertion', actual: 'OTHER ASSERTION', turnIds: [], toolIds: [] }],
        };
        assert.equal((await first.store.append('suite', runId, attempt)).status, 'ok');
      }
    }
    assert.equal((await first.store.finalize('suite', runId, 'completed')).status, 'ok');
    const other = await first.store.create({ ...configuration, caseIds: ['other-case'], repeats: 1 });
    assert.equal(other.status, 'ok');
    if (other.status === 'ok') {
      await first.store.start('suite', other.value.runId);
      const otherAttempt = { ...baseEvidence(other.value.runId), caseId: 'other-case', outcome: 'failed' as const,
        output: 'OTHER RUN OUTPUT', assertions: [{ ...baseEvidence(other.value.runId).assertions[0]!, outcome: 'failed' as const,
          actual: 'OTHER RUN ACTUAL', score: 0 }] };
      assert.equal((await first.store.append('suite', other.value.runId, otherAttempt)).status, 'ok');
      assert.equal((await first.store.finalize('suite', other.value.runId, 'completed')).status, 'ok');
    }
    const file = path.join(workspace.root, 'evals/artifacts', first.paths.attempt('suite', runId, 'case', 2));
    const before = await readFile(file);
    const reopened = fixture(workspace.root);
    const history = new FileArtifactReader(reopened.paths, reopened.reader);
    const selectedReader = createSelectedFailureReader(async command => history.get(command.suiteId, command.runId, command.selection));
    const localDetail = await history.get('suite', runId, { caseId: 'case', attempt: 2 });
    assert.equal(localDetail.status, 'ok');
    if (localDetail.status === 'ok') assert.match(localDetail.value.evidence?.output ?? '', /RAW RESPONSE OPENAI_API_KEY=synthetic-local-only/);
    const command = { projectRoot: workspace.root, suiteId: 'suite', runId, attempt: 2, testCaseId: 'case',
      evalRunModelId: 'synthetic', runScope: { type: 'all' as const }, assertionId: 'assertion' };
    const providerCalls: unknown[] = [];
    let hasKey = false;
    let fails = false;
    const dependencies = {
      artifactReader: selectedReader,
      assistanceConfig: { getConfig: () => ({ hasOpenAiApiKey: hasKey, assistanceModelLabel: 'fake', apiKey: hasKey ? 'private-key' : undefined }) },
      llm: { analyzeFailure: async (request: { evidence: unknown }) => { providerCalls.push(request); if (fails) throw new Error('private provider body');
        return { exactFailureExplanation: 'Selected assertion failed', likelyCause: 'prompt_issue' as const, evidenceSummary: 'Actual differed', uncertainty: 'Low' }; } },
      analysisStore: { save: () => 'session-analysis' }, logger: { info() {}, warn() {}, error() {} },
    };
    const unavailable = await analyzeFailedAssertion(command, dependencies);
    assert.equal(unavailable.status, 'analysis-unavailable');
    assert.equal(providerCalls.length, 0);
    hasKey = true;
    fails = true;
    const error = await analyzeFailedAssertion(command, dependencies);
    assert.equal(error.status, 'error');
    assert.match(JSON.stringify(error), /SELECTED ACTUAL/);
    fails = false;
    const ready = await analyzeFailedAssertion(command, dependencies);
    assert.equal(ready.status, 'analysis-ready');
    assert.equal(providerCalls.length, 2);
    const sent = JSON.stringify(providerCalls);
    assert.match(sent, /SELECTED ACTUAL OPENAI_API_KEY=synthetic-selected|SELECTED TURN|SELECTED TOOL/);
    assert.doesNotMatch(sent, /OTHER RUN ACTUAL|OTHER ACTUAL|OTHER ASSERTION|OTHER TURN|UNLINKED TURN|synthetic-local-only|private-key/);
    assert.deepEqual(await readFile(file), before);
    assert.equal((await selectedReader.read({ suiteId: 'suite', runId: 'missing', testCaseId: 'case', attempt: 2, assertionId: 'assertion' })).status, 'blocked');
  } finally {
    await workspace.cleanup();
  }
});
