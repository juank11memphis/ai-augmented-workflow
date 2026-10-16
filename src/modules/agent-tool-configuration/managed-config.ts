import { sha256 } from '../../shared/hash.js';

type Entry = { value: string; line?: string; lineIndex?: number; section?: string };
type Entries = Map<string, Entry>;

export function isSharedAgentConfig(template: string): boolean {
  return template === '.codex/config.toml' || template === '.claude/settings.json' ||
    template === '.gemini/settings.json' || template === 'mcp/claude/.mcp.json' ||
    template === 'mcp/gemini/settings.json';
}

export function managedConfigSnapshot(template: string, expectedContents: string, currentContents = expectedContents): Record<string, string> {
  const current = readEntries(template, currentContents);
  return Object.fromEntries([...readEntries(template, expectedContents)].map(([key]) => [key, sha256(current.get(key)?.value ?? '')]));
}

export function managedConfigHasLocalEdits({
  template,
  currentContents,
  expectedContents,
  recordedEntries,
  recordedVersionIsCurrent,
  recordedFileHash,
}: {
  template: string;
  currentContents: string;
  expectedContents: string;
  recordedEntries?: Record<string, string>;
  recordedVersionIsCurrent: boolean;
  recordedFileHash: string;
}): boolean {
  try {
    if (recordedEntries) {
      const current = readEntries(template, currentContents);
      return Object.entries(recordedEntries).some(([key, hash]) => sha256(current.get(key)?.value ?? '') !== hash);
    }

    if (!recordedVersionIsCurrent) return sha256(currentContents) !== recordedFileHash;

    const current = readEntries(template, currentContents);
    const expected = readEntries(template, expectedContents);
    return [...expected].some(([key, entry]) => current.get(key)?.value !== entry.value);
  } catch {
    return true;
  }
}

export function managedConfigSelectionChanged(template: string, expectedContents: string, recordedEntries?: Record<string, string>): boolean {
  if (!recordedEntries) return false;
  const expected = managedConfigSnapshot(template, expectedContents);
  return Object.keys(expected).length !== Object.keys(recordedEntries).length ||
    Object.entries(expected).some(([key, hash]) => recordedEntries[key] !== hash);
}

export function mergeManagedConfig({
  template,
  currentContents,
  expectedContents,
  recordedEntries,
}: {
  template: string;
  currentContents: string;
  expectedContents: string;
  recordedEntries: Record<string, string>;
}): string {
  const current = readEntries(template, currentContents);
  const expected = readEntries(template, expectedContents);

  for (const [key, hash] of Object.entries(recordedEntries)) {
    if (sha256(current.get(key)?.value ?? '') !== hash) {
      throw new Error(`Cannot update ${template}: a Sibu-managed setting was changed locally (${key}).`);
    }
  }
  for (const [key, entry] of expected) {
    if (!Object.hasOwn(recordedEntries, key) && current.has(key) && current.get(key)?.value !== entry.value) {
      throw new Error(`Cannot update ${template}: a new Sibu setting conflicts with a local setting (${key}).`);
    }
  }
  for (const prefix of removedMcpServerPrefixes(template, recordedEntries, expected)) {
    if ([...current.keys()].some((key) => belongsToMcpServer(key, prefix) && !Object.hasOwn(recordedEntries, key))) {
      throw new Error(`Cannot remove ${template}: the MCP server has local settings that Sibu does not own (${prefix}).`);
    }
  }

  return template === '.codex/config.toml'
    ? mergeToml(currentContents, current, expected, recordedEntries)
    : mergeJson(currentContents, expected, recordedEntries);
}

function removedMcpServerPrefixes(template: string, recorded: Record<string, string>, expected: Entries): string[] {
  const prefixes = new Set<string>();
  for (const key of Object.keys(recorded)) {
    const match = template === '.codex/config.toml'
      ? key.match(/^(mcp_servers\.[^.\/]+)(?:\.|\/)/)
      : key.match(/^(\/mcpServers\/[^/]+\/)/);
    if (match) prefixes.add(match[1]!);
  }
  return [...prefixes].filter((prefix) => ![...expected.keys()].some((key) => belongsToMcpServer(key, prefix)));
}

function belongsToMcpServer(key: string, prefix: string): boolean {
  return prefix.endsWith('/') ? key.startsWith(prefix) : key.startsWith(`${prefix}.`) || key.startsWith(`${prefix}/`);
}

function readEntries(template: string, contents: string): Entries {
  return template === '.codex/config.toml' ? readTomlEntries(contents) : readJsonEntries(contents);
}

function readTomlEntries(contents: string): Entries {
  const entries: Entries = new Map();
  let section = '';
  for (const [lineIndex, line] of contents.split('\n').entries()) {
    const heading = line.match(/^\s*\[([A-Za-z0-9_.-]+)\]\s*(?:#.*)?$/);
    if (heading) {
      section = heading[1]!;
      continue;
    }
    const assignment = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(.*?)\s*$/);
    if (!assignment) continue;
    const key = `${section}/${assignment[1]}`;
    if (entries.has(key)) throw new Error(`Duplicate TOML setting: ${key}`);
    entries.set(key, { value: assignment[2]!, line, lineIndex, section });
  }
  return entries;
}

function readJsonEntries(contents: string): Entries {
  const entries: Entries = new Map();
  visitJson('', parseJsonObject(contents), entries);
  return entries;
}

function visitJson(path: string, value: unknown, entries: Entries): void {
  if (path === '/hooks/SessionStart' && Array.isArray(value)) {
    entries.set(`${path}/@sibu`, { value: JSON.stringify(value.filter(isSibuSessionHook)) });
    return;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) visitJson(`${path}/${key}`, child, entries);
    return;
  }
  entries.set(path, { value: JSON.stringify(value) });
}

function isSibuSessionHook(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const hooks = (value as { hooks?: unknown }).hooks;
  return Array.isArray(hooks) && hooks.some((hook) => hook && typeof hook === 'object' &&
    typeof (hook as { command?: unknown }).command === 'string' &&
    (hook as { command: string }).command.includes('sibu doctor'));
}

function parseJsonObject(contents: string): Record<string, unknown> {
  const parsed = JSON.parse(contents) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected agent settings JSON to contain an object.');
  }
  return parsed as Record<string, unknown>;
}

function mergeJson(currentContents: string, expected: Entries, recordedEntries: Record<string, string>): string {
  const result = parseJsonObject(currentContents);
  for (const key of Object.keys(recordedEntries)) {
    if (!expected.has(key)) setJsonPath(result, key, undefined);
  }
  for (const [key, entry] of expected) setJsonPath(result, key, JSON.parse(entry.value) as unknown);
  return `${JSON.stringify(result, null, 2)}\n`;
}

function setJsonPath(root: Record<string, unknown>, path: string, value: unknown): void {
  if (path === '/hooks/SessionStart/@sibu') {
    const hooks = root.hooks ?? (root.hooks = {});
    if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) throw new Error('Cannot update agent settings: hooks is not an object.');
    const sessionStart = (hooks as Record<string, unknown>).SessionStart ?? [];
    if (!Array.isArray(sessionStart)) throw new Error('Cannot update agent settings: SessionStart is not an array.');
    const replacement = value === undefined ? [] : value;
    if (!Array.isArray(replacement)) throw new Error('Cannot update agent settings: Sibu hook is not an array.');
    const firstIndex = sessionStart.findIndex(isSibuSessionHook);
    const preserved = sessionStart.filter((hook) => !isSibuSessionHook(hook));
    preserved.splice(firstIndex < 0 ? preserved.length : firstIndex, 0, ...replacement);
    (hooks as Record<string, unknown>).SessionStart = preserved;
    return;
  }
  const segments = path.slice(1).split('/');
  let parent = root;
  const ancestors: Array<{ parent: Record<string, unknown>; key: string }> = [];
  for (const segment of segments.slice(0, -1)) {
    const child = parent[segment];
    if (child === undefined) parent[segment] = {};
    else if (!child || typeof child !== 'object' || Array.isArray(child)) throw new Error(`Cannot update agent settings: ${path} is blocked by a local value.`);
    ancestors.push({ parent, key: segment });
    parent = parent[segment] as Record<string, unknown>;
  }
  const leaf = segments.at(-1)!;
  if (value === undefined) {
    delete parent[leaf];
    for (const ancestor of ancestors.reverse()) {
      const child = ancestor.parent[ancestor.key] as Record<string, unknown>;
      if (Object.keys(child).length > 0) break;
      delete ancestor.parent[ancestor.key];
    }
  } else parent[leaf] = value;
}

function mergeToml(currentContents: string, current: Entries, expected: Entries, recordedEntries: Record<string, string>): string {
  const lines = currentContents.trimEnd().split('\n');
  const edits = new Map<number, string>();
  const additions = new Map<string, string[]>();
  for (const key of Object.keys(recordedEntries)) {
    if (!expected.has(key)) edits.set(current.get(key)!.lineIndex!, '');
  }
  for (const [key, entry] of expected) {
    const existing = current.get(key);
    if (existing) {
      if (existing.value !== entry.value) edits.set(existing.lineIndex!, entry.line!);
    } else {
      const section = entry.section!;
      additions.set(section, [...(additions.get(section) ?? []), entry.line!]);
    }
  }
  const sectionStarts = new Map<string, number>([['', -1]]);
  for (const [index, line] of lines.entries()) {
    const heading = line.match(/^\s*\[([A-Za-z0-9_.-]+)\]\s*(?:#.*)?$/);
    if (heading) sectionStarts.set(heading[1]!, index);
  }
  const sectionEnds = new Map<string, number>();
  const starts = [...sectionStarts].sort((a, b) => a[1] - b[1]);
  for (const [index, [section]] of starts.entries()) sectionEnds.set(section, starts[index + 1]?.[1] ?? lines.length);
  const inserts = new Map<number, string[]>();
  for (const [section, sectionLines] of additions) {
    if (sectionStarts.has(section)) {
      const at = sectionEnds.get(section)!;
      inserts.set(at, [...(inserts.get(at) ?? []), ...sectionLines]);
    } else {
      inserts.set(lines.length, [...(inserts.get(lines.length) ?? []), '', `[${section}]`, ...sectionLines]);
    }
  }
  const result: string[] = [];
  for (let index = 0; index <= lines.length; index += 1) {
    result.push(...(inserts.get(index) ?? []));
    if (index < lines.length) result.push(edits.get(index) ?? lines[index]!);
  }
  const withoutEmptyManagedTables = result.join('\n').replace(/\n\[mcp_servers\.[^\]]+\]\n(?=\n|$)/g, '\n');
  return `${withoutEmptyManagedTables.trimEnd()}\n`;
}
