import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const routing = readTemplate('AGENTS.md');
const stages = [
  { name: 'BRD', path: 'skills/business-requirements-writer/SKILL.md', next: 'UX design' },
  { name: 'UX', path: 'skills/ux-expert/SKILL.md', next: 'Software design' },
  { name: 'SDD', path: 'skills/software-design-writer/SKILL.md', next: 'GitHub Epic and Story planning' },
] as const;

// A deterministic presentation fixture for prompt wording, not an agent renderer.
function present(lines: string[], width: number): string {
  return lines.flatMap((line) => {
    if (!line) return [''];
    const words = line.split(' ');
    const wrapped: string[] = [];
    let current = '';
    for (const word of words) {
      if (current && `${current} ${word}`.length > width) {
        wrapped.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    return [...wrapped, current];
  }).join('\n');
}

function assertLinearOutput(lines: string[], width: number): void {
  const output = present(lines, width);
  assert.ok(output.split('\n').every((line) => line.length <= width), output);
  assert.equal(output.replace(/\s+/g, ' ').trim(), lines.join(' ').replace(/\s+/g, ' ').trim());
  assert.equal(/[│|┌┐└┘]|\x1b\[/.test(output), false, 'meaning does not depend on columns, boxes, or color');
}

describe('planned Feature terminal wording contract (BRD REQ-01/03/09; AC-01/06)', () => {
  it('keeps missing remote and missing MCP distinct at compact and wide widths', () => {
    const cases = [
      ['This project has no GitHub repository connected. No feature was created.', 'Connect the GitHub repository, then retry.'],
      ['GitHub MCP cannot access the issue features this work needs. No feature was created.', 'Configure GitHub MCP, then retry.'],
    ];
    for (const [consequence, action] of cases) {
      assert.ok(routing.includes(consequence!));
      assert.ok(routing.includes(action!));
      for (const width of [40, 120]) assertLinearOutput(['Feature work cannot start', consequence!, action!], width);
    }
    assert.match(routing, /If access is lost after prior publication.*This step was not completed/);
    assert.match(routing, /Local `sibu init`, `sibu doctor`, `sibu sync`, and narrow fixes do not require GitHub/);
  });

  it('shows a confirmed Feature link and next BRD action in both widths', () => {
    for (const phrase of ['Feature ready on GitHub', 'Next: Define the BRD']) assert.ok(routing.includes(phrase));
    for (const width of [40, 120]) {
      assertLinearOutput(['Feature ready on GitHub', 'Account settings: https://example.test/issues/42', 'Next: Define the BRD'], width);
    }
  });

  it('keeps BRD, UX, and SDD publication and unconfirmed states readable in both widths', () => {
    for (const stage of stages) {
      const guidance = readTemplate(stage.path);
      for (const phrase of [
        `${stage.name} published`, `${stage.name}: <artifact link>`, `Next: ${stage.next}`,
        `${stage.name} was not confirmed on GitHub`,
        'The Feature artifact could not be verified. Next work is paused.',
        'Check GitHub access, then retry.',
      ]) assert.ok(guidance.includes(phrase), `${stage.name}: ${phrase}`);
      for (const width of [40, 120]) {
        assertLinearOutput([
          `${stage.name} published`, 'Feature: Account settings',
          `${stage.name}: https://example.test/issues/42#document`, `Next: ${stage.next}`,
        ], width);
        assertLinearOutput([
          `${stage.name} was not confirmed on GitHub`,
          'The Feature artifact could not be verified. Next work is paused.',
          'Check GitHub access, then retry.',
        ], width);
      }
    }
  });

  it('requires accessible linear hierarchy without width-only meaning', () => {
    assert.match(routing, /state, consequence, next action, then optional link or detail/);
    assert.match(routing, /about 40 columns.*one column.*about 120 columns.*never a new decision or width-only meaning/);
    assert.match(routing, /Do not rely on color, icons, boxes, or log inspection/);
    for (const stage of stages) assert.match(readTemplate(stage.path), /binding UX mockups at compact and wide widths/);
  });
});
