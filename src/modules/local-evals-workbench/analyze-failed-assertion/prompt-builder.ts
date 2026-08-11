import type { FailedAssertionEvidence } from './evidence.js';

export function buildFailedAssertionAnalysisPrompt(evidence: FailedAssertionEvidence): string {
  return [
    'Analyze exactly one failed eval assertion. Do not propose file changes.',
    'Return JSON with exactFailureExplanation, likelyCause, evidenceSummary, uncertainty.',
    'likelyCause must be one of: prompt_issue, eval_assertion_issue, fixture_input_issue, model_nondeterminism, unclear_needs_human_judgment.',
    `Test case: ${evidence.testCaseId}`,
    `Model: ${evidence.evalRunModelLabel}`,
    `Assertion: ${evidence.assertionLabel} (${evidence.assertionKind})`,
    `Assertion message: ${evidence.assertionMessage}`,
    `Actual output excerpt: ${evidence.actualOutputPreview ?? 'Not reported.'}`,
    `Expected/reference: ${evidence.expectedPreview ?? 'Not reported.'}`,
    `Diagnostics: ${evidence.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join(' | ') || 'None.'}`,
  ].join('\n');
}
