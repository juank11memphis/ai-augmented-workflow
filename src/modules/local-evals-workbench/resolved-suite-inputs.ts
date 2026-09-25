import { open, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import type { NormalizedEvalTestCase, TextContent, FixtureContent, JsonValue } from './discover-conventional-eval-suites/index.js';
import type { RuntimeOutcome } from './runtime-description.js';

const MAX_FILE_BYTES = 100_000;
const MAX_RESOLVED_BYTES = 200_000;
const SENSITIVE = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/-]{12,}|\b(?:api[_-]?key|token|secret|password|credential)\s*[:=]\s*(?!<|\$\{|redacted|test|fake|example)[^\s,;}]{8,}/i;

export async function resolveSuiteInputs(projectRoot: string, cases: readonly NormalizedEvalTestCase[]): Promise<RuntimeOutcome<readonly NormalizedEvalTestCase[]>> {
  try {
    const evalsRoot = await realpath(path.join(projectRoot, 'evals'));
    let total = 0;
    const read = async (relative: string): Promise<string> => {
      const stripped = relative.startsWith('evals/') ? relative.slice(6) : relative;
      const candidate = path.resolve(evalsRoot, stripped);
      const lexical = path.relative(evalsRoot, candidate);
      if (!stripped || lexical.startsWith('..') || path.isAbsolute(lexical)) throw new Error('unsafe');
      const actual = await realpath(candidate);
      const relativeActual = path.relative(evalsRoot, actual);
      if (relativeActual.startsWith('..') || path.isAbsolute(relativeActual) || !(await stat(candidate)).isFile()) throw new Error('unsafe');
      const handle = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
      let buffer: Buffer;
      try {
        const opened = await handle.stat();
        const current = await realpath(candidate);
        const currentStat = await stat(current);
        const currentRelative = path.relative(evalsRoot, current);
        if (currentRelative.startsWith('..') || path.isAbsolute(currentRelative) || !opened.isFile()
          || opened.dev !== currentStat.dev || opened.ino !== currentStat.ino || opened.size > MAX_FILE_BYTES) throw new Error('unsafe');
        buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
        let length = 0;
        while (length <= MAX_FILE_BYTES) {
          const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
          if (bytesRead === 0) break;
          length += bytesRead;
        }
        if (length > MAX_FILE_BYTES) throw new Error('limit');
        buffer = buffer.subarray(0, length);
      } finally { await handle.close(); }
      total += buffer.length;
      if (total > MAX_RESOLVED_BYTES) throw new Error('limit');
      const contents = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (SENSITIVE.test(contents)) throw new Error('sensitive');
      return contents;
    };
    const text = async (value: TextContent): Promise<TextContent> =>
      value.type === 'inline' ? value : { type: 'inline', text: await read(value.path) };
    const fixture = async (value: FixtureContent): Promise<FixtureContent> =>
      value.type === 'inline' ? value : { type: 'inline', value: JSON.parse(await read(value.path)) as JsonValue };
    const resolved: NormalizedEvalTestCase[] = [];
    for (const testCase of cases) {
      const turns = await Promise.all(testCase.turns.map(async (turn) => ({ role: turn.role, content: await text(turn.content) })));
      const reference = testCase.reference ? await text(testCase.reference) : undefined;
      const resolvedFixture = testCase.fixture ? await fixture(testCase.fixture) : undefined;
      const assertions = await Promise.all(testCase.assertions.map(async (assertion) =>
        assertion.type === 'output-equals' ? { ...assertion, expected: await text(assertion.expected) } : assertion));
      const graders = await Promise.all(testCase.graders.map(async (grader) =>
        grader.type === 'rubric' ? { ...grader, rubric: await text(grader.rubric) } : grader));
      resolved.push({ ...testCase, turns, ...(reference ? { reference } : {}), ...(resolvedFixture ? { fixture: resolvedFixture } : {}), assertions, graders });
    }
    if (Buffer.byteLength(JSON.stringify(resolved)) > MAX_RESOLVED_BYTES) return { status: 'blocked', reason: 'input-unsafe' };
    return { status: 'ready', value: resolved };
  } catch { return { status: 'blocked', reason: 'input-unsafe' }; }
}
