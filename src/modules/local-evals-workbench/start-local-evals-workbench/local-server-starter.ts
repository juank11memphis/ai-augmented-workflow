import http from 'node:http';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { LocalWorkbenchServerStarterPort, LocalWorkbenchServerStartRequest, LocalWorkbenchServerStartResult } from './ports.js';

const LOCAL_WORKBENCH_HOST = '127.0.0.1' as const;

type LocalHttpResponse = {
  writeHead(statusCode: number, headers: Record<string, string>): void;
  end(body: string): void;
};

type LocalHttpRequest = {
  readonly url?: string;
};

type LocalHttpRequestHandler = (request: LocalHttpRequest, response: LocalHttpResponse) => void;

type LocalHttpServer = {
  once(event: 'error', listener: (error: Error) => void): void;
  off(event: 'error', listener: (error: Error) => void): void;
  listen(port: number, host: string, callback: () => void): void;
  address(): string | { port: number } | null;
  close(callback: (error?: Error) => void): void;
};

type LocalHttpServerFactory = (handler: LocalHttpRequestHandler) => LocalHttpServer;

export class NodeLocalWorkbenchServerStarter implements LocalWorkbenchServerStarterPort {
  constructor(private readonly createServer: LocalHttpServerFactory = createNodeHttpServer) {}

  async startServer(request: LocalWorkbenchServerStartRequest): Promise<LocalWorkbenchServerStartResult> {
    const server = this.createServer((httpRequest, response) => {
      if (httpRequest.url === '/api/eval-suites') {
        response.writeHead(200, jsonHeaders());
        response.end(JSON.stringify(request.initialDiscoveryResult));
        return;
      }

      response.writeHead(200, htmlHeaders());
      response.end(renderSafeWorkbenchShell(request.initialDiscoveryResult));
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, LOCAL_WORKBENCH_HOST, () => {
        server.off('error', reject);
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close(() => undefined);
      throw new Error('Local workbench server did not expose a TCP address.');
    }

    return {
      url: `http://${LOCAL_WORKBENCH_HOST}:${address.port}/`,
      host: LOCAL_WORKBENCH_HOST,
      port: address.port,
      stop: () => closeServer(server),
    };
  }
}

function createNodeHttpServer(handler: LocalHttpRequestHandler): LocalHttpServer {
  return http.createServer((request, response) => handler(request, response));
}

function renderSafeWorkbenchShell(discoveryResult: EvalSuiteDiscoveryResult): string {
  const statusMessage = discoveryResult.status === 'ready'
    ? `${discoveryResult.suites.length} eval suite${discoveryResult.suites.length === 1 ? '' : 's'} ready.`
    : discoveryResult.message;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sibu Local Evals</title>
</head>
<body>
  <main>
    <h1>Local Sibu Evals</h1>
    <p>The local evals workbench runtime is running.</p>
    <p>${escapeHtml(statusMessage)}</p>
    <p>Eval execution and failure analysis will be available in later workbench stories.</p>
  </main>
</body>
</html>`;
}

function htmlHeaders(): Record<string, string> {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  };
}

function jsonHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character] ?? character));
}

function closeServer(server: LocalHttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
