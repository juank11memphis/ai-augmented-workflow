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

export function extractProjectOverview(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  const match = contents.match(/## Project overview\s+([\s\S]*?)(?=\n## |$)/);
  const overview = match?.[1]?.trim();
  return overview || undefined;
}
