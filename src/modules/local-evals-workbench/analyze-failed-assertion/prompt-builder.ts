import { readPromptTemplate, renderPromptTemplate } from '../prompt-template.js';
import type { FailedAssertionEvidence } from './evidence.js';

const failureAnalysisTemplate = readPromptTemplate(new URL('./prompts/failure-analysis.md', import.meta.url));

export function buildFailedAssertionAnalysisPrompt(evidence: FailedAssertionEvidence): string {
  return renderPromptTemplate(failureAnalysisTemplate, {
    testCaseId: evidence.testCaseId,
    evalRunModelLabel: evidence.evalRunModelLabel,
    assertionLabel: evidence.assertionLabel,
    assertionKind: evidence.assertionKind,
    assertionMessage: evidence.assertionMessage,
    actualOutputPreview: evidence.actualOutputPreview ?? 'Not reported.',
    expectedPreview: evidence.expectedPreview ?? 'Not reported.',
    diagnostics: evidence.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join(' | ') || 'None.',
  });
}
