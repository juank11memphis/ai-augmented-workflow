import type { DraftEvalRepairProposalResult } from '../draft-eval-repair-proposal/result.js';

type ProposalFailure = Exclude<DraftEvalRepairProposalResult, { status: 'proposal-ready' }>;
type ProposalReason = ProposalFailure['reason'];

export type PublicProposalIssue = {
  readonly stage: 'proposal';
  readonly outcome: 'blocked' | 'failed';
  readonly category: ProposalReason | 'invalid-request';
  readonly title: string;
  readonly explanation: string;
  readonly nextStep: string;
  readonly recoveryAction: 'check-setup' | 'retry' | 'report';
  readonly reference: string;
};

type Copy = Pick<PublicProposalIssue, 'title' | 'explanation' | 'nextStep' | 'recoveryAction'>;

const reasonCopy = {
  'missing-openai-api-key': { title: 'Repair proposal unavailable', explanation: 'Drafting needs a local OpenAI API key.', nextStep: 'Check local assistance setup, then try drafting again.', recoveryAction: 'check-setup' },
  'invalid-scope': { title: 'Proposal selection invalid', explanation: 'The selected failure is outside this proposal scope.', nextStep: 'Select one failed assertion in a saved result.', recoveryAction: 'retry' },
  'unclear-direction': { title: 'Repair direction unclear', explanation: 'The repair direction is not specific enough to draft safely.', nextStep: 'Describe a concrete repair direction and try again.', recoveryAction: 'retry' },
  'stale-analysis': { title: 'Analysis no longer matches', explanation: 'The selected analysis does not match this failure and repair direction.', nextStep: 'Analyze this failure again before drafting.', recoveryAction: 'retry' },
  'missing-artifact': { title: 'Proposal evidence unavailable', explanation: 'The saved run evidence could not be found.', nextStep: 'Check the selected result and its saved evidence.', recoveryAction: 'report' },
  'missing-cell': { title: 'Proposal result unavailable', explanation: 'The selected result cell could not be found.', nextStep: 'Select a result with saved evidence.', recoveryAction: 'retry' },
  'missing-assertion': { title: 'Proposal assertion unavailable', explanation: 'The selected assertion could not be found.', nextStep: 'Select a saved failed assertion.', recoveryAction: 'retry' },
  'non-failed-assertion': { title: 'Proposal needs a failure', explanation: 'The selected assertion did not fail.', nextStep: 'Select a failed assertion.', recoveryAction: 'retry' },
  'unsafe-target-files': { title: 'Repair target unsafe', explanation: 'The proposed target could not be verified as safe.', nextStep: 'Check the named project file and draft a new proposal.', recoveryAction: 'retry' },
  'vague-proposal': { title: 'Proposal rejected', explanation: 'The draft did not specify a safe concrete file change.', nextStep: 'Give a more specific repair direction and draft again.', recoveryAction: 'retry' },
  'provider-authorization': { title: 'Proposal authorization failed', explanation: 'The provider rejected authorization.', nextStep: 'Check local provider credentials and access before trying again.', recoveryAction: 'check-setup' },
  'provider-rate-limit': { title: 'Proposal rate limited', explanation: 'The provider limited this request.', nextStep: 'Wait before drafting again.', recoveryAction: 'retry' },
  'provider-timeout': { title: 'Proposal timed out', explanation: 'The provider did not respond in time.', nextStep: 'Try drafting again later.', recoveryAction: 'retry' },
  'provider-unavailable': { title: 'Proposal service unavailable', explanation: 'The provider could not be reached or was unavailable.', nextStep: 'Check service availability, then try again.', recoveryAction: 'retry' },
  'invalid-llm-response': { title: 'Proposal response invalid', explanation: 'The provider response could not be used safely.', nextStep: 'Try again. If it repeats, report this reference.', recoveryAction: 'report' },
  'llm-failure': { title: 'Proposal failed', explanation: 'Drafting could not finish. The provider cause is unknown.', nextStep: 'Try again. If it repeats, report this reference.', recoveryAction: 'report' },
  'unknown-cause': { title: 'Proposal failed', explanation: 'Drafting could not finish. Cause unknown.', nextStep: 'Check the selected result and try again. If it repeats, report this reference.', recoveryAction: 'report' },
} satisfies Record<ProposalReason, Copy>;

export function proposalIssue(result: ProposalFailure, reference: string): PublicProposalIssue {
  return { stage: 'proposal', outcome: result.status === 'error' ? 'failed' : 'blocked',
    category: result.reason, ...reasonCopy[result.reason], reference };
}

export function invalidProposalIssue(reference: string): PublicProposalIssue {
  return { stage: 'proposal', outcome: 'blocked', category: 'invalid-request', title: 'Proposal request invalid',
    explanation: 'Sibu could not read this proposal request.', nextStep: 'Correct the selection and try again.',
    recoveryAction: 'retry', reference };
}

export function unknownProposalIssue(reference: string): PublicProposalIssue {
  return { stage: 'proposal', outcome: 'failed', category: 'unknown-cause', ...reasonCopy['unknown-cause'], reference };
}
