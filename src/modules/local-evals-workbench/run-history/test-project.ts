import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
export async function project(ignored = true) {
  const root = await mkdtemp(path.join(tmpdir(), 'sibu-history-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q'); await writeFile(path.join(root, '.gitignore'), ignored ? '/evals/artifacts/\n' : '');
  return { root, git, cleanup: () => rm(root, { recursive: true, force: true }) };
}
