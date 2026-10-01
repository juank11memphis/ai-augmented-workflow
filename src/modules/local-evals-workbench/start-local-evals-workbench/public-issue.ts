import { randomUUID } from 'node:crypto';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';

type BlockedDiscovery = Extract<EvalSuiteDiscoveryResult, { status: 'blocked' }>;
type DiscoveryReason = BlockedDiscovery['reason'];

export type PublicDiscoveryIssue = {
  readonly stage: 'discovery';
  readonly outcome: 'blocked' | 'failed';
  readonly category: DiscoveryReason | 'unknown';
  readonly title: string;
  readonly explanation: string;
  readonly nextStep: string;
  readonly recoveryAction: 'edit-suites' | 'retry';
  readonly reference: string;
};

type IssueCopy = Pick<PublicDiscoveryIssue, 'title' | 'explanation' | 'nextStep' | 'recoveryAction'>;

const discoveryCopy: Record<DiscoveryReason, IssueCopy> = {
  'missing-evals-folder': {
    title: 'No evals folder found',
    explanation: 'Sibu could not find a conventional evals folder.',
    nextStep: 'Add version-2 eval suite JSON files under evals/.',
    recoveryAction: 'edit-suites',
  },
  'no-eval-suites': {
    title: 'No eval suites found',
    explanation: 'The evals folder has no usable suite definitions.',
    nextStep: 'Add a version-2 eval suite JSON file under evals/.',
    recoveryAction: 'edit-suites',
  },
  'unreadable-eval-suites': {
    title: 'Eval suites could not be read',
    explanation: 'Sibu found suite definitions but could not use them.',
    nextStep: 'Review the discovery issues and correct file access or incompatible suites.',
    recoveryAction: 'edit-suites',
  },
  'discovery-failed': {
    title: 'Eval suite discovery failed',
    explanation: 'Sibu could not finish discovery. Cause unknown.',
    nextStep: 'Check project access, then try discovery again.',
    recoveryAction: 'retry',
  },
};

export function acceptedRequestReference(value: unknown): string {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
    ? value.toLowerCase()
    : randomUUID();
}

export function discoveryIssue(result: BlockedDiscovery, reference: string): PublicDiscoveryIssue {
  return {
    stage: 'discovery',
    outcome: 'blocked',
    category: result.reason,
    ...discoveryCopy[result.reason],
    reference,
  };
}

export function unknownDiscoveryIssue(reference: string): PublicDiscoveryIssue {
  return {
    stage: 'discovery',
    outcome: 'failed',
    category: 'unknown',
    title: 'Eval suite request failed',
    explanation: 'Sibu could not complete the discovery request. Cause unknown.',
    nextStep: 'Try discovery again. If it repeats, use the reference to find the local diagnostic.',
    recoveryAction: 'retry',
    reference,
  };
}
