import fs from 'node:fs';
import path from 'node:path';

import { getTemplatesPath } from '../../shared/paths.js';
import type { TemplateManifest } from '../../shared/types.js';
import { renderMcpConfig, resolveMcpConfigAgentId } from '../agent-tool-configuration/index.js';
import type {
  FileToCreate,
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
  WorkflowTarget,
} from '../../shared/types.js';

export function readTemplate(relativePath: string): string {
  return fs.readFileSync(path.join(getTemplatesPath(), relativePath), 'utf8');
}

export function readTemplateManifest(): TemplateManifest {
  const manifest = JSON.parse(fs.readFileSync(path.join(getTemplatesPath(), 'manifest.json'), 'utf8')) as unknown;

  if (!isTemplateManifest(manifest)) {
    throw new Error('templates/manifest.json is not a valid template manifest.');
  }

  return manifest;
}

export function getTemplateVersion(manifest: TemplateManifest, templateRelativePath: string): string {
  const template = manifest.templates[templateRelativePath];

  if (!template) {
    throw new Error(`Template ${templateRelativePath} is missing from templates/manifest.json.`);
  }

  return template.version;
}

function isTemplateManifest(value: unknown): value is TemplateManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<TemplateManifest>;

  return (
    typeof manifest.templateVersion === 'string' &&
    !!manifest.templates &&
    typeof manifest.templates === 'object' &&
    Object.values(manifest.templates).every(
      (template) =>
        !!template &&
        typeof template === 'object' &&
        typeof template.version === 'string' &&
        typeof template.description === 'string' &&
        Array.isArray(template.changes) &&
        template.changes.every((change) => typeof change === 'string')
    )
  );
}

export type WorkerToolboxRoutingProfile = 'planner' | 'executor';

type OptionalRoutingSkill =
  | SelectableLanguageSkill
  | SelectableFrameworkSkill
  | SelectableArchitectureSkill
  | SelectableDatabaseSkill
  | SelectableWorkflowSkill;

export function renderTemplateForSync({
  templateRelativePath,
  currentPath,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
  selectedDatabaseSkills = [],
  selectedMcpServers = [],
}: {
  templateRelativePath: string;
  currentPath: string;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
  selectedDatabaseSkills?: SelectableDatabaseSkill[];
  selectedMcpServers?: SelectableMcpServer[];
}): string {
  let contents = readTemplate(templateRelativePath);

  const mcpConfigAgentId = resolveMcpConfigAgentId(templateRelativePath);
  if (mcpConfigAgentId) {
    return renderMcpConfig({ agentId: mcpConfigAgentId, baseContents: contents, selectedMcpServers });
  }

  if (contents.includes('{{PROJECT_OVERVIEW}}')) {
    contents = contents.replace('{{PROJECT_OVERVIEW}}', extractProjectOverview(currentPath) ?? 'Describe this project.');
  }

  contents = renderSkillRouting(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills);
  contents = renderWorkerToolboxRoutingPlaceholders(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills);

  return contents;
}

export function renderMissingWorkflowFiles({
  missingTargets,
  overview,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
  selectedDatabaseSkills = [],
  selectedMcpServers = [],
}: {
  missingTargets: WorkflowTarget[];
  overview?: string;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
  selectedDatabaseSkills?: SelectableDatabaseSkill[];
  selectedMcpServers?: SelectableMcpServer[];
}): FileToCreate[] {
  return missingTargets.map((target) => {
    let contents = readTemplate(target.templateRelativePath);

    if (target.mcpConfigAgentId && (target.selectedMcpServers?.length || selectedMcpServers.length)) {
      contents = renderMcpConfig({
        agentId: target.mcpConfigAgentId,
        baseContents: contents,
        selectedMcpServers: target.selectedMcpServers ?? selectedMcpServers,
      });
    }

    if (target.requiresProjectOverview) {
      if (!overview?.trim()) {
        throw new Error('Project overview is required to create AGENTS.md.');
      }

      contents = contents.replace('{{PROJECT_OVERVIEW}}', overview.trim());
    }

    contents = renderSkillRouting(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills);
    contents = renderWorkerToolboxRoutingPlaceholders(contents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, selectedWorkflowSkills, selectedDatabaseSkills);

    return {
      label: target.label,
      targetPath: target.targetPath,
      contents,
    };
  });
}

export function renderSkillRouting(
  contents: string,
  selectedLanguageSkills: SelectableLanguageSkill[],
  selectedFrameworkSkills: SelectableFrameworkSkill[],
  selectedArchitectureSkill?: SelectableArchitectureSkill,
  selectedWorkflowSkills: SelectableWorkflowSkill[] = [],
  selectedDatabaseSkills: SelectableDatabaseSkill[] = []
): string {
  if (!contents.includes('{{OPTIONAL_SKILL_ROUTING}}')) {
    return contents;
  }

  const optionalRouting = [...selectedLanguageSkills, ...selectedFrameworkSkills, ...selectedDatabaseSkills, ...(selectedArchitectureSkill ? [selectedArchitectureSkill] : []), ...selectedWorkflowSkills]
    .map((skill) => `- ${skill.routingInstruction}`)
    .join('\n');

  return contents.replace('{{OPTIONAL_SKILL_ROUTING}}', optionalRouting);
}

export function renderWorkerToolboxRouting({
  profile,
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills = [],
  selectedDatabaseSkills = [],
}: {
  profile: WorkerToolboxRoutingProfile;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills?: SelectableWorkflowSkill[];
  selectedDatabaseSkills?: SelectableDatabaseSkill[];
}): string {
  const selectedSkills = collectWorkerRelevantSkills({
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
    selectedWorkflowSkills,
    selectedDatabaseSkills,
  });
  const selectedArchitectureSection = selectedArchitectureSkill
    ? `### Selected architecture guidance
- Required: read \`${getSharedSkillTargetPath(selectedArchitectureSkill)}\` before ${profile === 'planner' ? 'writing implementation plan steps' : 'executing or reviewing implementation steps'}.
- Treat this selected architecture guidance as binding for boundaries, dependency direction, sequencing, and reviewable constraints.
- If the selected architecture skill path is missing or unavailable, stop and tell the main agent to direct the user to run \`sibu sync\`; do not choose, infer, or substitute architecture guidance.`
    : `### Selected architecture guidance
- No selected architecture skill was provided to this worker routing profile.
- Hard-stop architecture-dependent ${profile} work and tell the main agent to direct the user to run \`sibu sync\` to repair workflow configuration.
- Do not choose, infer, or substitute architecture guidance from repository structure.`;
  const selectedSkillLines = selectedSkills.map((skill) => `- ${skill.name}: read \`${getSharedSkillTargetPath(skill)}\` when relevant. ${skill.routingInstruction}`);
  const selectedSkillsSection =
    selectedSkillLines.length > 0
      ? selectedSkillLines.join('\n')
      : '- No optional implementation-relevant Sibu skills are selected for this project. Use source artifacts and flag unmapped patterns as risks instead of guessing silently.';

  return `## Focused ${profile} worker routing

- Always read and apply \`.agents/skills/clean-code/SKILL.md\` before ${profile === 'planner' ? 'writing implementation plan steps' : 'editing code or running story execution'}.
- Read the worker toolbox skill path provided in the main-agent packet before doing work.
- Read every required skill path listed in the packet. If a required skill path is missing, stop and report the blocker to the main agent.
- Read optional installed skill paths only when they are relevant to the story, touched files, source artifacts, or validation work.
- Treat distilled skill constraints from the packet as binding task constraints.
- If an optional relevant skill is not installed and you encounter an unmapped language, framework, database, or architecture pattern, do not guess silently; continue only when safe and flag the gap as a ${profile === 'planner' ? 'plan risk' : 'Review Gate risk'}.

${selectedArchitectureSection}

### Optional installed skills relevant to ${profile} work
${profile === 'executor' ? '- Structured Logging: read `.agents/skills/structured-logging/SKILL.md` when the story involves logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or other observability-relevant behavior.\n' : ''}${selectedSkillsSection}`;
}

export function renderWorkerToolboxRoutingPlaceholders(
  contents: string,
  selectedLanguageSkills: SelectableLanguageSkill[],
  selectedFrameworkSkills: SelectableFrameworkSkill[],
  selectedArchitectureSkill?: SelectableArchitectureSkill,
  selectedWorkflowSkills: SelectableWorkflowSkill[] = [],
  selectedDatabaseSkills: SelectableDatabaseSkill[] = []
): string {
  const placeholderProfiles: Array<{ placeholder: string; profile: WorkerToolboxRoutingProfile }> = [
    { placeholder: '{{PLANNER_WORKER_ROUTING}}', profile: 'planner' },
    { placeholder: '{{EXECUTOR_WORKER_ROUTING}}', profile: 'executor' },
  ];
  let renderedContents = contents;

  for (const { placeholder, profile } of placeholderProfiles) {
    if (!renderedContents.includes(placeholder)) {
      continue;
    }

    renderedContents = renderedContents.replace(
      placeholder,
      renderWorkerToolboxRouting({
        profile,
        selectedLanguageSkills,
        selectedFrameworkSkills,
        selectedArchitectureSkill,
        selectedWorkflowSkills,
        selectedDatabaseSkills,
      })
    );
  }

  return renderedContents;
}

function collectWorkerRelevantSkills({
  selectedLanguageSkills,
  selectedFrameworkSkills,
  selectedArchitectureSkill,
  selectedWorkflowSkills,
  selectedDatabaseSkills,
}: {
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedFrameworkSkills: SelectableFrameworkSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
  selectedWorkflowSkills: SelectableWorkflowSkill[];
  selectedDatabaseSkills: SelectableDatabaseSkill[];
}): OptionalRoutingSkill[] {
  const implementationRelevantWorkflowSkills = selectedWorkflowSkills.filter((skill) =>
    skill.id === 'ai-prompt-engineer-master' || skill.id === 'ux-expert'
  );

  return [
    ...selectedLanguageSkills,
    ...selectedFrameworkSkills,
    ...selectedDatabaseSkills,
    ...implementationRelevantWorkflowSkills,
  ];
}

function getSharedSkillTargetPath(skill: OptionalRoutingSkill): string {
  const sharedTargetPath = Object.values(skill.targetRelativePathsByAgent).find((targetPath) => targetPath !== undefined);

  if (!sharedTargetPath) {
    throw new Error(`Selectable skill ${skill.id} has no target path.`);
  }

  return sharedTargetPath;
}

export function extractProjectOverview(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  const match = contents.match(/## Project overview\s+([\s\S]*?)(?=\n## |$)/);
  const overview = match?.[1]?.trim();
  return overview || undefined;
}
