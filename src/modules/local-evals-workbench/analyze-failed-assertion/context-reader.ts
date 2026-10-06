import path from 'node:path';
import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import type { RuntimeOutcome } from '../runtime-description.js';
import type { ProjectFileStateResult } from '../repair-context/project-file-state.js';
import type { AnalyzeFailedAssertionCommand } from './command.js';

export type AnalysisContext = {
  readonly origin: 'current-project';
  readonly excerpts: readonly { readonly source: string; readonly text: string }[];
  readonly missing: readonly string[];
};

export type AnalysisContextReaderPort = { read(command: AnalyzeFailedAssertionCommand): Promise<AnalysisContext> };

type ContextSources = {
  readonly loadSuite: (suiteId: string) => Promise<NormalizedEvalSuite | undefined>;
  readonly resolve: (cases: readonly NormalizedEvalTestCase[]) => Promise<RuntimeOutcome<readonly NormalizedEvalTestCase[]>>;
  readonly readFile: (relativePath: string) => Promise<ProjectFileStateResult>;
};

const sensitive = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{10,}|\bBearer\s+[A-Za-z0-9._~+/-]{12,}|\b[A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD)\s*=\s*[^\s,;}]{8,}|\b(?:api[_-]?key|token|secret|password|credential)s?["']?\s*:\s*["']?(?!<|\$\{|redacted|test|fake|example)[^\s,;}"']{8,}/i;
const limits = { 'Case input': 1200, Fixture: 1400, 'Case reference': 600, 'Selected check': 1000, 'Target source': 1000, 'Target prompt': 1600 } as const;

export function createAnalysisContextReader(sources: ContextSources): AnalysisContextReaderPort {
  return { async read(command) {
    const excerpts: { source: string; text: string }[] = [];
    const missing: string[] = [];
    const add = (source: keyof typeof limits, value: unknown): void => {
      const text = typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value);
      if (!text || sensitive.test(text) || Buffer.byteLength(text, 'utf8') > limits[source]) { missing.push(source); return; }
      excerpts.push({ source, text });
    };
    const suite = await sources.loadSuite(command.suiteId);
    const selected = suite?.testCases.find(item => item.id === command.testCaseId);
    if (!suite || !selected || ![...selected.assertions, ...selected.graders].some(item => item.id === command.assertionId)) {
      return { origin: 'current-project', excerpts, missing: ['Case input', 'Fixture', 'Case reference', 'Selected check', 'Target source', 'Target prompt'] };
    }
    const resolved = await sources.resolve([selected]);
    if (resolved.status === 'ready' && resolved.value[0]) {
      const item = resolved.value[0];
      add('Case input', item.turns.map(turn => ({ role: turn.role, text: turn.content.type === 'inline' ? turn.content.text : '' })));
      if (item.fixture) add('Fixture', item.fixture.type === 'inline' ? item.fixture.value : undefined);
      if (item.reference) add('Case reference', item.reference.type === 'inline' ? item.reference.text : undefined);
      add('Selected check', [...item.assertions, ...item.graders].find(check => check.id === command.assertionId));
    } else missing.push('Case input', ...(selected.fixture ? ['Fixture'] : []), ...(selected.reference ? ['Case reference'] : []), 'Selected check');
    const target = await sources.readFile(suite.target.path);
    if (target.status !== 'ok' || target.value.status !== 'present') {
      missing.push('Target source', 'Target prompt');
      return { origin: 'current-project', excerpts, missing };
    }
    const source = target.value.content;
    add('Target source', source.slice(0, limits['Target source']));
    const promptReference = source.match(/new URL\(["'](\.\/prompts\/[A-Za-z0-9._/-]+\.md)["'],\s*import\.meta\.url\s*\)/)?.[1];
    if (!promptReference || promptReference.split('/').includes('..')) missing.push('Target prompt');
    else {
      const promptPath = path.posix.join(path.posix.dirname(suite.target.path), promptReference);
      const prompt = await sources.readFile(promptPath);
      if (prompt.status !== 'ok' || prompt.value.status !== 'present') missing.push('Target prompt');
      else add('Target prompt', prompt.value.content);
    }
    return { origin: 'current-project', excerpts, missing };
  } };
}
