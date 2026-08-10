import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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

    const result = await starter.startServer({ projectRoot: '/repo' });
    try {
      const response = fakeServer.renderResponse();

      assert.equal(fakeServer.listenHost, '127.0.0.1');
      assert.equal(result.host, '127.0.0.1');
      assert.equal(result.url, 'http://127.0.0.1:4321/');
      assert.match(response.body, /Local Sibu Evals/);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.doesNotMatch(response.body, /openai-secret-for-test|model-secret-for-test|OPENAI_API_KEY|SIBU_EVALS_MODEL|process\.env|mutation|mutate|\/repo/);
    } finally {
      await result.stop?.();
      delete process.env.OPENAI_API_KEY;
      delete process.env.SIBU_EVALS_MODEL;
    }
  });
});

type FakeResponse = {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
};

type FakeHandler = (request: unknown, response: {
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

  renderResponse(): FakeResponse {
    assert.equal(this.closed, false);
    assert.ok(this.handler);
    let statusCode = 0;
    let headers: Record<string, string> = {};
    let body = '';

    this.handler({}, {
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
