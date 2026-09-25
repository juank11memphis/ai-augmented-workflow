import type { ArtifactReaderPort, ArtifactLogger } from '../run-history/contracts.js';
export type ListEvalRunsDependencies = { readonly reader: ArtifactReaderPort; readonly logger: ArtifactLogger };
