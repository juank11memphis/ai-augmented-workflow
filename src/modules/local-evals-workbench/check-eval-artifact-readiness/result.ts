import type { Outcome, Reason } from '../run-history/contracts.js';
export type CheckEvalArtifactReadinessResult = Outcome<null> & { readonly guidance?: string };
export function artifactReadinessGuidance(reason: Reason): string {
  switch (reason) {
    case 'not-ignored': return 'Add a root exclusion for evals/artifacts/ to Git ignore rules, then retry.';
    case 'tracked-artifacts': return 'Review tracked artifact files and remove them from Git tracking before running evals.';
    case 'git-unavailable': return 'Make Git available and verify repository access before running evals.';
    case 'unverifiable-root': return 'Select the real Git repository root; nested or unverifiable roots are blocked.';
    case 'unsafe-path': return 'Use real project-local artifact directories without symlinks, special files, or hard-linked evidence.';
    default: return 'Review artifact filesystem permissions and safety before retrying.';
  }
}
