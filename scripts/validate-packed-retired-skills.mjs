import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const skillId = 'former-packed-skill';
const skillCopy = `.agents/skills/${skillId}/SKILL.md`;
const sourceTemplate = `skills/${skillId}/SKILL.md`;
const explanation = 'The packed fixture workflow is no longer provided.';

function projectBytes(root) {
  const result = {};
  function visit(directory, relative = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) visit(path.join(directory, entry.name), name);
      else if (entry.isFile()) result[name] = readFileSync(path.join(directory, entry.name)).toString('hex');
      else throw new Error(`Unexpected fixture entry: ${name}`);
    }
  }
  visit(root);
  return result;
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stateAt(project) {
  return JSON.parse(readFileSync(path.join(project, '.sibu/state.json'), 'utf8'));
}

function assertDoctorFinding(output, present) {
  if (present) {
    assert.match(output, new RegExp(`Retired skill: ${skillId}`));
    assert.ok(output.includes(explanation) && output.includes('sibu sync'));
  } else {
    assert.ok(!output.includes(`Retired skill: ${skillId}`), 'Resolved retirement remained in doctor.');
  }
}

function runDoctor(runInstalledSibu, installedExecutable, npmBinPath, project) {
  try {
    return runInstalledSibu(installedExecutable, ['doctor'], npmBinPath, project);
  } catch (error) {
    if (error?.status === 1 && typeof error.stdout === 'string') return error.stdout;
    throw error;
  }
}

export async function validatePackedRetiredSkills({ workspace, installedPackageRoot, installedExecutable,
  npmBinPath, prepareFixtureProject, runInstalledSibu }) {
  const resource = path.join(installedPackageRoot, 'templates/skill-retirements.json');
  assert.ok(existsSync(resource), 'Installed package omitted the retirement resource.');
  assert.deepEqual(JSON.parse(readFileSync(resource, 'utf8')), { schemaVersion: 1, retirements: [] });
  assert.ok(!existsSync(path.join(installedPackageRoot, 'templates', sourceTemplate)),
    'Fixture must not depend on a historical source template.');

  const catalog = await import(pathToFileURL(path.join(installedPackageRoot,
    'bin/modules/template-catalog/index.js')).href);
  assert.deepEqual(catalog.loadSkillRetirements(), [], 'Installed catalog must be empty by default.');

  const fixtureWorkspace = path.join(workspace, 'retired-skill');
  mkdirSync(fixtureWorkspace);
  const project = prepareFixtureProject({ workspace: fixtureWorkspace, installedPackageRoot });
  const manifest = catalog.readTemplateManifest();
  const selectedAgent = catalog.SUPPORTED_AGENTS.find((agent) => agent.id === 'codex');
  const architecture = catalog.SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern');
  assert.ok(selectedAgent && architecture, 'Installed catalog omitted required fixture selections.');
  const retirement = {
    id: skillId, category: 'workflow', explanation, formerTemplateRelativePath: sourceTemplate,
    formerTargetsByAgent: { codex: [skillCopy], gemini: [skillCopy], claude: [skillCopy] },
    generatedRoutingTargetsByAgent: { codex: ['AGENTS.md'], gemini: ['AGENTS.md', 'GEMINI.md'],
      claude: ['AGENTS.md', 'CLAUDE.md'] },
  };

  const copyPath = path.join(project, skillCopy);
  const copyBytes = '# Former packed skill\nThis fixture is retired.\n';
  mkdirSync(path.dirname(copyPath), { recursive: true });
  writeFileSync(copyPath, copyBytes);
  writeFileSync(path.join(project, 'README.md'), `This user-written file mentions ${skillId}.\n`);
  const userSkillPath = path.join(project, '.agents/skills/user-created/SKILL.md');
  mkdirSync(path.dirname(userSkillPath), { recursive: true });
  writeFileSync(userSkillPath, '# User-created skill\n');

  const statePath = path.join(project, '.sibu/state.json');
  const state = stateAt(project);
  state.selectedAgents = [selectedAgent.id];
  for (const target of catalog.getWorkflowTargets(project, [selectedAgent], [], [], architecture)) {
    const relativePath = path.relative(project, target.targetPath).split(path.sep).join('/');
    if (relativePath === 'AGENTS.md') continue;
    const contents = catalog.renderTemplateForSync({
      templateRelativePath: target.templateRelativePath, currentPath: target.targetPath,
      selectedLanguageSkills: [], selectedFrameworkSkills: [], selectedArchitectureSkill: architecture,
    });
    mkdirSync(path.dirname(target.targetPath), { recursive: true });
    writeFileSync(target.targetPath, contents);
    state.managedFiles[relativePath] = {
      template: target.templateRelativePath,
      templateVersion: manifest.templates[target.templateRelativePath].version,
      sha256: hash(contents), status: 'managed',
    };
  }
  state.selectedWorkflowSkills = [skillId];
  state.managedFiles[skillCopy] = { template: sourceTemplate, templateVersion: '1', sha256: hash(copyBytes), status: 'managed' };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  assert.deepEqual(state.selectedAgents, ['codex']);
  assert.equal(state.managedFiles['.codex/config.toml'].template, '.codex/config.toml');
  assert.equal(state.managedFiles[skillCopy].sha256, hash(readFileSync(copyPath)));

  const undeclared = runDoctor(runInstalledSibu, installedExecutable, npmBinPath, project);
  assert.ok(undeclared.includes(`Unrecognized skill: ${skillId}`),
    'Undeclared fixture skill was not reported as unrecognized.');
  assertDoctorFinding(undeclared, false);
  writeFileSync(resource, `${JSON.stringify({ schemaVersion: 1, retirements: [retirement] }, null, 2)}\n`);
  assert.deepEqual(catalog.loadSkillRetirements(), [retirement],
    'Installed loader did not read the injected package resource.');

  const beforeDoctor = projectBytes(project);
  assertDoctorFinding(runDoctor(runInstalledSibu, installedExecutable, npmBinPath, project), true);
  assert.deepEqual(projectBytes(project), beforeDoctor, 'Installed doctor changed project bytes.');

  const keepOutput = runInstalledSibu(installedExecutable, ['sync'], npmBinPath, project, '\r');
  assert.ok(keepOutput.includes(`${skillId} was retired`) && keepOutput.includes('Keep for now'));
  assert.ok(keepOutput.includes(`${skillId}: kept for now. Doctor will keep flagging it.`));
  assert.deepEqual(projectBytes(project), beforeDoctor, 'Keep changed project bytes.');
  assertDoctorFinding(runDoctor(runInstalledSibu, installedExecutable, npmBinPath, project), true);
  assert.deepEqual(projectBytes(project), beforeDoctor, 'Doctor after keep changed project bytes.');

  const cleanupOutput = runInstalledSibu(installedExecutable, ['sync'], npmBinPath, project, '\u001b[B\r');
  assert.ok(cleanupOutput.includes('Clean up this skill') && cleanupOutput.includes(`${skillId}: cleanup complete.`));
  assert.ok(cleanupOutput.includes('README.md'), 'User-written reference was not disclosed.');
  const after = projectBytes(project);
  const nextState = stateAt(project);
  assert.ok(!(skillCopy in after), 'Unchanged managed copy remains.');
  assert.ok(!(skillCopy in nextState.managedFiles), 'Removed copy still has managed state.');
  assert.deepEqual(nextState.selectedWorkflowSkills, [], 'Retired selection remains.');
  assert.deepEqual(nextState.selectedAgents, ['codex'], 'Cleanup changed the selected agent.');
  assert.equal(nextState.selectedArchitectureSkill, state.selectedArchitectureSkill);
  const expectedState = structuredClone(state);
  expectedState.updatedAt = nextState.updatedAt;
  expectedState.selectedWorkflowSkills = [];
  delete expectedState.managedFiles[skillCopy];
  assert.deepEqual(nextState, expectedState, 'Cleanup changed unrelated state or managed records.');
  for (const [name, bytes] of Object.entries(beforeDoctor)) {
    if (name !== skillCopy && name !== '.sibu/state.json') {
      assert.equal(after[name], bytes, `Unexpected cleanup change to ${name}.`);
    }
  }
  assert.deepEqual(Object.keys(after).filter((name) => !(name in beforeDoctor)), [],
    'Cleanup created an unexpected project file.');
  for (const name of ['README.md', '.agents/skills/user-created/SKILL.md']) {
    assert.equal(after[name], beforeDoctor[name], `${name} changed during cleanup.`);
  }
  assertDoctorFinding(runDoctor(runInstalledSibu, installedExecutable, npmBinPath, project), false);
  console.log('[validate-packed-runtime] Installed retirement resource, keep, cleanup, and doctor sequence passed.');
}
