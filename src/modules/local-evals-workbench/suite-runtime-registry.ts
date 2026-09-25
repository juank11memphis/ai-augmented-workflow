import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader, type NormalizedEvalSuite } from './discover-conventional-eval-suites/index.js';
import type { SuiteRuntimeRegistryPort } from './runtime-ports.js';
const quietLogger = { info: (): void => undefined, warn: (): void => undefined };
/** Re-discovers on each operation, so stale or changed suite paths cannot be used. */
export class ProjectSuiteRuntimeRegistry implements SuiteRuntimeRegistryPort {
  constructor(private readonly projectRoot: string) {}
  async load(suiteId: string): Promise<NormalizedEvalSuite | undefined> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(suiteId)) return undefined;
    const result = await discoverConventionalEvalSuites(
      { type: 'discover-conventional-eval-suites', projectRoot: this.projectRoot },
      { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: quietLogger }
    );
    return result.definitions.find((suite) => suite.id === suiteId);
  }
}
