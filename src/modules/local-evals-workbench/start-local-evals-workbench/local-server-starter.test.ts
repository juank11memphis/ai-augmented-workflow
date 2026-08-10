import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { RunLocalEvalSuiteDependencies } from '../run-local-eval-suite/index.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';

describe('NodeLocalWorkbenchServerStarter', () => {
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
      assert.match(response.body, /Local Sibu Evals/);
      assert.match(response.body, /Eval Suite/);
      assert.match(response.body, /Skill authoring checks/);
      assert.match(response.body, /Run scope/);
      assert.match(response.body, /Run all 2 test cases/);
      assert.match(response.body, /Model/);
      assert.match(response.body, /Pass rate/);
      assert.match(response.body, /0\/2 complete/);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.doesNotMatch(response.body, /openai-secret-for-test|model-secret-for-test|OPENAI_API_KEY|SIBU_EVALS_MODEL|process\.env|mutation|mutate|\/repo/);
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
      assert.equal(payload.suites[0]?.name, 'Skill authoring checks');
      assert.equal(payload.suites[0]?.readyTestCaseCount, 2);
      assert.equal(payload.suites[0]?.modelOptions[0]?.id, 'gpt-5-mini');
      assert.doesNotMatch(response.body, /\/repo|OPENAI_API_KEY|secret/);
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


  it('runs all test cases through POST /api/eval-runs', async () => {
    const fakeServer = new FakeLocalHttpServer(4321);
    const calls: string[][] = [];
    const starter = new NodeLocalWorkbenchServerStarter((handler) => {
      fakeServer.handler = handler;
      return fakeServer;
    }, () => runDependencies(calls));

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
    }, () => runDependencies(calls));

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
    }, () => runDependencies([]));
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
    }, () => runDependencies([], { throws: true }));
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
});

function readyDiscovery(): EvalSuiteDiscoveryResult {
  return {
    status: 'ready',
    suites: [{
      id: 'skill-authoring',
      name: 'Skill authoring checks',
      description: 'Checks generated skills.',
      readyTestCaseCount: 2,
      modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }],
    }],
    diagnostics: [],
  };
}

function blockedDiscovery(): EvalSuiteDiscoveryResult {
  return {
    status: 'blocked',
    reason: 'missing-evals-folder',
    message: 'No conventional evals folder was found.',
    guidance: ['Add Sibu eval suite JSON files under the project root evals/ folder.'],
    suites: [],
    diagnostics: [{ code: 'evals-folder-missing', severity: 'info', location: 'evals', message: 'Project does not contain a root evals/ folder.' }],
  };
}



function runDependencies(calls: string[][], options: { readonly throws?: boolean } = {}): RunLocalEvalSuiteDependencies {
  const suite = {
    id: 'skill-authoring',
    name: 'Skill authoring checks',
    modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }],
    testCases: [{ id: 'missing-skill-boundary', name: 'Missing skill boundary' }, { id: 'names-artifact', name: 'Names artifact' }],
  };
  return {
    suiteRegistry: { findSuite: async (_projectRoot, suiteId) => suiteId === suite.id ? suite : null },
    evalRunner: {
      runSuite: async (request) => {
        calls.push(request.testCases.map((testCase) => testCase.id));
        if (options.throws) throw new Error('full raw output secret /repo');
        return { status: 'completed', cells: request.testCases.map((testCase) => ({ testCaseId: testCase.id, status: 'passed' as const, output: 'short safe preview' })) };
      },
    },
    artifactStore: { storeRunArtifact: async () => undefined },
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  };
}

type FakeResponse = {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
};

type FakeHandler = (request: { readonly url?: string; readonly method?: string; readonly on?: (event: string, listener: Function) => void }, response: {
  writeHead(statusCode: number, headers: Record<string, string>): void;
  end(body: string): void;
}) => void;

class FakeLocalHttpServer {
  handler?: FakeHandler;
  listenHost?: string;
  private closed = false;

  constructor(private readonly port: number) {}

  once(_event: 'error', _listener: (error: Error) => void): void {}

  off(_event: 'error', _listener: (error: Error) => void): void {}

  listen(_port: number, host: string, callback: () => void): void {
    this.listenHost = host;
    callback();
  }

  address(): { port: number } {
    return { port: this.port };
  }

  close(callback: (error?: Error) => void): void {
    this.closed = true;
    callback();
  }

  renderResponse(url: string): FakeResponse {
    assert.equal(this.closed, false);
    assert.ok(this.handler);
    let statusCode = 0;
    let headers: Record<string, string> = {};
    let body = '';

    this.handler({ url, method: 'GET' }, {
      writeHead: (nextStatusCode, nextHeaders) => {
        statusCode = nextStatusCode;
        headers = nextHeaders;
      },
      end: (nextBody) => {
        body = nextBody;
      },
    });

    return { statusCode, headers, body };
  }

  async renderJsonResponse(url: string, payload: unknown): Promise<FakeResponse> {
    return this.renderRawResponse(url, JSON.stringify(payload));
  }

  async renderRawResponse(url: string, bodyPayload: string): Promise<FakeResponse> {
    assert.equal(this.closed, false);
    assert.ok(this.handler);
    let statusCode = 0;
    let headers: Record<string, string> = {};
    let body = '';
    const listeners = new Map<string, Function[]>();
    const request = {
      url,
      method: 'POST',
      on: (event: string, listener: Function) => {
        listeners.set(event, [...(listeners.get(event) ?? []), listener]);
      },
    };

    this.handler(request, {
      writeHead: (nextStatusCode, nextHeaders) => {
        statusCode = nextStatusCode;
        headers = nextHeaders;
      },
      end: (nextBody) => {
        body = nextBody;
      },
    });

    for (const listener of listeners.get('data') ?? []) listener(bodyPayload);
    for (const listener of listeners.get('end') ?? []) listener();
    await new Promise((resolve) => setImmediate(resolve));
    return { statusCode, headers, body };
  }
}

