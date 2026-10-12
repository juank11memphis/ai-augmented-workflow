import type { ManagedFileStatus, SibuState } from '../../shared/types.js';
import type { SkillIdentity, SkillRetirement } from '../template-catalog/index.js';
import type { InspectWorkflowCommand } from './command.js';

export type SkillEvidence = {
  path: string;
  source: 'selection' | 'managed-file' | 'generated-routing';
  ownership?: ManagedFileStatus;
  exists?: boolean;
};

export type SkillInspectionFinding =
  | { kind: 'retired-skill'; skillId: string; explanation: string; evidence: SkillEvidence[] }
  | { kind: 'unrecognized-skill'; skillId: string; evidence: SkillEvidence[] };

export type InspectWorkflowResult = { findings: SkillInspectionFinding[] };

export type InspectWorkflowPorts = {
  resolveSkill(id: string): SkillIdentity;
  retirements(): readonly SkillRetirement[];
  exists(relativePath: string): boolean;
  readText(relativePath: string): string;
};

const skillTemplatePattern = /^skills\/(?!architecture\/)([a-z][a-z0-9-]*)\/SKILL\.md$/;

export function inspectWorkflow(
  _command: InspectWorkflowCommand,
  state: SibuState,
  ports: InspectWorkflowPorts
): InspectWorkflowResult {
  const evidenceById = new Map<string, SkillEvidence[]>();
  const addEvidence = (id: string, evidence: SkillEvidence): void => {
    const current = evidenceById.get(id) ?? [];
    if (!current.some((item) => item.source === evidence.source && item.path === evidence.path)) {
      current.push(evidence);
    }
    evidenceById.set(id, current);
  };

  const selected = [
    ...(state.selectedLanguageSkills ?? []),
    ...(state.selectedFrameworkSkills ?? []),
    ...(state.selectedDatabaseSkills ?? []),
    ...(state.selectedWorkflowSkills ?? []),
  ];
  for (const id of selected) {
    addEvidence(id, { path: '.sibu/state.json', source: 'selection' });
  }

  for (const [relativePath, file] of Object.entries(state.managedFiles)) {
    const id = skillTemplatePattern.exec(file.template)?.[1];
    if (id && id !== state.selectedArchitectureSkill && file.status !== 'unmanaged') {
      addEvidence(id, {
        path: relativePath,
        source: 'managed-file',
        ownership: file.status ?? 'managed',
        exists: ports.exists(relativePath),
      });
    }
  }

  for (const retirement of ports.retirements()) {
    for (const agent of state.selectedAgents) {
      if (!(agent in retirement.generatedRoutingTargetsByAgent)) continue;
      const paths = retirement.generatedRoutingTargetsByAgent[agent as keyof typeof retirement.generatedRoutingTargetsByAgent];
      for (const relativePath of paths) {
        const file = state.managedFiles[relativePath];
        if (!file || file.status === 'unmanaged' || !ports.exists(relativePath)) continue;
        const contents = ports.readText(relativePath);
        const escapedId = retirement.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!new RegExp(`(^|[^a-z0-9-])${escapedId}([^a-z0-9-]|$)`, 'i').test(contents)) continue;
        addEvidence(retirement.id, {
          path: relativePath,
          source: 'generated-routing',
          ownership: file.status ?? 'managed',
          exists: true,
        });
      }
    }
  }

  const findings: SkillInspectionFinding[] = [];
  for (const [skillId, evidence] of evidenceById) {
    const identity = ports.resolveSkill(skillId);
    if (identity.status === 'retired') {
      findings.push({ kind: 'retired-skill', skillId, explanation: identity.retirement.explanation, evidence });
    } else if (identity.status === 'absent') {
      findings.push({ kind: 'unrecognized-skill', skillId, evidence });
    }
  }
  return { findings };
}
