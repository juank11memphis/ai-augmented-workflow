import { opendir } from 'node:fs/promises';
import type { HistoryEntry, HistoryIndex, Manifest, Outcome, Reason } from './contracts.js';
import { ArtifactPaths, component, componentIdentity, missing } from './artifact-paths.js';
import { BoundedArtifactReader } from './bounded-artifact-reader.js';
import { historyIndex, manifest } from './validation.js';
import { LIMITS } from './limits.js';
export function compact(run: Manifest): HistoryEntry {
  const { runId, suiteId, state, createdAt, updatedAt, finishedAt, outcome, testedModel, judgeModel, scope, repeats, calls, cost } = run;
  return { runId, suiteId, state, createdAt, updatedAt, finishedAt, outcome, testedModel, judgeModel, scope, repeats, calls, cost };
}
export function indexFrom(entries: readonly HistoryEntry[]): HistoryIndex {
  const sorted = [...new Map(entries.map(e => [e.runId, e])).values()]
    .sort((a, b) => b.createdAt - a.createdAt || b.runId.localeCompare(a.runId));
  const bounded: HistoryEntry[] = [];
  for (const entry of sorted) {
    if (bounded.length === LIMITS.history || Buffer.byteLength(JSON.stringify({ version: 1, entries: [...bounded, entry] })) > LIMITS.indexBytes) break;
    bounded.push(entry);
  }
  return { version: 1, entries: bounded };
}
export async function manifestCandidates(paths: ArtifactPaths, suiteId: string, reader: BoundedArtifactReader): Promise<Outcome<readonly string[]>> {
  const found = new Set<string>(); const warnings: Reason[] = [];
  const index = await reader.read(paths.index(suiteId), LIMITS.indexBytes, historyIndex);
  if (index.status === 'ok') {
    for (const entry of index.value.entries) if (entry.suiteId === suiteId) found.add(entry.runId);
  } else warnings.push('index-stale');
  if (index.status !== 'ok' && index.reason !== 'not-found') warnings.push(index.reason);
  try {
    const directory = await opendir(await paths.verify(component(suiteId))); let visited = 0;
    for await (const item of directory) {
      if (++visited > LIMITS.candidates) { warnings.push('limit-exceeded'); break; }
      const id = componentIdentity(item.name);
      if (item.isDirectory() && id) found.add(id);
    }
  } catch (error) { if (!missing(error)) return { status: 'blocked', reason: 'unavailable' }; }
  return { status: 'ok', value: [...found].slice(0, LIMITS.candidates + LIMITS.history), warnings };
}
export async function collectHistory(paths: ArtifactPaths, suiteId: string, reader: BoundedArtifactReader): Promise<Outcome<HistoryIndex>> {
  const candidates = await manifestCandidates(paths, suiteId, reader); if (candidates.status !== 'ok') return candidates;
  const entries: HistoryEntry[] = []; const warnings = [...(candidates.warnings ?? [])];
  for (const id of candidates.value) {
    const result = await reader.read(paths.run(suiteId, id), LIMITS.manifestBytes, manifest);
    if (result.status === 'ok' && result.value.runId === id && result.value.suiteId === suiteId) entries.push(compact(result.value));
    else warnings.push(result.status === 'blocked' ? result.reason : 'corrupt');
  }
  return { status: 'ok', value: indexFrom(entries), warnings: [...new Set(warnings)] };
}
