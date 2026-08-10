import type { RunLocalEvalSuiteResult } from '../run-local-eval-suite/result.js';
import { createWorkbenchViewModel, type WorkbenchRunScope, type WorkbenchViewModel } from './view-model.js';

export type BrowserState = {
  readonly viewModel: WorkbenchViewModel;
  readonly latestRun?: RunLocalEvalSuiteResult;
};

export type EvalRunRequestPayload = {
  readonly suiteId: string;
  readonly evalRunModel: string;
  readonly scope: WorkbenchRunScope;
};

export function selectSuite(state: BrowserState, suiteId: string): BrowserState {
  return { viewModel: createWorkbenchViewModel({ discovery: state.viewModel.bootstrappedState.discovery, selectedSuiteId: suiteId, runScope: { type: 'all' } }) };
}

export function selectModel(state: BrowserState, selectedEvalRunModel: string): BrowserState {
  return { ...state, viewModel: createWorkbenchViewModel({ ...baseInput(state), selectedEvalRunModel }) };
}

export function selectRunScope(state: BrowserState, runScope: WorkbenchRunScope): BrowserState {
  return { ...state, viewModel: createWorkbenchViewModel({ ...baseInput(state), runScope }) };
}

export function startRun(state: BrowserState): BrowserState {
  return { ...state, viewModel: createWorkbenchViewModel({ ...baseInput(state), isRunning: true }) };
}

export function finishRun(state: BrowserState, latestRun: RunLocalEvalSuiteResult): BrowserState {
  return { latestRun, viewModel: createWorkbenchViewModel({ ...baseInput(state), latestRun }) };
}

export function failRun(state: BrowserState, message = 'The eval could not finish. Try again after checking local setup.'): BrowserState {
  return finishRun(state, { status: 'error', reason: 'runner-error', message, diagnostics: [{ code: 'browser-run-error', severity: 'error', message }] });
}

export function createRunRequestPayload(state: BrowserState): EvalRunRequestPayload {
  return { suiteId: state.viewModel.selectedSuite.id, evalRunModel: state.viewModel.selectedEvalRunModel, scope: state.viewModel.runScope };
}

export function parseEvalRunResponse(payload: unknown): RunLocalEvalSuiteResult {
  if (!isRecord(payload) || typeof payload.status !== 'string') {
    return invalidResponse();
  }
  if (payload.status === 'completed' || payload.status === 'blocked' || payload.status === 'error') {
    return payload as RunLocalEvalSuiteResult;
  }
  return invalidResponse();
}

function baseInput(state: BrowserState) {
  return {
    discovery: state.viewModel.bootstrappedState.discovery,
    selectedSuiteId: state.viewModel.selectedSuite.id,
    selectedEvalRunModel: state.viewModel.selectedEvalRunModel,
    runScope: state.viewModel.runScope,
    latestRun: state.latestRun,
  };
}

function invalidResponse(): RunLocalEvalSuiteResult {
  return { status: 'error', reason: 'runner-error', message: 'The eval server returned an unreadable response.', diagnostics: [{ code: 'invalid-eval-run-response', severity: 'error', message: 'Try again after checking the local workbench server.' }] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
