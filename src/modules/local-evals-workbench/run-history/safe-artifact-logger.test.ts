import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { ArtifactEvent } from './contracts.js';
import { SafeArtifactLogger } from './safe-artifact-logger.js';
it('allowlists events and metadata without raw identifiers, errors or evidence', () => {
  const lines: string[] = []; const logger = new SafeArtifactLogger(line => lines.push(line));
  logger.emit({ event: 'artifact-blocked', reason: 'unsafe-path', count: 3, raw: 'SECRET', suiteId: 'SECRET', error: new Error('SECRET') } as ArtifactEvent);
  logger.emit({ event: 'artifact-read', reason: 'SECRET', state: 'SECRET', count: Infinity } as unknown as ArtifactEvent);
  logger.emit({ event: 'SECRET' } as unknown as ArtifactEvent);
  assert.equal(lines.length, 2); assert.ok(!lines.join('').includes('SECRET'));
  assert.deepEqual(JSON.parse(lines[0]!), { event: 'artifact-blocked', level: 'warn', reason: 'unsafe-path', count: 3 });
  assert.doesNotThrow(() => new SafeArtifactLogger(() => { throw new Error(); }).emit({ event: 'artifact-read' }));
});
