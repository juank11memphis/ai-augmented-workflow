import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { sha256 } from '../../shared/hash.js';
import type { SibuState } from '../../shared/types.js';
import { getTemplateVersion, readTemplateManifest, renderTemplateForSync, getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState, getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState, getSelectedWorkflowSkillsFromState } from '../template-catalog/index.js';
import { isSibuState } from '../workflow-state-ledger/state.js';
import { writeStateIfUnchanged } from '../workflow-state-ledger/state-mutation.js';
import type { RetiredSkillApplyPorts } from './retired-skill-review-handler.js';
import type { RetiredSkillFileSnapshot } from './retired-skill-review-ports.js';

function containedPath(rootPath: string, relativePath: string): string | undefined {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\\') || relativePath.includes('\0') ||
      relativePath.split('/').some((part) => !part || part === '.' || part === '..')) return undefined;
  const root = path.resolve(rootPath);
  if (fs.lstatSync(root).isSymbolicLink()) return undefined;
  let current = root;
  for (const part of relativePath.split('/')) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return undefined;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return undefined;
    }
  }
  return current.startsWith(`${root}${path.sep}`) ? current : undefined;
}

function regularFile(rootPath: string, relativePath: string): string | undefined {
  const target = containedPath(rootPath, relativePath);
  if (!target) return undefined;
  try { return fs.lstatSync(target).isFile() ? target : undefined; }
  catch { return undefined; }
}

function referenceTo(contents: string, skillId: string): boolean {
  const escaped = skillId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, 'i').test(contents);
}

export function createRetiredSkillFileAdapter(rootPath: string, statePath: string):
  Pick<RetiredSkillApplyPorts, 'state' | 'files'> {
  const root = path.resolve(rootPath);
  const relativeStatePath = path.relative(root, statePath).split(path.sep).join('/');
  const readState = () => {
    const safe = regularFile(root, relativeStatePath);
    if (!safe) throw new Error('Workflow state cannot be read safely.');
    const bytes = fs.readFileSync(safe, 'utf8');
    const parsed = JSON.parse(bytes) as unknown;
    if (!isSibuState(parsed)) throw new Error('Workflow state is invalid.');
    return { bytes, state: parsed };
  };
  const inspect = (relativePath: string, skillId: string): RetiredSkillFileSnapshot => {
    const target = containedPath(root, relativePath);
    if (!target) return { status: 'unsafe' };
    let stat: fs.Stats;
    try { stat = fs.lstatSync(target); }
    catch (error) { return (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? { status: 'missing' } : { status: 'unsafe' }; }
    if (!stat.isFile()) return { status: 'unsafe' };
    const contents = fs.readFileSync(target, 'utf8');
    return { status: 'present', sha256: sha256(contents), referencesSkill: referenceTo(contents, skillId) };
  };
  const matchesHash = (relativePath: string, hash: string): string | undefined => {
    const target = regularFile(root, relativePath);
    return target && sha256(fs.readFileSync(target, 'utf8')) === hash ? target : undefined;
  };
  return {
    state: {
      snapshot: readState,
      checkpoint: (expectedBytes, nextState) => {
        const safe = regularFile(root, relativeStatePath);
        if (!safe || safe !== path.resolve(statePath)) throw new Error('Workflow state path changed.');
        return writeStateIfUnchanged(safe, expectedBytes, nextState);
      },
    },
    files: {
      inspect,
      read: (relativePath) => {
        const safe = regularFile(root, relativePath);
        if (!safe) throw new Error('Project file cannot be read safely.');
        return fs.readFileSync(safe, 'utf8');
      },
      removeIfHash: (relativePath, hash) => {
        const safe = matchesHash(relativePath, hash);
        if (!safe) return false;
        fs.unlinkSync(safe);
        return true;
      },
      writeIfHash: (relativePath, hash, contents) => {
        const safe = matchesHash(relativePath, hash);
        if (!safe) return false;
        const staged = `${safe}.${process.pid}-${randomUUID()}.tmp`;
        try {
          fs.writeFileSync(staged, contents, { flag: 'wx', mode: fs.statSync(safe).mode });
          if (!matchesHash(relativePath, hash)) return false;
          fs.renameSync(staged, safe);
          return true;
        } finally {
          try { fs.unlinkSync(staged); } catch { /* No staged file remains after a successful rename. */ }
        }
      },
      renderRouting: (relativePath, state, previous, removedId, retainedIds) => {
        const record = state.managedFiles[relativePath];
        const safe = regularFile(root, relativePath);
        if (!record || !safe) return undefined;
        let contents = renderTemplateForSync({
          templateRelativePath: record.template, currentPath: safe,
          selectedLanguageSkills: getSelectedLanguageSkillsFromState(state),
          selectedFrameworkSkills: getSelectedFrameworkSkillsFromState(state),
          selectedArchitectureSkill: getSelectedArchitectureSkillFromState(state),
          selectedWorkflowSkills: getSelectedWorkflowSkillsFromState(state),
          selectedDatabaseSkills: getSelectedDatabaseSkillsFromState(state),
        });
        const retained = previous.split('\n').filter((line) =>
          line.startsWith('- ') && retainedIds.some((id) => referenceTo(line, id)) &&
          !contents.split('\n').includes(line));
        if (retained.some((line) => referenceTo(line, removedId))) return undefined;
        if (retained.length) contents += `\n\n## Retired skills awaiting review\n${retained.join('\n')}\n`;
        return { contents, templateVersion: getTemplateVersion(readTemplateManifest(), record.template) };
      },
    },
  };
}
