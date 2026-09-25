import assert from 'node:assert/strict';
import test from 'node:test';
import { BoundedNdjsonParser } from './ndjson-parser.js';
test('NDJSON parses every byte split, including UTF-8 boundaries', () => {
  const event = { name: 'é🙂', sequence: 0 };
  const bytes = Buffer.from(JSON.stringify(event) + '\n');
  for (let split = 1; split < bytes.length; split++) {
    const parser = new BoundedNdjsonParser(100, 100);
    parser.push(bytes.subarray(0, split));
    parser.push(bytes.subarray(split));
    assert.deepEqual(parser.finish(), event);
  }
});
test('NDJSON rejects incomplete, duplicate, malformed and oversized lines', () => {
  for (const input of ['{}', '{}\n{}\n', 'not-json\n', 'x'.repeat(101)]) {
    const parser = new BoundedNdjsonParser(100, 200);
    assert.throws(() => { parser.push(Buffer.from(input)); parser.finish(); });
  }
});
