import { randomUUID } from 'node:crypto';

import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { DescribeEvalSuiteRuntimeResult } from '../describe-eval-suite-runtime/result.js';
import type { PreviewEvalRunResult, PreviewStage } from '../preview-eval-run/result.js';
import type { StartEvalRunResult } from '../start-eval-run/result.js';
import type { Reason, RunState } from '../run-history/contracts.js';
import { isSafeEnvironmentName, type RuntimeBlockReason } from '../runtime-description.js';
import type { ApplyApprovedEvalRepairResult } from '../apply-approved-eval-repair/result.js';

export type PublicApplyIssue = {
  readonly stage: 'repair-apply'; readonly outcome: 'blocked' | 'uncertain';
  readonly category: string; readonly title: string; readonly explanation: string;
  readonly nextStep: string; readonly recoveryAction: 'inspect' | 'revise'; readonly reference: string;
};

export function applyRepairIssue(result: Exclude<ApplyApprovedEvalRepairResult, { status: 'applied' }>, reference: string): PublicApplyIssue {
  if (result.status === 'blocked') return { stage: 'repair-apply', outcome: 'blocked', category: result.reason,
    title: 'Repair not applied', explanation: 'Sibu blocked this repair before changing project files.',
    nextStep: 'Review the proposal and approval before drafting another repair.', recoveryAction: 'revise', reference };
  return { stage: 'repair-apply', outcome: 'uncertain', category: result.reason,
    title: 'Repair outcome not confirmed', explanation: 'Sibu could not confirm the file outcome.',
    nextStep: 'Inspect the named project files before drafting another proposal. Do not repeat this approved change.',
    recoveryAction: 'inspect', reference };
}

export function invalidApplyRepairIssue(reference: string): PublicApplyIssue {
  return { stage: 'repair-apply', outcome: 'blocked', category: 'invalid-request', title: 'Repair request invalid',
    explanation: 'Sibu could not read this repair request.', nextStep: 'Review the request before trying again.',
    recoveryAction: 'revise', reference };
}


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
type StartReason = Extract<StartEvalRunResult, { status: 'blocked' }>['reason'];
export type PublicStartIssue = {
  readonly stage: 'run-start';
  readonly outcome: 'blocked' | 'failed';
  readonly category: StartReason | 'invalid-request' | 'reference-reused' | 'unknown';
  readonly title: string;
  readonly explanation: string;
  readonly nextStep: string;
  readonly recoveryAction: 'edit-suites' | 'retry' | 'report';
  readonly reference: string;
};
export type PublicReadIssue = {
  readonly stage: 'status' | 'history';
  readonly outcome: 'blocked' | 'failed';
  readonly category: Reason | 'invalid-request' | 'unknown';
  readonly title: string;
  readonly explanation: string;
  readonly nextStep: string;
  readonly recoveryAction: 'edit-suites' | 'retry' | 'report';
  readonly reference: string;
};
export type PublicExecutionIssue = Omit<PublicReadIssue, 'stage' | 'outcome' | 'category'> & {
  readonly stage: 'execution';
  readonly outcome: 'blocked' | 'failed' | 'partial' | 'interrupted';
  readonly category: 'assertion-failed' | 'incomplete' | 'interrupted';
};
const readReasons = new Set<Reason>(['invalid-input', 'unsafe-path', 'not-ignored', 'tracked-artifacts',
  'git-unavailable', 'unverifiable-root', 'unavailable', 'not-found', 'corrupt', 'limit-exceeded',
  'invalid-transition', 'owner-unknown', 'index-stale']);

export function readIssue(stage: 'status' | 'history', reason: Reason | 'invalid-request' | 'unknown', reference: string): PublicReadIssue {
  if (reason !== 'invalid-request' && reason !== 'unknown' && !readReasons.has(reason)) reason = 'unknown';
  const label = stage === 'status' ? 'Run status' : 'History';
  if (reason === 'invalid-request' || reason === 'invalid-input') return { stage, outcome: 'blocked', category: 'invalid-request',
    ...copy(`${label} request invalid`, `Sibu could not read this ${stage} request.`, 'Correct the request and retry.', 'retry'), reference };
  if (reason === 'not-found') return { stage, outcome: 'blocked', category: reason,
    ...copy(`${label} not found`, `Sibu could not find the requested ${stage} record.`, 'Check History and retry.', 'retry'), reference };
  if (reason === 'corrupt') return { stage, outcome: 'blocked', category: reason,
    ...copy(`${label} unreadable`, `Sibu could not safely read the ${stage} record.`, 'Keep existing results and report the problem.', 'report'), reference };
  if (reason === 'unknown') return { stage, outcome: 'failed', category: reason,
    ...copy(`${label} read failed`, `Sibu could not finish reading ${stage}. Cause unknown.`, 'Keep existing results and retry the read.', 'retry'), reference };
  return { stage, outcome: 'blocked', category: reason,
    ...copy(`${label} unavailable`, `Sibu could not read ${stage} right now. The run outcome has not changed.`, 'Keep existing results and retry the read.', 'retry'), reference };
}

export function executionIssue(state: RunState, outcome: 'passed' | 'failed' | 'incomplete', reference: string): PublicExecutionIssue | undefined {
  if (state === 'completed' && outcome === 'passed') return undefined;
  if (state === 'queued' || state === 'running') return undefined;
  if (state === 'completed' && outcome === 'failed') return { stage: 'execution', outcome: 'failed', category: 'assertion-failed',
    ...copy('Run checks failed', 'The run completed with a failed check.', 'Inspect saved result evidence.', 'report'), reference };
  if (state === 'interrupted') return { stage: 'execution', outcome: 'interrupted', category: 'interrupted',
    ...copy('Run interrupted', 'The run stopped before completion.', 'Inspect saved results and the runner.', 'report'), reference };
  if (state === 'partial') return { stage: 'execution', outcome: 'partial', category: 'incomplete',
    ...copy('Run partially completed', 'Some result evidence is incomplete.', 'Inspect saved results and the runner.', 'report'), reference };
  return { stage: 'execution', outcome: state === 'error' ? 'failed' : 'blocked', category: 'incomplete',
    ...copy('Run could not complete', 'The run stopped without a complete result.', 'Inspect saved results and the runner.', 'report'), reference };
}
const copy = (title: string, explanation: string, nextStep: string, recoveryAction: ModelCheckCopy['recoveryAction']): ModelCheckCopy =>
  ({ title, explanation, nextStep, recoveryAction });

const modelCheckCopy: Record<RuntimeBlockReason, ModelCheckCopy> = {
  'suite-unavailable': copy('Eval suite unavailable', 'Sibu could not open this eval suite.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'runner-unavailable': copy('Eval suite could not start', 'Sibu could not start this suite.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'runner-absent': copy('Required program not found', 'A program needed by this suite was not found.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'runner-start-failed': copy('Eval suite could not start', 'A program needed by this suite could not start.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'runner-exited': copy('Eval suite stopped', 'The suite stopped before Sibu could check its models.', 'Try again; if it keeps happening, share the issue details.', 'retry'),
  'runner-protocol-invalid': copy('Eval suite response unreadable', 'Sibu could not understand the suite response.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'runner-invalid': copy('Eval suite response unusable', 'The suite returned information Sibu could not use.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'runner-timeout': copy('Eval suite took too long', 'The suite took too long to respond.', 'Try again; if it keeps happening, share the issue details.', 'retry'),
  'environment-missing': copy('Setting needed', 'This suite needs a setting that has not been provided.', 'Ask the person who set up the suite which setting is needed.', 'edit-suites'),
  'required-setting-rejected': copy('Eval suite setup needs fixing', 'This suite requests a setting Sibu cannot accept. You do not need to set it.', 'Share the issue details with the person who set up the suite.', 'edit-suites'),
  'runner-request-too-large': copy('Model check could not start', 'The model check request was too large.', 'Share the issue details with the person who set up the suite.', 'report'),
  'environment-undeclared': copy('Eval suite setup needs fixing', 'This suite needs a setting that its setup does not list.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'capability-unsupported': copy('Eval suite feature unavailable', 'This suite needs a feature its runner does not support.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'model-unavailable': copy('No models available', 'This suite has no models available to test.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'judge-unavailable': copy('Judge model unavailable', 'This suite has no judge model available for its checks.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'case-unavailable': copy('Eval case unavailable', 'A selected eval case could not be used.', 'Share the issue details with the person who set up the suite.', 'edit-suites'),
  'artifact-unsafe': copy('Result location unavailable', 'Sibu cannot safely save results at this location.', 'Share the issue details with the person who set up the suite.', 'edit-suites'),
  'artifact-not-ignored': copy('Result location unavailable', 'The result location is not excluded from Git.', 'Share the issue details with the person who set up the suite.', 'edit-suites'),
  'artifact-tracked': copy('Result location unavailable', 'The result location contains tracked files.', 'Share the issue details with the person who set up the suite.', 'edit-suites'),
  'artifact-git-unavailable': copy('Result safety check unavailable', 'Sibu could not check whether result files are tracked by Git.', 'Try again; if it keeps happening, share the issue details.', 'retry'),
  'artifact-root-unsafe': copy('Result location unavailable', 'Sibu cannot safely save results at this location.', 'Share the issue details with the person who set up the suite.', 'edit-suites'),
  'estimate-invalid': copy('Cost estimate unavailable', 'Sibu could not use the cost estimate from this suite.', 'Share the issue details with the person who set it up.', 'edit-suites'),
  'input-unsafe': copy('Model check could not start', 'Sibu could not safely check this suite.', 'Try again; if it keeps happening, share the issue details.', 'retry'),
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
  'artifact-unsafe': copy('Artifact location unsafe', 'The artifact location did not pass safety checks.', 'Correct the artifact location, then preview again.', 'edit-suites'),
  'artifact-not-ignored': copy('Artifact location not ignored', 'The artifact location is not Git-ignored.', 'Ignore the artifact location, then preview again.', 'edit-suites'),
  'artifact-tracked': copy('Artifact location tracked', 'The artifact location contains tracked files.', 'Move artifacts away from tracked files, then preview again.', 'edit-suites'),
  'artifact-git-unavailable': copy('Artifact safety unavailable', 'Sibu could not check Git tracking for artifacts.', 'Check Git access, then preview again.', 'retry'),
  'artifact-root-unsafe': copy('Artifact root unsafe', 'The artifact root did not pass safety checks.', 'Correct the artifact root, then preview again.', 'edit-suites'),
  'estimate-invalid': copy('Estimate invalid', 'The runner estimate could not be used.', 'Check the runner estimate response, then preview again.', 'edit-suites'),
  'input-unsafe': copy('Preview input unsafe', 'Sibu rejected older unclassified preview input.', 'Review runner setup and request size, then preview again.', 'retry'),
};

// Start-specific wording: a blocked start does not mean execution failed.
export const startCopy: Record<StartReason, ModelCheckCopy> = {
  'suite-unavailable': copy('Suite unavailable', 'The selected suite could not be used to start a run.', 'Check the suite definition, then review and start again.', 'edit-suites'),
  'runner-unavailable': copy('Runner unavailable', 'The suite runner could not be used to start a run.', 'Check the runner command, then review and start again.', 'edit-suites'),
  'runner-absent': copy('Runner not found', 'The configured runner was not found before queueing.', 'Install or correct the runner command, then review again.', 'edit-suites'),
  'runner-start-failed': copy('Runner could not start', 'The configured runner failed before queueing.', 'Check the runner command and permissions, then review again.', 'edit-suites'),
  'runner-exited': copy('Runner exited', 'The runner ended during run-start checks.', 'Check the runner operation, then review again.', 'retry'),
  'runner-protocol-invalid': copy('Runner protocol invalid', 'The runner response did not follow the expected protocol.', 'Check runner compatibility, then review again.', 'edit-suites'),
  'runner-invalid': copy('Runner response invalid', 'Sibu could not use the runner response.', 'Check the runner output format, then review again.', 'edit-suites'),
  'runner-timeout': copy('Runner timed out', 'The runner did not answer run-start checks in time.', 'Check the runner, then review again.', 'retry'),
  'environment-missing': copy('Required setting missing', 'This suite needs a required setting before a run can start.', 'Add or export the setting, restart Sibu Evals, then review again.', 'edit-suites'),
  'required-setting-rejected': copy('Required setting rejected', 'The runner could not accept a required setting name.', 'Fix the suite required settings, then review again.', 'edit-suites'),
  'runner-request-too-large': copy('Run-start check too large', 'Sibu could not send a run-start check because it was too large.', 'Copy issue details and report the problem.', 'report'),
  'environment-undeclared': copy('Runner setting undeclared', 'The runner requires a setting not declared by this suite.', 'Declare the setting, then review again.', 'edit-suites'),
  'capability-unsupported': copy('Capability unsupported', 'The runner does not support a selected case requirement.', 'Review suite and runner support, then review again.', 'edit-suites'),
  'model-unavailable': copy('Model unavailable', 'The selected target model is not available.', 'Choose a compatible model, then review again.', 'edit-suites'),
  'judge-unavailable': copy('Judge model unavailable', 'The selected cases need a compatible judge model.', 'Choose a compatible judge model, then review again.', 'edit-suites'),
  'case-unavailable': copy('Case unavailable', 'A selected case could not be used.', 'Review the suite cases, then review again.', 'edit-suites'),
  'artifact-unsafe': copy('Artifact location unsafe', 'The artifact location did not pass safety checks.', 'Correct the suite artifact location, then review again.', 'edit-suites'),
  'artifact-not-ignored': copy('Artifact location not ignored', 'The artifact location is not Git-ignored.', 'Ignore the artifact location, then review again.', 'edit-suites'),
  'artifact-tracked': copy('Artifact location tracked', 'The artifact location contains tracked files.', 'Move artifacts away from tracked files, then review again.', 'edit-suites'),
  'artifact-git-unavailable': copy('Artifact safety unavailable', 'Sibu could not check Git tracking for artifacts.', 'Check Git access, then review again.', 'retry'),
  'artifact-root-unsafe': copy('Artifact root unsafe', 'The artifact root did not pass safety checks.', 'Correct the artifact root, then review again.', 'edit-suites'),
  'estimate-invalid': copy('Estimate invalid', 'The runner estimate could not be used.', 'Check runner estimate output, then review again.', 'edit-suites'),
  'input-unsafe': copy('Run-start input unclassified', 'Sibu rejected older unclassified run-start input.', 'Review runner setup and request size, then review again.', 'retry'),
  'invalid-input': copy('Run input invalid', 'The run store rejected the requested inputs.', 'Review the run setup, then try again.', 'retry'),
  'unsafe-path': copy('Run location unsafe', 'The run store rejected an unsafe location.', 'Correct the artifact location, then review again.', 'edit-suites'),
  'not-ignored': copy('Run location not ignored', 'The run location is not Git-ignored.', 'Ignore the artifact location, then review again.', 'edit-suites'),
  'tracked-artifacts': copy('Tracked run artifacts', 'The run location contains tracked files.', 'Move artifacts away from tracked files, then review again.', 'edit-suites'),
  'git-unavailable': copy('Git safety unavailable', 'Sibu could not check Git tracking before queueing.', 'Check Git access, then review again.', 'retry'),
  'unverifiable-root': copy('Run root unverified', 'Sibu could not verify the run root before queueing.', 'Check project access, then review again.', 'retry'),
  'unavailable': copy('Run start unavailable', 'Sibu could not complete run-start checks. Cause unknown.', 'Inspect History before another start if the response was interrupted.', 'report'),
  'not-found': copy('Run record unavailable', 'A required run record could not be found.', 'Check History, then review again.', 'retry'),
  'corrupt': copy('Run record unreadable', 'A required run record could not be read safely.', 'Check History and report the problem.', 'report'),
  'limit-exceeded': copy('Run limit reached', 'The run store limit prevented queueing.', 'Check History and available run storage, then review again.', 'retry'),
  'invalid-transition': copy('Run state conflict', 'The run store could not make the required state transition.', 'Check History and report the problem.', 'report'),
  'owner-unknown': copy('Run ownership unknown', 'The run store could not verify ownership.', 'Check History and report the problem.', 'report'),
  'index-stale': copy('Run index stale', 'The run index could not be trusted before queueing.', 'Check History, then review again.', 'retry'),
  'review-stale': copy('Review changed', 'The current run estimate no longer matches the reviewed setup.', 'Review the current estimate before starting.', 'retry'),
  'schedule-failed': copy('Run scheduling failed', 'The run record was created, but background scheduling failed.', 'Check History before trying another start.', 'report'),
};

export function startIssue(result: Extract<StartEvalRunResult, { status: 'blocked' }>, reference: string): PublicStartIssue {
  return { stage: 'run-start', outcome: 'blocked', category: result.reason, ...startCopy[result.reason], reference };
}

export function invalidStartIssue(reference: string): PublicStartIssue {
  return { stage: 'run-start', outcome: 'blocked', category: 'invalid-request',
    ...copy('Run request invalid', 'Sibu could not read this run-start request.', 'Correct the request and review again.', 'retry'), reference };
}

export function reusedStartReferenceIssue(reference: string): PublicStartIssue {
  return { stage: 'run-start', outcome: 'blocked', category: 'reference-reused',
    ...copy('Run reference reused', 'This reference cannot identify one run start.', 'Check History; use a fresh reference only after resolving the previous attempt.', 'report'), reference };
}

export function unknownStartIssue(reference: string): PublicStartIssue {
  return { stage: 'run-start', outcome: 'failed', category: 'unknown',
    ...copy('Run start not confirmed', 'Sibu could not complete the start response. Cause unknown.', 'Check History before attempting another start.', 'report'), reference };
}

export function acceptedStartReference(value: unknown): string {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
    ? value.toLowerCase() : randomUUID();
}

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
    : result.reason === 'required-setting-rejected' ? result.rejectedSettingName
      : result.reason === 'environment-undeclared' ? result.undeclaredEnvironmentName : undefined;
  const safeName = isSafeEnvironmentName(name) ? name : undefined;
  return {
    stage: 'model-check', outcome: 'blocked', category: result.reason,
    ...base,
    explanation: safeName && result.reason === 'environment-missing' ? `This suite needs ${safeName}.`
      : safeName === 'SIBU_EVAL_MODE' && result.reason === 'required-setting-rejected'
        ? 'Sibu sets SIBU_EVAL_MODE automatically. You do not need to set it; this suite lists it by mistake.'
        : safeName && result.reason === 'environment-undeclared'
          ? `This suite needs ${safeName}, but its setup does not list it.`
        : base.explanation,
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
