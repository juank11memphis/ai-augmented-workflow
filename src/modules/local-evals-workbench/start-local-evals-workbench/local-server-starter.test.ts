import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
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
      assert.match(response.body, /1 eval suite ready/);
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

type FakeResponse = {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
};

type FakeHandler = (request: { readonly url?: string }, response: {
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

    this.handler({ url }, {
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
}
