import { readPromptTemplate, renderPromptTemplate } from '../prompt-template.js';
import type { FailedAssertionEvidence } from '../analyze-failed-assertion/evidence.js';
import type { DraftProposalPriorAnalysis, RepairDirection } from './command.js';
import type { ProjectFilePreview } from './ports.js';

const repairProposalTemplate = readPromptTemplate(new URL('./prompts/repair-proposal.md', import.meta.url));

export function buildRepairProposalPrompt(input: { readonly evidence: FailedAssertionEvidence; readonly repairDirection: RepairDirection; readonly priorAnalysis?: DraftProposalPriorAnalysis; readonly projectFiles: readonly ProjectFilePreview[] }): string {
  return renderPromptTemplate(repairProposalTemplate, {
    repairDirection: directionText(input.repairDirection),
    priorAnalysis: input.priorAnalysis?.summary ?? 'none.',
    testCaseId: input.evidence.testCaseId,
    evalRunModelLabel: input.evidence.evalRunModelLabel,
    assertionLabel: input.evidence.assertionLabel,
    assertionKind: input.evidence.assertionKind,
    assertionMessage: input.evidence.assertionMessage,
    actualOutputPreview: input.evidence.actualOutputPreview ?? 'Not reported.',
    expectedPreview: input.evidence.expectedPreview ?? 'Not reported.',
    projectFileContext: formatProjectFileContext(input.projectFiles),
  });
}

function formatProjectFileContext(projectFiles: readonly ProjectFilePreview[]): string {
  return projectFiles.map((file) => `${file.path}\n${file.preview}`).join('\n---\n') || 'No project files were preloaded; infer target path only when supported by evidence.';
}

function directionText(direction: RepairDirection): string {
  if (direction.type === 'custom') return `custom: ${direction.instruction}`;
  return ({ prompt_issue: 'prompt issue', eval_assertion_issue: 'eval assertion issue', fixture_input_issue: 'fixture/input issue', regression_case: 'regression case' })[direction.type];
}
