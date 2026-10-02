import type { ArtifactEvent, ArtifactLogger, Reason } from './contracts.js';
const events = new Set(['artifact-persisted', 'artifact-blocked', 'artifact-recovered', 'artifact-read']);
const reasons = new Set(['invalid-input', 'unsafe-path', 'not-ignored', 'tracked-artifacts', 'git-unavailable', 'unverifiable-root', 'unavailable', 'not-found', 'corrupt', 'limit-exceeded', 'invalid-transition', 'owner-unknown', 'index-stale']);
const states = new Set(['queued', 'running', 'completed', 'partial', 'blocked', 'error', 'interrupted']);
export class SafeArtifactLogger implements ArtifactLogger {
  constructor(private readonly sink: (line: string) => void = line => console.error(line)) {}
  emit(event: ArtifactEvent): void {
    if (!events.has(event.event)) return;
    const safe: Record<string, string | number> = { event: event.event, level: event.event === 'artifact-blocked' ? 'warn' : 'info' };
    if (event.reason && reasons.has(event.reason)) safe.reason = event.reason;
    if (event.state && states.has(event.state)) safe.state = event.state;
    if (Number.isSafeInteger(event.count) && event.count! >= 0 && event.count! <= 100) safe.count = event.count!;
    try { this.sink(JSON.stringify(safe)); } catch { /* Observability must not change a durable operation's result. */ }
  }
}

// Read identities remain in memory only; events contain only the allowlisted category.
const readStates = new WeakMap<ArtifactLogger, Map<string, Reason>>();
export function emitReadTransition(logger: ArtifactLogger, identity: string, reason: Reason | null): void {
  try {
    let states = readStates.get(logger);
    if (!states) { states = new Map(); readStates.set(logger, states); }
    const previous = states.get(identity);
    if (reason === previous) return;
    if (reason) {
      if (states.size >= 256 && !states.has(identity)) states.delete(states.keys().next().value!);
      states.set(identity, reason);
      logger.emit({ event: 'artifact-blocked', reason });
    } else if (previous) {
      states.delete(identity);
      logger.emit({ event: 'artifact-recovered' });
    }
  } catch { /* Logging must not change a read result. */ }
}
