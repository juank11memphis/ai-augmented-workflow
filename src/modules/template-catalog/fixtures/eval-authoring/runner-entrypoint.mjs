import { handleRequest } from './runner-handler.mjs';
import { createTestPorts } from './test-ports.mjs';

// Thin fixture transport/composition. No filesystem, network or live credentials.
const MAX_REQUEST_BYTES = 65536;
const MAX_OUTPUT_BYTES = 262144;
const timer = setTimeout(() => process.exit(1), 3000);
let input = '';
try {
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > MAX_REQUEST_BYTES) throw new Error('request-too-large');
  }
  const { ports } = createTestPorts();
  const result = await handleRequest(JSON.parse(input), ports, { evalMode: process.env.SIBU_EVAL_MODE ?? '' });
  const output = result.events.map((event) => JSON.stringify(event)).join('\n') + '\n';
  if (Buffer.byteLength(output) > MAX_OUTPUT_BYTES) throw new Error('output-too-large');
  process.stdout.write(output);
  process.exitCode = result.status === 'completed' ? 0 : 1;
} catch {
  process.stdout.write(JSON.stringify({ protocolVersion: 1, requestId: 'invalid-request', sequence: 0, type: 'run-diagnostic', runId: null, caseId: null, attempt: null, data: { code: 'invalid-request', message: 'Invalid runner request.' } }) + '\n');
  process.stderr.write('{"event":"fixture_request_rejected","reason":"invalid-request"}\n');
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
