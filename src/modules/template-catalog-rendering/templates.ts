import fs from 'node:fs';
import { renderMcpConfig, resolveMcpConfigAgentId } from '../agent-tool-configuration/index.js';
import { readTemplate } from '../template-catalog/index.js';
import type {
  SelectableArchitectureSkill,
  SelectableDatabaseSkill,
  SelectableFrameworkSkill,
  SelectableLanguageSkill,
  SelectableMcpServer,
  SelectableWorkflowSkill,
} from '../../shared/types.js';

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

### Optional installed skills relevant to ${profile} work
${selectedSkillsSection}`;
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
    ...(selectedArchitectureSkill ? [selectedArchitectureSkill] : []),
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
