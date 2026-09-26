import type { ArtifactEvent, ArtifactLogger } from './contracts.js';
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
