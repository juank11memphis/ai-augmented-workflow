import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTemplate, readTemplateManifest } from './index.js';

const skill = readTemplate('skills/software-design-writer/SKILL.md');
const discovery = skill.split('## Discovery and user control\n')[1]?.split('\n## Embedded Mermaid validation')[0];

assert.ok(discovery, 'SDD discovery guidance exists');

test('synthetic eval feature discovers its gates, while a no-eval feature does not receive eval questions', () => {
  const examples = [
    { plannedFeature: 'A prompt workflow with planned eval authoring', guidance: /When eval authoring is planned, apply `eval-authoring`'s distinct gates/ },
    { plannedFeature: 'A non-AI CLI option with no eval work', guidance: /If eval authoring is not planned, do not ask Evaluation Targets or eval coverage questions/ },
  ];
  for (const { plannedFeature, guidance } of examples) {
    assert.match(discovery, guidance, plannedFeature);
  }
  assert.match(discovery, /inspect the planned feature, its BRD and intended downstream work, and the relevant downstream skills/);
  assert.match(discovery, /known applicable feature-specific human gates/);
  assert.match(discovery, /only about gates that apply to this feature, one focused question at a time; name the choice and consequence/);
  assert.match(discovery, /Do not use a universal questionnaire/);
  assert.match(discovery, /If no feature-specific gates apply, state that explicitly in the SDD's \*\*Feature Decisions\*\* section/);
});

test('eval target confirmation and coverage approval are distinct and complete', () => {
  assert.match(discovery, /first ask the engineer to confirm the Evaluation Targets and intended scope; then propose the target-specific Eval Coverage Plan/);
  for (const detail of ['scenarios and risk categories', 'grading choices', 'simulated tool behavior', 'known gaps or exclusions']) {
    assert.ok(discovery.includes(detail), detail);
  }
  assert.match(discovery, /Targets alone do not approve coverage/);
  assert.match(discovery, /Record eval target confirmation and eval coverage approval as distinct decisions/);
  assert.match(discovery, /Do not create eval suites, runners, fixtures, or other eval artifacts during SDD authoring/);
});

test('each Feature Decision records explicit scoped human approval, not inferred or blanket approval', () => {
  assert.match(discovery, /one easy-to-find \*\*Feature Decisions\*\* section/);
  for (const field of ['stable local ID', 'governing downstream skill and gate', 'exact human-approved choice', 'scope', 'explicit human confirmation in self-contained words']) {
    assert.ok(discovery.includes(field), field);
  }
  assert.match(discovery, /An unanswered question, inferred choice, mere SDD existence, or generic “SDD approved” statement is not approval/);
  assert.match(discovery, /not an SDD-wide sign-off/);
});

test('missing or ambiguous answers stop with a named question while existing interview gates remain', () => {
  assert.match(discovery, /If a required answer is missing or ambiguous, including missing eval coverage details, give the engineer the specific unanswered question and pause SDD finalization until it is resolved/);
  assert.match(discovery, /do not leave empty approval fields/);
  assert.match(discovery, /Targets alone do not approve coverage/);
  const proposal = discovery.indexOf('present the engineer with a concise, feature-specific proposed verification approach');
  const confirmation = discovery.indexOf('Ask the engineer to confirm or correct this direction');
  const checkIn = discovery.indexOf('perform a final conversational check-in');
  assert.ok(proposal >= 0 && proposal < confirmation && confirmation < checkIn);
  assert.match(discovery, /The verification proposal and its confirmation are distinct from that final check-in/);
});

test('decision records do not grant operational or final Epic authority', () => {
  for (const gate of ['Git', 'model-route', 'credential', 'external-mutation', 'destructive-action', 'code-change', 'sync-ownership', 'final Epic-review']) {
    assert.ok(discovery.includes(gate), gate);
  }
  assert.match(discovery, /Preserve those operational and final human gates/);
});

test('manifest versions and current user-facing sync notes describe scenario-separated diagrams', () => {
  const manifest = readTemplateManifest();
  assert.equal(manifest.templateVersion, '250');
  const template = manifest.templates['skills/software-design-writer/SKILL.md'];
  assert.equal(template?.version, '4');
  const notes = template?.changes.join(' ') ?? '';
  assert.match(notes, /Separates happy-path, failure, and edge scenarios into individual Mermaid diagrams/);
  assert.match(notes, /instead of combining outcomes in one diagram/);
  assert.doesNotMatch(notes, /concrete verification proposal|settled approach in the SDD quality strategy/);
});
