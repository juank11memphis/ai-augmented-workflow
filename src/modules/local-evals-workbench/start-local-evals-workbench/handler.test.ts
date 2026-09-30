import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startLocalEvalsWorkbench } from './handler.js';
import type { InternalEvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { EvalSuiteDiscoveryPort, LocalEvalsWorkbenchLogEvent, LocalWorkbenchServerStartRequest, LocalWorkbenchServerStarterPort, WorkflowStateReaderPort } from './ports.js';

const projectRoot = '/repo';

describe('startLocalEvalsWorkbench', () => {
  it('starts the local workbench when Sibu state is valid', async () => {
    const logs = new CapturingLogger();
    const serverStarter = new CountingServerStarter();

    const result = await startLocalEvalsWorkbench({ type: 'evals', projectRoot }, {
      workflowStateReader: stateReader({ status: 'valid' }),
      suiteDiscovery: suiteDiscovery(readyDiscovery()),
      serverStarter,
      logger: logs,
    });

    assert.equal(result.status, 'started');
    assert.equal(result.url, 'http://127.0.0.1:4321/');
    assert.equal(serverStarter.calls, 1);
    assert.deepEqual(logs.events.map((event) => event.event), ['local_evals_workbench_start_requested', 'local_evals_workbench_started']);
    assert.equal(serverStarter.lastRequest?.initialDiscoveryResult.status, 'ready');
  });

  it('blocks and skips server startup when workflow state is missing', async () => {
    const serverStarter = new CountingServerStarter();

    const result = await startLocalEvalsWorkbench({ type: 'evals', projectRoot }, {
      workflowStateReader: stateReader({ status: 'missing', message: '.sibu/state.json is missing.' }),
      suiteDiscovery: suiteDiscovery(readyDiscovery()),
      serverStarter,
      logger: new CapturingLogger(),
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'missing-workflow-state');
    assert.match(result.guidance.join('\n'), /sibu init/);
    assert.equal(serverStarter.calls, 0);
  });

  it('blocks and skips server startup when workflow state is invalid', async () => {
    const serverStarter = new CountingServerStarter();

    const result = await startLocalEvalsWorkbench({ type: 'evals', projectRoot }, {
      workflowStateReader: stateReader({ status: 'invalid', message: '.sibu/state.json could not be parsed.' }),
      suiteDiscovery: suiteDiscovery(readyDiscovery()),
      serverStarter,
      logger: new CapturingLogger(),
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'invalid-workflow-state');
    assert.match(result.guidance.join('\n'), /sibu doctor/);
    assert.match(result.guidance.join('\n'), /sibu sync/);
    assert.equal(serverStarter.calls, 0);
  });

  it('does not expose a raw workflow-state reader message', async () => {
    const result = await startLocalEvalsWorkbench({ type: 'evals', projectRoot }, {
      workflowStateReader: stateReader({ status: 'invalid', message: 'OPENAI_API_KEY=secret /repo/private.json' }),
      suiteDiscovery: suiteDiscovery(readyDiscovery()),
      serverStarter: new CountingServerStarter(),
      logger: new CapturingLogger(),
    });
    assert.equal(result.status, 'blocked');
    assert.doesNotMatch(JSON.stringify(result), /OPENAI_API_KEY|secret|private\.json/);
  });

  it('returns a server-start failure without unsafe log metadata', async () => {
    const logs = new CapturingLogger();

    const result = await startLocalEvalsWorkbench({ type: 'evals', projectRoot }, {
      workflowStateReader: stateReader({ status: 'valid' }),
      suiteDiscovery: suiteDiscovery(readyDiscovery()),
      serverStarter: { startServer: async () => { throw new Error('boom OPENAI_API_KEY=secret'); } },
      logger: logs,
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.reason, 'server-start-failed');
    assert.match(result.message, /server.*cause is unknown/);
    assert.doesNotMatch(result.guidance.join(' '), /another local process is blocking/);
    assert.deepEqual(logs.events.at(-1), { event: 'local_evals_workbench_start_failed', reason: 'server-start-failed' });
    const serializedLogs = JSON.stringify(logs.events);
    assert.doesNotMatch(serializedLogs, /secret|OPENAI_API_KEY|SIBU_EVALS_MODEL|\/repo/);
  });

  it('identifies discovery as the last observed failure step and never starts the server', async () => {
    const logs = new CapturingLogger();
    const serverStarter = new CountingServerStarter();
    const result = await startLocalEvalsWorkbench({ type: 'evals', projectRoot }, {
      workflowStateReader: stateReader({ status: 'valid' }),
      suiteDiscovery: { discover: async () => { throw new Error('OPENAI_API_KEY=secret /repo/private.json'); } },
      serverStarter,
      logger: logs,
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.reason, 'discovery-failed');
    assert.match(result.message, /discover eval suites.*cause is unknown/);
    assert.doesNotMatch(result.guidance.join(' '), /port/);
    assert.equal(serverStarter.calls, 0);
    assert.deepEqual(logs.events.at(-1), { event: 'local_evals_workbench_start_failed', reason: 'discovery-failed' });
    assert.doesNotMatch(JSON.stringify({ result, events: logs.events }), /OPENAI_API_KEY|secret|private\.json/);
  });

  it('contains a throwing log sink without changing successful startup', async () => {
    const throwingLogger = {
      info: () => { throw new Error('sink failed'); },
      warn: () => { throw new Error('sink failed'); },
      error: () => { throw new Error('sink failed'); },
    };
    const result = await startLocalEvalsWorkbench({ type: 'evals', projectRoot }, {
      workflowStateReader: stateReader({ status: 'valid' }),
      suiteDiscovery: suiteDiscovery(readyDiscovery()),
      serverStarter: new CountingServerStarter(),
      logger: throwingLogger,
    });
    assert.equal(result.status, 'started');
  });
});


function suiteDiscovery(result: InternalEvalSuiteDiscoveryResult): EvalSuiteDiscoveryPort {
  return { discover: async () => result };
}

function readyDiscovery(): InternalEvalSuiteDiscoveryResult {
  return {
    status: 'ready',
    definitions: [],
    suites: [{ id: 'skill-authoring', name: 'Skill authoring checks', description: 'Checks generated skills.', readyTestCaseCount: 2, testCases: [{ id: 'names-artifact', name: 'Names artifact' }, { id: 'missing-skill-boundary', name: 'Missing skill boundary' }], modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] }],
    diagnostics: [],
  };
}

function stateReader(status: ReturnType<WorkflowStateReaderPort['readWorkflowState']>): WorkflowStateReaderPort {
  return { readWorkflowState: () => status };
}

class CountingServerStarter implements LocalWorkbenchServerStarterPort {
  calls = 0;

  lastRequest?: LocalWorkbenchServerStartRequest;

  async startServer(request: LocalWorkbenchServerStartRequest): Promise<{ url: string; host: '127.0.0.1'; port: number }> {
    this.calls += 1;
    this.lastRequest = request;
    return { url: 'http://127.0.0.1:4321/', host: '127.0.0.1', port: 4321 };
  }
}

class CapturingLogger {
  readonly events: LocalEvalsWorkbenchLogEvent[] = [];

  info(event: LocalEvalsWorkbenchLogEvent): void {
    this.events.push(event);
  }

  warn(event: LocalEvalsWorkbenchLogEvent): void {
    this.events.push(event);
  }

  error(event: LocalEvalsWorkbenchLogEvent): void {
    this.events.push(event);
  }
}
