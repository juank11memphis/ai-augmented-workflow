import { execFile } from 'node:child_process';
import type { Outcome } from './contracts.js';
import { LIMITS } from './limits.js';
export type GitCommand = (args: readonly string[], root: string) => Promise<{ readonly code: number; readonly stdout: string }>;
export const executeGit: GitCommand = (args, cwd) => new Promise((resolve, reject) => {
  execFile('git', ['-c', 'core.fsmonitor=false', ...args], { cwd, shell: false, timeout: LIMITS.gitTimeoutMs, maxBuffer: LIMITS.gitBytes, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME, SystemRoot: process.env.SystemRoot, GIT_OPTIONAL_LOCKS: '0' } }, (error, stdout) => {
    if (error && (typeof error.code !== 'number' || error.killed)) reject(new Error('git-unavailable'));
    else resolve({ code: typeof error?.code === 'number' ? error.code : 0, stdout });
  });
});
export class GitArtifactSafety {
  constructor(private readonly root: string, private readonly git: GitCommand = executeGit) {}
  async check(paths: readonly string[] = []): Promise<Outcome<null>> {
    try {
      const repository = await this.git(['rev-parse', '--show-toplevel'], this.root);
      if (repository.code !== 0 || repository.stdout.trim() !== this.root) return { status: 'blocked', reason: 'unverifiable-root' };
      const tracked = await this.git(['ls-files', '-z', '--', 'evals/artifacts'], this.root);
      if (tracked.code !== 0) return { status: 'blocked', reason: 'git-unavailable' };
      if (tracked.stdout.length) return { status: 'blocked', reason: 'tracked-artifacts' };
      for (const relative of ['', 'sibu-readiness-probe/future.json', ...paths]) {
        const ignored = await this.git(['check-ignore', '--no-index', '-q', '--', `evals/artifacts/${relative}`], this.root);
        if (ignored.code === 1) return { status: 'blocked', reason: 'not-ignored' };
        if (ignored.code !== 0) return { status: 'blocked', reason: 'git-unavailable' };
      }
      return { status: 'ok', value: null };
    } catch { return { status: 'blocked', reason: 'git-unavailable' }; }
  }
}
