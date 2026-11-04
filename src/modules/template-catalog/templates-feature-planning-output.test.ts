import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readTemplate } from './index.js';

const stages = [
  'skills/scrum-master-planner/SKILL.md',
  'skills/ai-implementation-planner/SKILL.md',
  'skills/ai-implementation-plan-executor/SKILL.md',
] as const;

function present(lines: string[], width: number): string {
  const output = lines.flatMap((line) => {
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
  assert.ok(output.split('\n').every((line) => line.length <= width));
  assert.equal(/[│|┌┐└┘]|\x1b\[/.test(output), false);
  return output;
}

test('confirmed hierarchy handoff has direct links and next action at compact, medium, and wide widths', () => {
  const guidance = readTemplate(stages[0]);
  for (const phrase of ['Feature ready on GitHub', 'confirmed Feature issue link', 'confirmed Epic and Story issue links', 'Next: Plan the first Story']) {
    assert.ok(guidance.includes(phrase), phrase);
  }
  for (const width of [40, 80, 120]) {
    const output = present([
      'Feature ready on GitHub',
      'Feature: https://example.test/issues/10',
      'Epic: https://example.test/issues/11',
      'Story: https://example.test/issues/12',
      'Next: Plan the first Story',
    ], width);
    assert.match(output, /Feature:.*10[\s\S]*Epic:.*11[\s\S]*Story:.*12[\s\S]*Next: Plan the first Story/);
  }
  assert.match(guidance, /compact width.*one link and one next action per line/);
  assert.match(guidance, /medium and wide widths.*orientation without a dashboard or width-only meaning/);
});

test('confirmed planning handoff links Story and exact plan without claiming Task execution', () => {
  for (const path of stages.slice(1)) {
    const guidance = readTemplate(path);
    for (const phrase of ['Story plan ready on GitHub', 'confirmed Story issue', 'plan artifact link', 'Next: Independent plan review']) {
      assert.ok(guidance.includes(phrase), `${path}: ${phrase}`);
    }
    assert.match(guidance, /compact.*medium and wide/);
    for (const width of [40, 80, 120]) {
      const output = present([
        'Story plan ready on GitHub',
        'Story: https://example.test/issues/12',
        'Plan: https://example.test/issues/12#plan',
        'Next: Independent plan review',
      ], width);
      assert.match(output, /Story:.*12[\s\S]*Plan:[\s\S]*plan[\s\S]*Next: Independent plan review/);
      assert.doesNotMatch(output, /Task (ready|complete|pushed)/);
    }
  }
});

test('unconfirmed issue or artifact write stops without a false success link', () => {
  const scrum = readTemplate(stages[0]);
  assert.match(scrum, /Epic or Story publication was not confirmed on GitHub/);
  assert.match(scrum, /Do not print a success heading or link for the uncertain effect/);
  for (const path of stages.slice(1)) {
    const guidance = readTemplate(path);
    assert.match(guidance, /was not confirmed on GitHub/);
    assert.match(guidance, /Next work is paused\. Check GitHub access, then retry\./);
    assert.match(guidance, /Do not show a ready heading|Never print the ready heading/);
  }
  for (const width of [40, 80, 120]) {
    const output = present([
      'Story plan was not confirmed on GitHub',
      'Story checklist confirmed. Plan artifact unconfirmed.',
      'Next work is paused. Check GitHub access, then retry.',
    ], width);
    assert.doesNotMatch(output, /ready on GitHub|https:\/\//);
    assert.match(output, /Next work is paused/);
  }
});
