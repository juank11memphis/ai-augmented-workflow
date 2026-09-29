import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readTemplate, readTemplateManifest } from './index.js';

const plannerPath = 'skills/ai-implementation-planner/SKILL.md';
const toolboxPath = 'skills/ai-implementation-planner-toolbox/SKILL.md';
const fixtureDir = join(process.cwd(), 'src/modules/template-catalog/fixtures/milestone-planning');

function fixture(name: string): string {
  return readFileSync(join(fixtureDir, name), 'utf8');
}

function taskBlocks(plan: string): string[] {
  return plan.split(/(?=^# Step: )/m).filter((block) => block.startsWith('# Step: '));
}

function assertCheckedTasks(plan: string, expectedCount: number): void {
  const tasks = taskBlocks(plan);
  assert.equal(tasks.length, expectedCount);
  const ids = tasks.map((task) => {
    for (const heading of ['## Goal', '## Scope', '## Files', '## Done when']) {
      assert.ok(task.includes(heading), heading);
    }
    for (const field of ['Milestone ID:', 'Status:', 'Depends on:', 'Story acceptance criteria:', 'source decisions:', 'on-demand pointers:', 'applicable skills:', 'Files/area:', 'Task check:', 'pass:', 'expected evidence:']) {
      assert.ok(task.includes(field), field);
    }
    assert.doesNotMatch(task, /Task check: `(?:run the Story tests|review whether this looks good)`/);
    const id = task.match(/Task ID: (T-\d+)/)?.[1];
    assert.ok(id);
    return id;
  });
  assert.equal(new Set(ids).size, ids.length);
}

function assertCompleteStoryCoverage(plan: string): void {
  const tasksById = new Map(taskBlocks(plan).map((task) => {
    const id = task.match(/Task ID: (T-\d+)/)?.[1];
    assert.ok(id);
    return [id, task];
  }));
  const coverage = [...plan.matchAll(/AC-(0[1-5]) -> (T-\d+)/g)];
  for (const number of ['01', '02', '03', '04', '05']) {
    const entry = coverage.find((match) => match[1] === number);
    assert.ok(entry, `Story AC-${number} must have a Task mapping`);
    const task = tasksById.get(entry[2]);
    assert.ok(task, `Story AC-${number} maps to an existing Task`);
    assert.match(task, new RegExp(`Story acceptance criteria: [^\\n]*AC-${number}`));
  }
}

function assertImplementationOutcomes(plan: string, requiredFiles: string[][]): void {
  const tasks = taskBlocks(plan);
  assert.equal(tasks.length, requiredFiles.length);
  tasks.forEach((task, index) => {
    const files = task.split('## Files\n')[1]?.split('## Done when')[0] ?? '';
    assert.match(files, /templates\/skills\/ai-implementation-planner/);
    for (const path of requiredFiles[index]) {
      assert.ok(files.includes(`- ${path}`), `Task ${index + 1} must deliver ${path}`);
    }
  });
}

function assertDeclaredFlagHandoff(plan: string): void {
  const flagLine = plan.match(/^- Flags: (.+)$/m)?.[1];
  assert.ok(flagLine, 'flag declaration is required for handoff');
  const declaredFlags = new Set(
    [...flagLine.matchAll(/`([^`]+)` declared by/g)].map((match) => match[1]),
  );
  for (const match of flagLine.matchAll(/proposes `([^`]+)`/g)) {
    assert.ok(declaredFlags.has(match[1]), `undeclared flag ${match[1]} blocks handoff`);
  }
}

describe('Milestone planner instruction and fixture contract', () => {
  it('keeps checked Tasks in executor-compatible ordered step files', () => {
    const toolbox = readTemplate(toolboxPath);
    const planner = readTemplate(plannerPath);
    assert.match(toolbox, /one ordered step file as one Task|each ordered step file as one Task/);
    assert.match(toolbox, /Do not add a Markdown plan header/);
    assert.match(toolbox, /## Goal[\s\S]*## Scope[\s\S]*## Files[\s\S]*## Done when/);
    assert.match(planner, /one ordered step file per bounded Task/);
    assert.match(planner, /current Story-level review and approval controls remain in force/);
  });

  it('covers one-Milestone and multi-Milestone plans with durable state', () => {
    const single = fixture('one-milestone.md');
    const multiple = [fixture('multi-milestone.md'), fixture('multi-milestone-02.md')].join('\n');
    assertCheckedTasks(single, 1);
    assertCheckedTasks(multiple, 2);
    assertImplementationOutcomes(single, [[`templates/${plannerPath}`, `templates/${toolboxPath}`, 'templates/manifest.json']]);
    assertImplementationOutcomes(multiple, [[`templates/${toolboxPath}`], [`templates/${plannerPath}`, 'templates/manifest.json']]);
    for (const plan of [single, multiple]) {
      assertCompleteStoryCoverage(plan);
      assert.match(plan, /Task\/status list:/);
      assert.match(plan, /Conventions:/);
      assert.match(plan, /Progress log: `progress\.log` \(non-Markdown\)/);
      assert.match(plan, /Plan review: not started; human decision: pending/);
      assert.match(plan, /Flags: none/);
      assertDeclaredFlagHandoff(plan);
    }
    assert.match(single, /Milestone M-01: reviewable outcome:/);
    assert.match(multiple, /Milestone M-02: reviewable outcome:/);
    assert.match(multiple, /Task ID: T-02; Milestone ID: M-02; Status: pending; Depends on: T-01/);
  });

  it('rejects a subjective unchecked Task before handoff', () => {
    assert.throws(() => assertCheckedTasks(fixture('uncheckable-task.md'), 1));
    const missingCheck = fixture('one-milestone.md').replace(/^\- Task check:.*\n/m, '');
    assert.throws(() => assertCheckedTasks(missingCheck, 1));
    const toolbox = readTemplate(toolboxPath);
    assert.match(toolbox, /Split or clarify an uncheckable Task/);
    assert.match(toolbox, /human-review outcome/);
  });

  it('uses declared flags with off/on and final-removal checks, rejecting inventions', () => {
    const declared = fixture('declared-flag.md');
    assert.match(declared, /Flags: `demo-mode` declared by Epic/);
    assert.match(declared, /Task check flag-off: `node --test bin\/flag-off\.test\.js`/);
    assert.match(declared, /Task check flag-on: `node --test bin\/flag-on\.test\.js`/);
    assert.match(declared, /no-reference check: `rg -n 'demo-mode' src` returns no matches/);
    assertDeclaredFlagHandoff(declared);
    assert.throws(
      () => assertDeclaredFlagHandoff(fixture('undeclared-flag.md')),
      /undeclared flag secret-mode blocks handoff/,
    );
    const planner = readTemplate(plannerPath);
    assert.match(planner, /Use only flags declared by the Epic and Stories/);
    assert.match(planner, /For flagged Tasks, require checks for both flag-off regression and flag-on behavior/);
    assert.match(planner, /include upstream-declared final removal and a no-reference check when applicable/);
    assert.match(planner, /An undeclared flag need blocks handoff/);

    const toolbox = readTemplate(toolboxPath);
    assert.match(toolbox, /Inventory flags declared in the Epic and Stories/);
    assert.match(toolbox, /For declared flagged Tasks, prescribe executable checks for both flag-off regression and flag-on behavior/);
    assert.match(toolbox, /Include final removal and a no-reference check only when that removal is declared upstream/);
    assert.match(toolbox, /never invent one/);
  });

  it('versions both templates and leaves thin planner wrappers aligned', () => {
    const manifest = readTemplateManifest();
    for (const path of [plannerPath, toolboxPath]) {
      const entry = manifest.templates[path];
      assert.ok(entry);
      assert.ok(Number(entry.version) > 0);
      assert.ok(entry.changes.length > 0);
    }
    const wrappers = [
      readTemplate('.codex/agents/sibu-implementation-planner.toml'),
      readTemplate('.claude/agents/sibu-implementation-planner.md'),
      readTemplate('.gemini/agents/sibu-implementation-planner.md'),
    ];
    for (const path of [
      '.codex/agents/sibu-implementation-planner.toml',
      '.claude/agents/sibu-implementation-planner.md',
      '.gemini/agents/sibu-implementation-planner.md',
    ]) {
      assert.ok(manifest.templates[path], path);
    }
    for (const wrapper of wrappers) {
      assert.match(wrapper, /one User Story path/);
      assert.match(wrapper, /planner toolbox skill/);
      assert.match(wrapper, /Write only story-local implementation plan files/);
    }
    assert.match(readTemplate('skills/ai-implementation-plan-executor/SKILL.md'), /architecture review/);
    assert.match(readTemplate('skills/ai-implementation-executor-toolbox/SKILL.md'), /Never approve your own work/);
  });
});
