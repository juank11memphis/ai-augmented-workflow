import assert from 'node:assert/strict';
import test from 'node:test';
import { BoundedExecuteStream } from './execute-stream.js';

const limits = { lineBytes: 100, stdoutBytes: 1000, events: 10 };
test('seeded byte boundaries preserve ordered UTF-8 NDJSON events', async () => {
  const source = Buffer.from('{"value":"✓"}\n{"value":2}\n');
  for (let seed = 1; seed <= 32; seed++) {
    const stream = new BoundedExecuteStream(limits);
    const received: unknown[] = [];
    for (let index = 0; index < source.length;) {
      const width = (index * 7 + seed) % 5 + 1;
      await stream.push(source.subarray(index, index + width), async event => { received.push(event); await Promise.resolve(); });
      index += width;
    }
    stream.finish();
    assert.deepEqual(received, [{ value: '✓' }, { value: 2 }]);
  }
});

test('malformed encoding, missing newline, and finite budgets reject rather than truncate', async () => {
  const malformed = new BoundedExecuteStream(limits);
  await assert.rejects(malformed.push(Buffer.from([0xff, 10]), async () => undefined));
  const trailing = new BoundedExecuteStream(limits);
  await trailing.push(Buffer.from('{"value":1}'), async () => undefined);
  assert.throws(() => trailing.finish());
  const short = new BoundedExecuteStream({ lineBytes: 3, stdoutBytes: 10, events: 1 });
  await assert.rejects(short.push(Buffer.from('{"x":1}\n'), async () => undefined));
});
