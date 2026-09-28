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
    scoreAndThreshold: evidence.score == null ? 'Not reported.' : `Score ${evidence.score}${evidence.threshold === undefined ? '' : `; threshold ${evidence.threshold}`}`,
    actualOutputPreview: evidence.actualOutputPreview ?? 'Not reported.',
    expectedPreview: evidence.expectedPreview ?? 'Not reported.',
    diagnostics: evidence.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join(' | ') || 'None.',
    linkedEvidence: evidence.artifacts.map(item => `${item.label}: ${item.preview ?? 'No excerpt.'}`).join('\n') || 'None.',
  });
}
