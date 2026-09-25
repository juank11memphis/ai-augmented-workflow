import { randomBytes } from 'node:crypto';
import type { Liveness, Owner, OwnerPort } from './contracts.js';
const identity: Owner = { pid: process.pid, token: randomBytes(16).toString('hex') };
export class ProcessRunOwner implements OwnerPort {
  readonly identity = identity;
  async check(owner: Owner): Promise<Liveness> {
    if (owner.pid === identity.pid && owner.token === identity.token) return 'live';
    try { process.kill(owner.pid, 0); return 'unknown'; }
    catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH' ? 'stopped' : 'unknown'; }
  }
}
// Serialize all adapter instances for the verified canonical root in this process.
// Concurrent Sibu processes are unsupported and may lose index updates.
const queues = new Map<string, Promise<unknown>>();
export async function serialized<T>(root: string, action: () => Promise<T>): Promise<T> {
  const previous = queues.get(root) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(action); queues.set(root, next);
  try { return await next; } finally { if (queues.get(root) === next) queues.delete(root); }
}
