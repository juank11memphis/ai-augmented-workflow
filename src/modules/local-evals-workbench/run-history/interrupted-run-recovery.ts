import type { Manifest, Outcome, OwnerPort } from './contracts.js';
import { active } from './validation.js';
import { transition } from './lifecycle.js';
export interface RecoveryPort { recover(suiteId: string, runId: string): Promise<Outcome<Manifest>> }
export class InterruptedRunRecovery {
  constructor(private readonly owner: OwnerPort, private readonly clock: () => number, private readonly store: RecoveryPort) {}
  async classify(run: Manifest): Promise<Outcome<Manifest>> {
    if (!active(run.state)) return { status: 'ok', value: run };
    const status = await this.owner.check(run.owner);
    if (status === 'live') return { status: 'ok', value: run };
    if (status === 'unknown') return { status: 'ok', value: run, warnings: ['owner-unknown'] };
    const recovered = await this.store.recover(run.suiteId, run.runId);
    if (recovered.status === 'ok') return recovered;
    const classified = transition(run, 'interrupted', Math.max(run.updatedAt, this.clock()));
    return classified.status === 'ok' ? { ...classified, warnings: [recovered.reason] } : classified;
  }
}
