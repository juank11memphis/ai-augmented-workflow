import { randomUUID } from 'node:crypto';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { DescribeEvalSuiteRuntimeResult } from '../describe-eval-suite-runtime/result.js';
import type { PreviewEvalRunResult, PreviewStage } from '../preview-eval-run/result.js';
import { isSafeEnvironmentName, type RuntimeBlockReason } from '../runtime-description.js';

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

export type PublicModelCheckIssue = {
  readonly stage: 'model-check';
  readonly outcome: 'blocked' | 'failed';
  readonly category: RuntimeBlockReason | 'invalid-request' | 'unknown';
  readonly title: string;
  readonly explanation: string;
  readonly nextStep: string;
  readonly recoveryAction: 'edit-suites' | 'retry' | 'report';
  readonly reference: string;
};

type ModelCheckCopy = Pick<PublicModelCheckIssue, 'title' | 'explanation' | 'nextStep' | 'recoveryAction'>;
export type PublicPreviewIssue = {
  readonly stage: 'preview';
  readonly observedStage?: PreviewStage;
  readonly outcome: 'blocked' | 'failed';
  readonly category: RuntimeBlockReason | 'invalid-request' | 'unknown';
  readonly title: string;
  readonly explanation: string;
  readonly nextStep: string;
  readonly recoveryAction: 'edit-suites' | 'retry' | 'report';
  readonly reference: string;
};
const copy = (title: string, explanation: string, nextStep: string, recoveryAction: ModelCheckCopy['recoveryAction']): ModelCheckCopy =>
  ({ title, explanation, nextStep, recoveryAction });

const modelCheckCopy: Record<RuntimeBlockReason, ModelCheckCopy> = {
  'suite-unavailable': copy('Suite unavailable', 'Sibu could not use this suite.', 'Check the suite definition, then retry.', 'edit-suites'),
  'runner-unavailable': copy('Runner unavailable', 'The suite runner could not be used.', 'Check the runner command and retry.', 'edit-suites'),
  'runner-absent': copy('Runner not found', 'The configured runner was not found.', 'Install or correct the runner command, then retry.', 'edit-suites'),
  'runner-start-failed': copy('Runner could not start', 'The configured runner failed to start.', 'Check the runner command and permissions, then retry.', 'edit-suites'),
  'runner-exited': copy('Runner exited', 'The runner ended before returning a model description.', 'Check the runner operation, then retry.', 'retry'),
  'runner-protocol-invalid': copy('Runner protocol invalid', 'The runner response did not follow the expected protocol.', 'Check runner compatibility, then retry.', 'edit-suites'),
  'runner-invalid': copy('Runner response invalid', 'Sibu could not use the runner response.', 'Check the runner output format, then retry.', 'edit-suites'),
  'runner-timeout': copy('Runner timed out', 'The runner did not answer the model check in time.', 'Check that the runner is working, then retry.', 'retry'),
  'environment-missing': copy('Required setting missing', 'This suite needs a required setting.', 'Add or export the setting, restart Sibu Evals, then retry.', 'edit-suites'),
  'required-setting-rejected': copy('Required setting rejected', 'The runner could not accept a required setting name.', 'Fix the suite required settings, then retry.', 'edit-suites'),
  'runner-request-too-large': copy('Model check too large', 'Sibu could not send the model check because it was too large.', 'Copy issue details and report the problem.', 'report'),
  'environment-undeclared': copy('Runner setting undeclared', 'The runner requires a setting not declared by this suite.', 'Declare the required setting in the suite, then retry.', 'edit-suites'),
  'capability-unsupported': copy('Capability unsupported', 'The runner does not support a capability this suite needs.', 'Review suite and runner support, then retry.', 'edit-suites'),
  'model-unavailable': copy('No compatible models', 'The runner returned no compatible target models.', 'Review runner model support, then retry.', 'edit-suites'),
  'judge-unavailable': copy('Judge model unavailable', 'The runner returned no compatible judge model.', 'Review runner judge support, then retry.', 'edit-suites'),
  'case-unavailable': copy('Case unavailable', 'A selected case could not be used.', 'Review the suite cases, then retry.', 'edit-suites'),
  'repeats-invalid': copy('Repeat count invalid', 'The suite repeat count could not be used.', 'Correct the suite repeat count, then retry.', 'edit-suites'),
  'artifact-unsafe': copy('Artifact location unsafe', 'The artifact location did not pass safety checks.', 'Correct the suite artifact location, then retry.', 'edit-suites'),
  'artifact-not-ignored': copy('Artifact location not ignored', 'The artifact location is not Git-ignored.', 'Ignore the artifact location, then retry.', 'edit-suites'),
  'artifact-tracked': copy('Artifact location tracked', 'The artifact location contains tracked files.', 'Move artifacts away from tracked files, then retry.', 'edit-suites'),
  'artifact-git-unavailable': copy('Artifact safety unavailable', 'Sibu could not check Git tracking for artifacts.', 'Check Git access, then retry.', 'retry'),
  'artifact-root-unsafe': copy('Artifact root unsafe', 'The artifact root did not pass safety checks.', 'Correct the artifact root, then retry.', 'edit-suites'),
  'estimate-invalid': copy('Estimate invalid', 'The runner estimate could not be used.', 'Check the runner estimate response, then retry.', 'edit-suites'),
  'input-unsafe': copy('Model check input unsafe', 'Sibu rejected older unclassified model-check input.', 'Review runner setup and request size, then retry.', 'retry'),
};

// Separate exhaustive map: preview guidance must not inherit model-check wording.
const previewCopy: Record<RuntimeBlockReason, ModelCheckCopy> = {
  'suite-unavailable': copy('Suite unavailable', 'The selected suite could not be used for preview.', 'Check the suite definition, then preview again.', 'edit-suites'),
  'runner-unavailable': copy('Runner unavailable', 'The suite runner could not be used for preview.', 'Check the runner command, then preview again.', 'edit-suites'),
  'runner-absent': copy('Runner not found', 'The configured runner was not found.', 'Install or correct the runner command, then preview again.', 'edit-suites'),
  'runner-start-failed': copy('Runner could not start', 'The configured runner failed to start.', 'Check the runner command and permissions, then preview again.', 'edit-suites'),
  'runner-exited': copy('Runner exited', 'The runner ended before preview finished.', 'Check the runner operation, then preview again.', 'retry'),
  'runner-protocol-invalid': copy('Runner protocol invalid', 'The runner response did not follow the expected protocol.', 'Check runner compatibility, then preview again.', 'edit-suites'),
  'runner-invalid': copy('Runner response invalid', 'Sibu could not use the runner response.', 'Check the runner output format, then preview again.', 'edit-suites'),
  'runner-timeout': copy('Runner timed out', 'The runner did not answer preview in time.', 'Check that the runner is working, then preview again.', 'retry'),
  'environment-missing': copy('Required setting missing', 'This suite needs a required setting.', 'Add or export the setting, restart Sibu Evals, then preview again.', 'edit-suites'),
  'required-setting-rejected': copy('Required setting rejected', 'The runner could not accept a required setting name.', 'Fix the suite required settings, then preview again.', 'edit-suites'),
  'runner-request-too-large': copy('Preview request too large', 'Sibu could not send the runner request because it was too large.', 'Copy issue details and report the problem.', 'report'),
  'environment-undeclared': copy('Runner setting undeclared', 'The runner requires a setting not declared by this suite.', 'Declare the setting in the suite, then preview again.', 'edit-suites'),
  'capability-unsupported': copy('Capability unsupported', 'The runner does not support a selected case requirement.', 'Review suite and runner support, then preview again.', 'edit-suites'),
  'model-unavailable': copy('Model unavailable', 'The selected target model is not available.', 'Choose a compatible model, then preview again.', 'edit-suites'),
  'judge-unavailable': copy('Judge model unavailable', 'The selected case needs a compatible judge model.', 'Choose a compatible judge model, then preview again.', 'edit-suites'),
  'case-unavailable': copy('Case unavailable', 'A selected case could not be used.', 'Review the suite cases, then preview again.', 'edit-suites'),
  'repeats-invalid': copy('Repeat count invalid', 'The repeat count could not be used.', 'Correct the repeat count, then preview again.', 'edit-suites'),
  'artifact-unsafe': copy('Artifact location unsafe', 'The artifact location did not pass safety checks.', 'Correct the artifact location, then preview again.', 'edit-suites'),
  'artifact-not-ignored': copy('Artifact location not ignored', 'The artifact location is not Git-ignored.', 'Ignore the artifact location, then preview again.', 'edit-suites'),
  'artifact-tracked': copy('Artifact location tracked', 'The artifact location contains tracked files.', 'Move artifacts away from tracked files, then preview again.', 'edit-suites'),
  'artifact-git-unavailable': copy('Artifact safety unavailable', 'Sibu could not check Git tracking for artifacts.', 'Check Git access, then preview again.', 'retry'),
  'artifact-root-unsafe': copy('Artifact root unsafe', 'The artifact root did not pass safety checks.', 'Correct the artifact root, then preview again.', 'edit-suites'),
  'estimate-invalid': copy('Estimate invalid', 'The runner estimate could not be used.', 'Check the runner estimate response, then preview again.', 'edit-suites'),
  'input-unsafe': copy('Preview input unsafe', 'Sibu rejected older unclassified preview input.', 'Review runner setup and request size, then preview again.', 'retry'),
};

export function previewIssue(result: Extract<PreviewEvalRunResult, { status: 'blocked' | 'error' }>, reference: string): PublicPreviewIssue {
  if (result.status === 'error') return { stage: 'preview', observedStage: result.stage, outcome: 'failed', category: 'unknown',
    ...copy('Preview failed', 'Sibu could not finish preview. Cause unknown.', 'Preview again. If it repeats, use the reference to find the local diagnostic.', 'retry'), reference };
  const base = previewCopy[result.reason];
  return { stage: 'preview', observedStage: result.stage, outcome: 'blocked', category: result.reason,
    ...base, reference };
}

export function invalidPreviewIssue(reference: string): PublicPreviewIssue {
  return { stage: 'preview', outcome: 'blocked', category: 'invalid-request',
    ...copy('Preview request invalid', 'Sibu could not read this preview request.', 'Correct the request and preview again.', 'retry'), reference };
}

export function unavailablePreviewIssue(reference: string): PublicPreviewIssue {
  return { stage: 'preview', outcome: 'blocked', category: 'runner-unavailable', ...previewCopy['runner-unavailable'], reference };
}

export function unknownPreviewIssue(reference: string): PublicPreviewIssue {
  return { stage: 'preview', outcome: 'failed', category: 'unknown',
    ...copy('Preview failed', 'Sibu could not complete the preview request. Cause unknown.', 'Preview again. If it repeats, use the reference to find the local diagnostic.', 'retry'), reference };
}

export function modelCheckIssue(result: Extract<DescribeEvalSuiteRuntimeResult, { status: 'blocked' }>, reference: string): PublicModelCheckIssue {
  const base = modelCheckCopy[result.reason];
  const name = result.reason === 'environment-missing' ? result.missingEnvironmentName
    : result.reason === 'required-setting-rejected' ? result.rejectedSettingName : undefined;
  const safeName = isSafeEnvironmentName(name) ? name : undefined;
  return {
    stage: 'model-check', outcome: 'blocked', category: result.reason,
    ...base,
    explanation: safeName && result.reason === 'environment-missing' ? `This suite needs ${safeName}.` : base.explanation,
    reference,
  };
}

export function invalidModelCheckIssue(reference: string): PublicModelCheckIssue {
  return { stage: 'model-check', outcome: 'blocked', category: 'invalid-request',
    ...copy('Model check request invalid', 'Sibu could not read this model-check request.', 'Correct the request and retry.', 'retry'), reference };
}

export function unknownModelCheckIssue(reference: string): PublicModelCheckIssue {
  return { stage: 'model-check', outcome: 'failed', category: 'unknown',
    ...copy('Model check failed', 'Sibu could not complete the model check. Cause unknown.', 'Retry the check. If it repeats, use the reference to find the local diagnostic.', 'retry'), reference };
}

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
