export type AgentId = 'codex' | 'gemini' | 'claude' | 'windsurf';
export type LanguageSkillId = 'typescript' | 'golang';
export type FrameworkSkillId = 'nextjs' | 'react';
export type ArchitectureSkillId = 'ddd-hexagonal' | 'command-pattern' | 'layered-architecture';
export type WorkflowSkillId = 'ai-prompt-engineer-master' | 'ux-expert';
export type DatabaseSkillId = 'postgresql-expert';
export type McpServerId = 'github' | 'notion';
export type NpmVersionLookupMode = 'live' | 'offline';
export type NpmVersionResultSource = 'cache' | 'live' | 'override';
export type NpmVersionUnavailableReason = 'invalid-response' | 'network-error' | 'override';

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

export type SelectableWorkflowSkill = SkillTemplate & {
  id: WorkflowSkillId;
  name: string;
  description: string;
  routingInstruction: string;
};

export type SelectableDatabaseSkill = SkillTemplate & {
  id: DatabaseSkillId;
  name: string;
  description: string;
  routingInstruction: string;
};

export type SelectableMcpServer = {
  id: McpServerId;
  name: string;
  description: string;
  source: string;
};

export type ResolvedSelectableSkill =
  | { kind: 'language'; skill: SelectableLanguageSkill }
  | { kind: 'framework'; skill: SelectableFrameworkSkill }
  | { kind: 'architecture'; skill: SelectableArchitectureSkill }
  | { kind: 'workflow'; skill: SelectableWorkflowSkill }
  | { kind: 'database'; skill: SelectableDatabaseSkill };

export type ResolvedSelectableMcpServer = {
  server: SelectableMcpServer;
};

export type SelectableSkillResolutionResult =
  | { ok: true; resolved: ResolvedSelectableSkill }
  | { ok: false; message: string };

export type SelectableMcpServerResolutionResult =
  | { ok: true; resolved: ResolvedSelectableMcpServer }
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
  targetKind?: 'agent-support' | 'skill' | 'mcp-config';
  mcpConfigAgentId?: Extract<AgentId, 'codex' | 'gemini' | 'claude'>;
  selectedMcpServers?: SelectableMcpServer[];
};

export type SibuState = {
  sibuVersion: string;
  templateVersion: string;
  generatedAt: string;
  updatedAt: string;
  selectedAgents: AgentId[];
  selectedLanguageSkills?: LanguageSkillId[];
  reviewedLanguageSkills?: LanguageSkillId[];
  selectedFrameworkSkills?: FrameworkSkillId[];
  selectedArchitectureSkill?: ArchitectureSkillId;
  selectedWorkflowSkills?: WorkflowSkillId[];
  selectedDatabaseSkills?: DatabaseSkillId[];
  selectedMcpServers?: McpServerId[];
  mcpServerConfigs?: McpServerConfigs;
  reviewedArchitectureSkills?: ArchitectureSkillId[];
  managedFiles: Record<string, ManagedFileState>;
};

export type McpServerConfigs = {
  notion?: {
    docsParentPage: string;
  };
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

export type NpmVersionUpToDateResult = {
  checkedAt: string;
  currentVersion: string;
  latestVersion: string;
  packageName: string;
  source: NpmVersionResultSource;
  status: 'up-to-date';
};

export type NpmVersionUpdateAvailableResult = {
  checkedAt: string;
  currentVersion: string;
  latestVersion: string;
  packageName: string;
  source: NpmVersionResultSource;
  status: 'update-available';
};

export type NpmVersionUnavailableResult = {
  checkedAt: string;
  packageName: string;
  reason: NpmVersionUnavailableReason;
  source: NpmVersionResultSource;
  status: 'unavailable';
};

export type NpmVersionCheckResult = NpmVersionUpToDateResult | NpmVersionUpdateAvailableResult | NpmVersionUnavailableResult;
export type NpmVersionCacheRecord = NpmVersionCheckResult;
export type NpmVersionLiveStatus = 'up-to-date' | 'update-available';
export type NpmVersionLiveOutcome = NpmVersionCheckResult;
