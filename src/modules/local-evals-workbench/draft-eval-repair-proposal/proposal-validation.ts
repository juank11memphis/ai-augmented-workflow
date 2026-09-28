import type { RepairProposalDraft } from './ports.js';
import { validateProjectFileTargets } from './project-file-safety.js';

export type ProposalValidationResult = { readonly status: 'ok'; readonly proposal: RepairProposalDraft } | { readonly status: 'rejected'; readonly reason: 'vague-proposal' | 'unsafe-target-files'; readonly message: string };

export function validateRepairProposalDraft(projectRoot: string, draft: RepairProposalDraft): ProposalValidationResult {
  const targetValidation = validateProjectFileTargets(projectRoot, draft.affectedProjectFiles);
  if (targetValidation.status === 'blocked') return { status: 'rejected', reason: 'unsafe-target-files', message: targetValidation.reason };
  if (!isConcrete(draft.changeSummary) || !isConcrete(draft.rationale) || !isConcrete(draft.expectedEvalImpact) || !isConcrete(draft.proposedChange.representation)) {
    return { status: 'rejected', reason: 'vague-proposal', message: 'The proposal did not include concrete files, rationale, eval impact, and change details.' };
  }
  if ([draft.changeSummary, draft.rationale, draft.expectedEvalImpact].some(value => Buffer.byteLength(value, 'utf8') > 2000)
    || Buffer.byteLength(draft.proposedChange.representation, 'utf8') > 32 * 1024) {
    return { status: 'rejected', reason: 'vague-proposal', message: 'The proposed repair exceeds the supported review size.' };
  }
  return { status: 'ok', proposal: { ...draft, affectedProjectFiles: targetValidation.paths } };
}

function isConcrete(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (text.length < 12) return false;
  return !['n/a', 'unknown', 'not sure', 'fix it', 'make it pass', 'improve things'].includes(text);
}
