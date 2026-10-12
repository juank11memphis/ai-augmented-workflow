import { MANDATORY_SKILLS, SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_DATABASE_SKILLS, SELECTABLE_FRAMEWORK_SKILLS, SELECTABLE_LANGUAGE_SKILLS, SELECTABLE_WORKFLOW_SKILLS } from './catalog.js';
import { readTemplate } from './templates.js';
import type { SkillTemplate, SupportedAgent } from '../../shared/types.js';

export type RetirementCategory = 'mandatory' | 'language' | 'framework' | 'database' | 'workflow';
export type RetirementAgent = SupportedAgent['id'];

export type SkillRetirement = {
  id: string;
  category: RetirementCategory;
  explanation: string;
  formerTemplateRelativePath: string;
  formerTargetsByAgent: Record<RetirementAgent, string[]>;
  generatedRoutingTargetsByAgent: Record<RetirementAgent, string[]>;
};

export type SkillIdentity =
  | { status: 'active' }
  | { status: 'retired'; retirement: SkillRetirement }
  | { status: 'absent' };

const agents: RetirementAgent[] = ['codex', 'gemini', 'claude'];
const categories: RetirementCategory[] = ['mandatory', 'language', 'framework', 'database', 'workflow'];
const activeSkills: SkillTemplate[] = [
  ...MANDATORY_SKILLS,
  ...SELECTABLE_ARCHITECTURE_SKILLS,
  ...SELECTABLE_DATABASE_SKILLS,
  ...SELECTABLE_FRAMEWORK_SKILLS,
  ...SELECTABLE_LANGUAGE_SKILLS,
  ...SELECTABLE_WORKFLOW_SKILLS,
];
const activeIds = new Set(activeSkills.map((skill) => skillId(skill)));
const activeTemplatePaths = new Set(activeSkills.map((skill) => skill.templateRelativePath));
const activeTargetPaths = new Set(activeSkills.flatMap((skill) => [
  ...Object.values(skill.targetRelativePathsByAgent),
  ...Object.values(skill.supplementalTargetsByAgent ?? {}).flatMap((targets) => targets?.map((target) => target.targetRelativePath) ?? []),
]).filter((target): target is string => typeof target === 'string'));

function skillId(skill: SkillTemplate): string {
  if ('id' in skill && typeof skill.id === 'string') return skill.id;
  const parts = skill.templateRelativePath.split('/');
  return parts[parts.length - 2] ?? '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validRelativePath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 &&
    !value.startsWith('/') && !value.includes('\\') && !value.includes('\0') &&
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..') &&
    !/^[A-Za-z]:/.test(value);
}

function parseAgentPaths(value: unknown, label: string): Record<RetirementAgent, string[]> {
  if (!isRecord(value) || Object.keys(value).length !== agents.length ||
      Object.keys(value).some((agent) => !agents.includes(agent as RetirementAgent))) {
    throw new Error(`${label} must name every supported agent exactly once.`);
  }
  const result = {} as Record<RetirementAgent, string[]>;
  for (const agent of agents) {
    const paths = value[agent];
    if (!Array.isArray(paths) || paths.length === 0 || paths.some((path) => !validRelativePath(path)) ||
        new Set(paths).size !== paths.length) {
      throw new Error(`${label}.${agent} has duplicate or unsafe paths.`);
    }
    result[agent] = paths;
  }
  return result;
}

export function parseSkillRetirements(input: unknown): SkillRetirement[] {
  if (!isRecord(input) || input.schemaVersion !== 1 || !Array.isArray(input.retirements) ||
      Object.keys(input).some((key) => !['schemaVersion', 'retirements'].includes(key))) {
    throw new Error('Invalid skill retirement catalog schema.');
  }
  const ids = new Set<string>();
  const templates = new Set<string>();
  const targets = new Map<string, string>();
  return input.retirements.map((value: unknown) => {
    if (!isRecord(value) || Object.keys(value).length !== 6 ||
        Object.keys(value).some((key) => !['id', 'category', 'explanation', 'formerTemplateRelativePath', 'formerTargetsByAgent', 'generatedRoutingTargetsByAgent'].includes(key)) ||
        typeof value.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value.id) ||
        !categories.includes(value.category as RetirementCategory) ||
        typeof value.explanation !== 'string' || !value.explanation.trim() ||
        !validRelativePath(value.formerTemplateRelativePath) ||
        !/^skills\/(?!architecture\/)[^/]+\/SKILL\.md$/.test(value.formerTemplateRelativePath)) {
      throw new Error('Invalid non-architecture skill retirement record.');
    }
    const id = value.id;
    const formerTemplateRelativePath = value.formerTemplateRelativePath;
    if (ids.has(id) || activeIds.has(id) || SELECTABLE_ARCHITECTURE_SKILLS.some((skill) => skill.id === id) ||
        templates.has(formerTemplateRelativePath) || activeTemplatePaths.has(formerTemplateRelativePath)) {
      throw new Error(`Duplicate, active, or architecture skill retirement identity: ${id}.`);
    }
    const formerTargetsByAgent = parseAgentPaths(value.formerTargetsByAgent, `${id}.formerTargetsByAgent`);
    const generatedRoutingTargetsByAgent = parseAgentPaths(value.generatedRoutingTargetsByAgent, `${id}.generatedRoutingTargetsByAgent`);
    for (const path of agents.flatMap((agent) => formerTargetsByAgent[agent])) {
      if (activeTargetPaths.has(path) || (targets.has(path) && targets.get(path) !== id) ||
          path.includes('/skills/architecture/')) {
        throw new Error(`Overlapping or architecture former target: ${path}.`);
      }
      targets.set(path, id);
    }
    ids.add(id);
    templates.add(formerTemplateRelativePath);
    return { id, category: value.category as RetirementCategory, explanation: value.explanation.trim(),
      formerTemplateRelativePath, formerTargetsByAgent, generatedRoutingTargetsByAgent };
  });
}

export function loadSkillRetirements(): SkillRetirement[] {
  return parseSkillRetirements(JSON.parse(readTemplate('skill-retirements.json')) as unknown);
}

export function lookupSkillIdentity(id: string, retirements: readonly SkillRetirement[] = loadSkillRetirements()): SkillIdentity {
  if (activeIds.has(id)) return { status: 'active' };
  const retirement = retirements.find((record) => record.id === id);
  return retirement ? { status: 'retired', retirement } : { status: 'absent' };
}
