import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { SibuState } from '../../shared/types.js';
import { isSibuState } from './state.js';

export type CurrentState = { bytes: string; state: SibuState } | undefined;

export function mutateStateFile<T>(
  statePath: string,
  mutation: (current: CurrentState) => { state: SibuState; result: T } | { result: T }
): T {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const lockPath = `${statePath}.lock`;
  const lock = fs.openSync(lockPath, 'wx', 0o600);
  let stagedPath: string | undefined;
  let replacementCommitted = false;
  try {
    let current: CurrentState;
    if (fs.existsSync(statePath)) {
      if (!fs.statSync(statePath).isFile() || fs.lstatSync(statePath).isSymbolicLink()) {
        throw new Error('Workflow state is not a regular file.');
      }
      const bytes = fs.readFileSync(statePath, 'utf8');
      const parsed = JSON.parse(bytes) as unknown;
      if (!isSibuState(parsed)) throw new Error('Workflow state is invalid.');
      current = { bytes, state: parsed };
    }
    const outcome = mutation(current);
    if (!('state' in outcome)) return outcome.result;
    if (!isSibuState(outcome.state)) throw new Error('Replacement workflow state is invalid.');
    stagedPath = `${statePath}.${process.pid}-${randomUUID()}.tmp`;
    const mode = current ? fs.statSync(statePath).mode : 0o600;
    fs.writeFileSync(stagedPath, `${JSON.stringify(outcome.state, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode });
    fs.renameSync(stagedPath, statePath);
    replacementCommitted = true;
    stagedPath = undefined;
    return outcome.result;
  } finally {
    if (stagedPath) {
      try { fs.unlinkSync(stagedPath); } catch { /* A failed cleanup cannot turn a failed write into success. */ }
    }
    let cleanupError: unknown;
    try {
      fs.closeSync(lock);
    } catch {
      try { fs.closeSync(lock); } catch (error) { cleanupError = error; }
    }
    try {
      fs.unlinkSync(lockPath);
    } catch {
      try { fs.unlinkSync(lockPath); } catch (error) { cleanupError ??= error; }
    }
    // Atomic replacement is authoritative even when later cleanup cannot complete.
    if (!replacementCommitted && cleanupError) throw cleanupError;
  }
}
