import type { Outcome, ArtifactLogger } from '../run-history/contracts.js';
export type CheckEvalArtifactReadinessDependencies = { readonly safety: { check(projectRoot: string): Promise<Outcome<null>> }; readonly logger: ArtifactLogger };
