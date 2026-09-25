import type { ArtifactReaderPort, ArtifactLogger } from '../run-history/contracts.js';
export type GetEvalRunDependencies = { readonly reader: ArtifactReaderPort; readonly logger: ArtifactLogger };
