import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRepairProposalPrompt } from './prompt-builder.js';
import type { FailedAssertionEvidence } from '../analyze-failed-assertion/evidence.js';

const evidence: FailedAssertionEvidence = { suiteId: 'suite', testCaseId: 'case-1', evalRunModelId: 'gpt-5-mini', evalRunModelLabel: 'GPT-5 mini', assertionId: 'a1', assertionLabel: 'Must stop', assertionKind: 'assertion', assertionMessage: 'Expected refusal.', actualOutputPreview: 'I can draft it.', expectedPreview: 'Refuse until inputs exist.', cellOutputPreview: 'I can draft it.', diagnostics: [], artifacts: [] };

describe('buildRepairProposalPrompt', () => {
  it('includes active assertion, direction, bounded project context, schema, and excludes unsafe/autonomous content', () => {
    const prompt = buildRepairProposalPrompt({ evidence, repairDirection: { type: 'prompt_issue' }, priorAnalysis: { summary: 'Prompt skipped the stop rule.' }, projectFiles: [{ path: 'prompts/skill.md', preview: 'safe prompt excerpt' }] });
    assert.match(prompt, /exactly one failed eval assertion/);
    assert.match(prompt, /affectedProjectFiles/);
    assert.match(prompt, /prompts\/skill\.md/);
    assert.match(prompt, /I can draft it/);
    assert.doesNotMatch(prompt, /other failed output|OPENAI_API_KEY|secret-value/);
  });
});
