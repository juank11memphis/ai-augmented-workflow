import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';

import { validateEvalSuiteContract } from '../discover-conventional-eval-suites/index.js';
import type { SavedSuiteFilePort, SuiteChoiceSnapshot } from './ports.js';
import type { ChangeSavedModelChoiceResult } from './result.js';

const MAX_BYTES = 1_000_000;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
type Block = Extract<ChangeSavedModelChoiceResult, { status: 'blocked' }>;
type FileState = { readonly path: string; readonly bytes: Buffer; readonly token: string; readonly suite: SuiteChoiceSnapshot['suite']; readonly mode: number; readonly identity: string };
type FileRead = FileState | Block;

/** Writes one project-owned suite property; the hook supports deterministic concurrency/failure fixtures. */
export class NodeProjectSuiteChoiceFile implements SavedSuiteFilePort {
  constructor(private readonly projectRoot: string, private readonly beforeReplace?: () => Promise<void>) {}

  async read(suiteId: string): Promise<SuiteChoiceSnapshot | Block> {
    const state = await this.readState(suiteId);
    return 'status' in state ? state : { suite: state.suite, token: state.token };
  }

  async save(suiteId: string, role: 'tested' | 'judge', modelId: string | null, expectedToken: string, caseId?: string): Promise<ChangeSavedModelChoiceResult> {
    const state = await this.readState(suiteId);
    if ('status' in state) return state;
    if (state.token !== expectedToken) return { status: 'conflict', reason: 'suite-changed' };
    if (caseId !== undefined && !state.suite.testCases.some(testCase => testCase.id === caseId)) return { status: 'blocked', reason: 'case-unavailable' };
    const field = caseId === undefined
      ? role === 'tested' ? 'defaultTestedModel' : 'defaultJudgeModel'
      : role === 'tested' ? 'testedModel' : 'judgeModel';
    let next: string;
    try {
      const source = state.bytes.toString('utf8');
      next = caseId === undefined ? changeObjectProperty(source, field, modelId) : changeCaseProperty(source, caseId, field, modelId);
      const validated = validateEvalSuiteContract(JSON.parse(next) as unknown);
      if (validated.status !== 'valid' || validated.suite.id !== suiteId) return { status: 'blocked', reason: 'suite-invalid' };
    } catch { return { status: 'blocked', reason: 'suite-invalid' }; }
    if (Buffer.byteLength(next) > MAX_BYTES) return { status: 'blocked', reason: 'suite-invalid' };
    // Re-read immediately before replacement; a changed token or inode is a conflict.
    let temporary: string | undefined;
    try {
      const folder = path.dirname(state.path);
      temporary = path.join(folder, `.sibu-suite-choice-${randomUUID()}.tmp`);
      const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, state.mode & 0o777);
      try { await handle.writeFile(next, 'utf8'); await handle.sync(); } finally { await handle.close(); }
      await this.beforeReplace?.();
      const current = await this.readState(suiteId);
      if ('status' in current || current.token !== state.token || current.identity !== state.identity) return { status: 'conflict', reason: 'suite-changed' };
      await rename(temporary, state.path);
      temporary = undefined;
      return { status: 'saved', suiteId, ...(caseId === undefined ? {} : { caseId }), role, modelId, token: digest(Buffer.from(next)) };
    } catch { return { status: 'blocked', reason: 'write-failed' }; }
    finally { if (temporary) await rm(temporary, { force: true }).catch(() => undefined); }
  }

  private async readState(suiteId: string): Promise<FileRead> {
    if (!NAME.test(suiteId) || suiteId === '.' || suiteId === '..') return { status: 'blocked', reason: 'path-unsafe' };
    const folder = path.join(this.projectRoot, 'evals');
    const file = path.join(folder, `${suiteId}.json`);
    try {
      const [rootStat, folderStat, fileStat] = await Promise.all([lstat(this.projectRoot), lstat(folder), lstat(file)]);
      if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || !folderStat.isDirectory() || folderStat.isSymbolicLink()
        || !fileStat.isFile() || fileStat.isSymbolicLink()) return { status: 'blocked', reason: 'path-unsafe' };
      if (fileStat.size > MAX_BYTES) return { status: 'blocked', reason: 'suite-invalid' };
      const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      let bytes: Buffer;
      try {
        const opened = await handle.stat();
        if (!opened.isFile() || opened.ino !== fileStat.ino || opened.dev !== fileStat.dev) return { status: 'blocked', reason: 'path-unsafe' };
        bytes = await handle.readFile();
      } finally { await handle.close(); }
      if (bytes.length > MAX_BYTES) return { status: 'blocked', reason: 'suite-invalid' };
      const parsed = validateEvalSuiteContract(JSON.parse(bytes.toString('utf8')) as unknown);
      if (parsed.status !== 'valid' || parsed.suite.id !== suiteId) return { status: 'blocked', reason: 'suite-invalid' };
      return { path: file, bytes, token: digest(bytes), suite: parsed.suite, mode: fileStat.mode,
        identity: `${fileStat.dev}:${fileStat.ino}` };
    } catch (error) {
      if (error instanceof SyntaxError) return { status: 'blocked', reason: 'suite-invalid' };
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ELOOP') return { status: 'blocked', reason: 'path-unsafe' };
      return { status: 'blocked', reason: 'suite-unavailable' };
    }
  }
}

function digest(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }

/** Locate only top-level JSON property spans, leaving all unrelated source bytes alone. */
function changeObjectProperty(source: string, field: string, value: string | null): string {
  const properties: { key: string; start: number; valueStart: number; end: number }[] = [];
  let cursor = skipSpace(source, 0);
  if (source[cursor++] !== '{') throw new Error('not-object');
  cursor = skipSpace(source, cursor);
  while (source[cursor] !== '}') {
    const start = cursor;
    const keyEnd = scanString(source, cursor);
    const key = JSON.parse(source.slice(cursor, keyEnd)) as string;
    cursor = skipSpace(source, keyEnd);
    if (source[cursor++] !== ':') throw new Error('invalid-property');
    const valueStart = skipSpace(source, cursor);
    cursor = skipValue(source, valueStart);
    properties.push({ key, start, valueStart, end: cursor });
    cursor = skipSpace(source, cursor);
    if (source[cursor] !== ',') break;
    cursor = skipSpace(source, cursor + 1);
  }
  const closing = cursor;
  if (source[closing] !== '}') throw new Error('not-closed');
  if (new Set(properties.map(item => item.key)).size !== properties.length) throw new Error('duplicate-property');
  const index = properties.findIndex(item => item.key === field);
  if (index >= 0) {
    const item = properties[index]!;
    if (value !== null) return source.slice(0, item.valueStart) + JSON.stringify(value) + source.slice(item.end);
    if (properties.length === 1) return source.slice(0, item.start) + source.slice(item.end);
    if (index < properties.length - 1) return source.slice(0, item.start) + source.slice(properties[index + 1]!.start);
    return source.slice(0, properties[index - 1]!.end) + source.slice(item.end);
  }
  if (value === null) return source;
  const insertion = `${properties.length ? ',' : ''}"${field}": ${JSON.stringify(value)}`;
  const insertionPoint = properties.length ? properties[properties.length - 1]!.end : closing;
  return source.slice(0, insertionPoint) + insertion + source.slice(insertionPoint);
}

/** Replace only the selected case object's chosen field, retaining the surrounding suite bytes. */
function changeCaseProperty(source: string, caseId: string, field: string, value: string | null): string {
  const suite = JSON.parse(source) as { testCases?: unknown };
  if (!Array.isArray(suite.testCases)) throw new Error('invalid-cases');
  const index = suite.testCases.findIndex((item: unknown) => item && typeof item === 'object' && 'id' in item && item.id === caseId);
  if (index < 0) throw new Error('case-unavailable');
  const casesStart = findTopLevelValueStart(source, 'testCases');
  let cursor = skipSpace(source, casesStart);
  if (source[cursor++] !== '[') throw new Error('invalid-cases');
  for (let current = 0; current <= index; current++) {
    cursor = skipSpace(source, cursor);
    const start = cursor;
    cursor = skipValue(source, cursor);
    if (current === index) {
      const changed = changeObjectProperty(source.slice(start, cursor), field, value);
      return source.slice(0, start) + changed + source.slice(cursor);
    }
    cursor = skipSpace(source, cursor);
    if (source[cursor++] !== ',') throw new Error('invalid-cases');
  }
  throw new Error('case-unavailable');
}

function findTopLevelValueStart(source: string, field: string): number {
  let cursor = skipSpace(source, 0);
  if (source[cursor++] !== '{') throw new Error('not-object');
  while (source[cursor] !== '}') {
    cursor = skipSpace(source, cursor);
    const keyEnd = scanString(source, cursor);
    const key = JSON.parse(source.slice(cursor, keyEnd)) as string;
    cursor = skipSpace(source, keyEnd);
    if (source[cursor++] !== ':') throw new Error('invalid-property');
    cursor = skipSpace(source, cursor);
    if (key === field) return cursor;
    cursor = skipSpace(source, skipValue(source, cursor));
    if (source[cursor] !== ',') break;
    cursor = skipSpace(source, cursor + 1);
  }
  throw new Error('missing-property');
}

function skipSpace(source: string, index: number): number { while (/\s/.test(source[index] ?? '')) index++; return index; }
function scanString(source: string, start: number): number {
  if (source[start] !== '"') throw new Error('not-string');
  for (let index = start + 1; index < source.length; index++) {
    if (source[index] === '\\') { index++; continue; }
    if (source[index] === '"') return index + 1;
  }
  throw new Error('unterminated-string');
}
function skipValue(source: string, start: number): number {
  const first = source[start];
  if (first === '"') return scanString(source, start);
  if (first === '{' || first === '[') {
    const stack = [first === '{' ? '}' : ']'];
    let cursor = start + 1;
    while (cursor < source.length) {
      if (source[cursor] === '"') { cursor = scanString(source, cursor); continue; }
      if (source[cursor] === '{') stack.push('}');
      else if (source[cursor] === '[') stack.push(']');
      else if (source[cursor] === '}' || source[cursor] === ']') {
        if (stack.pop() !== source[cursor]) throw new Error('unbalanced-value');
        if (!stack.length) return cursor + 1;
      }
      cursor++;
    }
    throw new Error('unterminated-value');
  }
  let cursor = start;
  while (cursor < source.length && !/[\s,}]/.test(source[cursor]!)) cursor++;
  return cursor;
}
