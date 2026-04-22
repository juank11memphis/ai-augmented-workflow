export type AgentId = 'codex' | 'gemini' | 'claude' | 'windsurf';
export type LanguageSkillId = 'typescript' | 'golang';
export type FrameworkSkillId = 'nextjs' | 'react';
export type ArchitectureSkillId = 'ddd-hexagonal' | 'command-pattern';

export type SupportedAgent = {
  id: AgentId;
  name: string;
  description: string;
  targetRelativePath?: string;
  templateRelativePath?: string;
};

export type SkillTemplate = {
  templateRelativePath: string;
  targetRelativePathsByAgent: Partial<Record<AgentId, string>>;
};

export type SelectableLanguageSkill = SkillTemplate & {
  id: LanguageSkillId;
  name: string;
  description: string;
  routingInstruction: string;
};

export type SelectableFrameworkSkill = SkillTemplate & {
  id: FrameworkSkillId;
  name: string;
  description: string;
  routingInstruction: string;
};

export type SelectableArchitectureSkill = SkillTemplate & {
  id: ArchitectureSkillId;
  name: string;
  description: string;
  routingInstruction: string;
};

export type ResolvedSelectableSkill =
  | { kind: 'language'; skill: SelectableLanguageSkill }
  | { kind: 'framework'; skill: SelectableFrameworkSkill }
  | { kind: 'architecture'; skill: SelectableArchitectureSkill };

export type SelectableSkillResolutionResult =
  | { ok: true; resolved: ResolvedSelectableSkill }
  | { ok: false; message: string };

export type FileToCreate = {
  label: string;
  targetPath: string;
  contents: string;
};

export type WorkflowTarget = {
  label: string;
  targetPath: string;
  templateRelativePath: string;
  requiresProjectOverview: boolean;
};

export type EchoState = {
  echoVersion: string;
  templateVersion: string;
  generatedAt: string;
  updatedAt: string;
  selectedAgents: AgentId[];
  selectedLanguageSkills?: LanguageSkillId[];
  reviewedLanguageSkills?: LanguageSkillId[];
  selectedFrameworkSkills?: FrameworkSkillId[];
  selectedArchitectureSkill?: ArchitectureSkillId;
  reviewedArchitectureSkills?: ArchitectureSkillId[];
  managedFiles: Record<string, ManagedFileState>;
};

export type ManagedFileStatus = 'managed' | 'customized' | 'unmanaged';

export type ManagedFileState = {
  template: string;
  templateVersion: string;
  sha256: string;
  status?: ManagedFileStatus;
  lastReviewedTemplateVersion?: string;
  reason?: string;
};

export type DoctorIssue = {
  severity: 'warning' | 'error';
  message: string;
  hint?: string;
};

export type TemplateManifest = {
  templateVersion: string;
  templates: Record<string, TemplateManifestEntry>;
};

export type TemplateManifestEntry = {
  version: string;
  description: string;
  changes: string[];
};

export type ManagedFilePath = {
  relativePath: string;
  absolutePath: string;
};
