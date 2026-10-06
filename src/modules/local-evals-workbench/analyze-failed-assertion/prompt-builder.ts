import { readPromptTemplate, renderPromptTemplate } from '../prompt-template.js';
import type { FailedAssertionEvidence } from './evidence.js';
import type { AnalysisContext } from './context-reader.js';

const template = readPromptTemplate(new URL('./prompts/failure-analysis.md', import.meta.url));
export const MAX_ANALYSIS_PROMPT = 15_000;
const MAX_EVIDENCE_JSON = 4_800;

export function buildFailedAssertionAnalysisPrompt(evidence: FailedAssertionEvidence, context?: AnalysisContext): string {
  let truncated = false;
  const safe = (value: string | null | undefined, limit = 600) => {
    const text = value ?? '';
    if (text.length > limit) truncated = true;
    const clipped = text.slice(0, limit);
    return /[\uD800-\uDBFF]$/.test(clipped) ? clipped.slice(0, -1) : clipped;
  };
  const selected = {
    testCaseId: safe(evidence.testCaseId, 80),
    model: safe(evidence.evalRunModelLabel, 100),
    assertionId: safe(evidence.assertionId, 80),
    assertionLabel: safe(evidence.assertionLabel, 100),
    assertionKind: evidence.assertionKind,
    assertionMessage: safe(evidence.assertionMessage),
    actual: safe(evidence.actualOutputPreview),
    expected: safe(evidence.expectedPreview),
    score: evidence.score ?? null,
    threshold: evidence.threshold ?? null,
    evidenceTruncated: false,
    diagnostics: evidence.diagnostics.slice(0, 6).map(item => ({ code: safe(item.code, 80), message: safe(item.message) })),
    linkedEvidence: evidence.artifacts.slice(0, 6).map(item => ({ label: safe(item.label, 100), preview: safe(item.preview) })),
  };
  selected.evidenceTruncated = truncated || evidence.diagnostics.length > 6 || evidence.artifacts.length > 6;
  let serialized = JSON.stringify(selected);
  while (serialized.length > MAX_EVIDENCE_JSON && selected.linkedEvidence.length) {
    selected.linkedEvidence.pop();
    selected.evidenceTruncated = true;
    serialized = JSON.stringify(selected);
  }
  while (serialized.length > MAX_EVIDENCE_JSON && selected.diagnostics.length) {
    selected.diagnostics.pop();
    selected.evidenceTruncated = true;
    serialized = JSON.stringify(selected);
  }
  if (serialized.length > MAX_EVIDENCE_JSON) throw new Error('Failure analysis evidence exceeds its limit.');
  const currentProjectContext = context ? {
    origin: 'current-project',
    excerpts: context.excerpts.slice(0, 6).map(item => ({ source: safe(item.source, 40), text: safe(item.text, 1600) })),
    missing: context.missing.slice(0, 6).map(item => safe(item, 40)),
  } : { origin: 'current-project', excerpts: [], missing: ['Current project context unavailable'] };
  const prompt = renderPromptTemplate(template, { selectedEvidence: serialized,
    currentProjectContext: JSON.stringify(currentProjectContext) });
  if (prompt.length > MAX_ANALYSIS_PROMPT) throw new Error('Failure analysis context exceeds its limit.');
  return prompt;
}
