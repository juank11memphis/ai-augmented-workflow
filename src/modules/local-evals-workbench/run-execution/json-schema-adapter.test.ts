import assert from 'node:assert/strict';
import test from 'node:test';
import type { JsonValue } from '../discover-conventional-eval-suites/index.js';
import { validateJsonSchema } from './json-schema-adapter.js';

const unsupported = { status: 'invalid-schema', diagnostics: ['unsupported-schema'] };

test('basic Draft-07 subset validates nested objects, arrays, values, and sizes without mutation', () => {
  const schema = {
    type: 'object', required: ['rows'], additionalProperties: false,
    properties: { rows: {
      type: 'array', minItems: 1, maxItems: 2,
      items: { type: 'object', required: ['name', 'score'], additionalProperties: false,
        properties: { name: { type: 'string', minLength: 2, maxLength: 4 }, score: { type: 'integer', minimum: 0, maximum: 10 } } },
    } },
  };
  const actual = { rows: [{ name: 'Ada', score: 10 }] };
  const unchanged = JSON.stringify(actual);
  assert.equal(validateJsonSchema(schema, actual).status, 'valid');
  assert.equal(JSON.stringify(actual), unchanged);
  const invalidValues: JsonValue[] = [
    {}, { rows: [] }, { rows: [{ name: 'A', score: 10 }] }, { rows: [{ name: 'Ada', score: 11 }] },
    { rows: [{ name: 'Ada', score: '10' }] }, { rows: [{ name: 'Ada', score: 10, extra: true }] },
    { rows: [{ name: 'Ada', score: 10 }], extra: true },
    { rows: [{ name: 'Ada', score: 10 }, { name: 'Bob', score: 0 }, { name: 'Eve', score: 1 }] },
  ];
  for (const invalid of invalidValues) assert.equal(validateJsonSchema(schema, invalid).status, 'failed');
  assert.equal(validateJsonSchema(true, null).status, 'valid');
  assert.equal(validateJsonSchema(false, null).status, 'failed');
  assert.equal(validateJsonSchema({ enum: [1, 2] }, 2).status, 'valid');
  assert.equal(validateJsonSchema({ enum: [1, 2] }, 3).status, 'failed');
  assert.equal(validateJsonSchema({ const: 'yes' }, 'yes').status, 'valid');
  assert.equal(validateJsonSchema({ const: 'yes' }, 'no').status, 'failed');
  assert.equal(validateJsonSchema({ type: 'object', additionalProperties: { type: 'integer' } }, { x: 1 }).status, 'valid');
  assert.equal(validateJsonSchema({ type: 'object', additionalProperties: { type: 'integer' } }, { x: '1' }).status, 'failed');
});

test('unsupported keywords at root and nested schema locations fail before Ajv compilation', () => {
  for (const keyword of ['$ref', '$id', '$schema', 'pattern', 'patternProperties', 'definitions', '$defs',
    'allOf', 'anyOf', 'oneOf', 'not', 'format', 'title', 'unknownExtension']) {
    const schema = { type: 'object', [keyword]: keyword === 'pattern' ? '(a+)+$' : 'untrusted' };
    assert.deepEqual(validateJsonSchema(schema, {}), unsupported, keyword);
    assert.deepEqual(validateJsonSchema({ properties: { nested: { type: 'string', [keyword]: 'untrusted' } } }, {}), unsupported, keyword);
  }
  assert.deepEqual(validateJsonSchema({ $ref: 'file:///tmp/secret' }, {}), unsupported);
  assert.deepEqual(validateJsonSchema({ items: { pattern: '(a+)+$' } }, []), unsupported);
  assert.deepEqual(validateJsonSchema({ additionalProperties: { $ref: '#/missing' } }, {}), unsupported);
  assert.deepEqual(validateJsonSchema({ pattern: '(a+)+$' }, 'a'.repeat(1000) + '!'), unsupported);
});

test('keyword-like property names and literal const/enum data are not schema keywords', () => {
  const schema = {
    type: 'object', required: ['$ref', 'pattern'],
    properties: {
      $ref: { enum: [{ patternProperties: { '(a+)+$': true } }, 'pattern'] },
      pattern: { const: { $id: 'literal', $ref: '#/literal', pattern: '(a+)+$' } },
    },
  };
  const actual = { $ref: 'pattern', pattern: { $id: 'literal', $ref: '#/literal', pattern: '(a+)+$' } };
  assert.equal(validateJsonSchema(schema, actual).status, 'valid');
  assert.equal(validateJsonSchema(schema, { ...actual, pattern: { ...actual.pattern, pattern: 'different' } }).status, 'failed');
});

test('invalid schemas and resource limits return bounded non-pass diagnostics', () => {
  assert.deepEqual(validateJsonSchema({ type: 'unsupported-type' }, 1),
    { status: 'invalid-schema', diagnostics: ['invalid-schema'] });
  assert.deepEqual(validateJsonSchema({ properties: [] }, {}), unsupported);
  assert.deepEqual(validateJsonSchema({ enum: ['x'.repeat(33_000)] }, 'x'), unsupported);
  let deep: JsonValue = { type: 'string' };
  for (let index = 0; index < 14; index++) deep = { items: deep };
  assert.deepEqual(validateJsonSchema(deep, []), unsupported);
  const result = validateJsonSchema({ type: 'object', required: Array.from({ length: 20 }, (_, n) => 'x' + n) }, {});
  assert.equal(result.status, 'failed');
  assert.ok(result.diagnostics.length <= 8);
});
