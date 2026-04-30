import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { parseReleaseArgs, runReleaseCli } from './release.js';

describe('parseReleaseArgs', () => {
  it('parses release planning flags', () => {
    const result = parseReleaseArgs(['--from', 'v1.2.3', '--to', 'HEAD', '--version', 'v1.3.0', '--date', '2026-04-27', '--otp', '123456', '--dry-run', '--yes']);

    assert.deepEqual(result, {
      status: 'ok',
      command: {
        fromRef: 'v1.2.3',
        toRef: 'HEAD',
        version: 'v1.3.0',
        date: '2026-04-27',
        otp: '123456',
        dryRun: true,
        assumeYes: true,
      },
    });
  });

  it('returns help output', () => {
    const result = parseReleaseArgs(['--help']);

    assert.equal(result.status, 'help');
    if (result.status !== 'help') {
      return;
    }

    assert.match(result.usage, /Usage: pnpm admin:release/);
    assert.match(result.usage, /--otp <code>/);
  });

  it('blocks unknown flags with usage', () => {
    const result = parseReleaseArgs(['--wat']);

    assert.equal(result.status, 'error');
    if (result.status !== 'error') {
      return;
    }

    assert.match(result.message, /Unknown option `--wat`/);
    assert.match(result.usage, /Usage: pnpm admin:release/);
  });

  it('blocks missing flag values with usage', () => {
    const result = parseReleaseArgs(['--version']);

    assert.equal(result.status, 'error');
    if (result.status !== 'error') {
      return;
    }

    assert.match(result.message, /requires a value/);
    assert.match(result.usage, /Usage: pnpm admin:release/);
  });
});



describe('release script boundaries', () => {
  it('exposes release automation only as a maintainer package script', () => {
    const packageJson = readRootPackageJson();

    assert.equal(packageJson.scripts['admin:release'], 'node ./bin/admin/release.js');
    assert.deepEqual(packageJson.bin, { sibu: './bin/sibu.js' });
  });

  it('keeps admin release validation focused on publish readiness', () => {
    const packageJson = readRootPackageJson();

    assert.equal(packageJson.scripts['validate:release-publish'], 'pnpm verify && npm pack && pnpm run validate:packed-runtime');
    assert.match(packageJson.scripts['validate:release'], /validate:doctor-version-advisory/);
    assert.match(packageJson.scripts['validate:release'], /validate:post-update-doctor-drift/);
  });

  it('does not wire a public release command into the Sibu CLI', () => {
    const createProgramSource = fs.readFileSync('src/entrypoints/cli/create-program.ts', 'utf8');

    assert.doesNotMatch(createProgramSource, /\.command\(['"]release['"]\)/);
    assert.doesNotMatch(createProgramSource, /program\.command\(['"]release['"]\)/);
  });
});

describe('runReleaseCli', () => {
  it('keeps dry-run free of writes and command side effects', async () => {
    const rootPath = createCliReleaseRepository();
    const ports = createFakeCliPorts({ confirmResult: true });

    const exitCode = await runReleaseCli(['--date', '2026-04-27', '--dry-run'], ports, rootPath);

    assert.equal(exitCode, 0);
    assert.equal(ports.printed.some((message) => /Release plan preview/.test(message)), true);
    assert.equal(ports.writes.length, 0);
    assert.equal(ports.commands.length, 0);
  });

  it('keeps declined confirmation free of writes and command side effects', async () => {
    const rootPath = createCliReleaseRepository();
    const ports = createFakeCliPorts({ confirmResult: false });

    const exitCode = await runReleaseCli(['--date', '2026-04-27'], ports, rootPath);

    assert.equal(exitCode, 0);
    assert.equal(ports.confirmCalls, 1);
    assert.equal(ports.writes.length, 0);
    assert.equal(ports.commands.length, 0);
  });

  it('prints the preview before executing side effects when yes is assumed', async () => {
    const rootPath = createCliReleaseRepository();
    const ports = createFakeCliPorts({ confirmResult: false });

    const exitCode = await runReleaseCli(['--date', '2026-04-27', '--yes'], ports, rootPath);

    assert.equal(exitCode, 0);
    assert.equal(ports.confirmCalls, 0);
    assert.equal(ports.events.some((event) => event === 'print:Release plan preview'), true);
    assert.equal(ports.events.indexOf('print:Release plan preview') < ports.events.findIndex((event) => event.startsWith('write:')), true);
    assert.equal(ports.events.some((event) => event.startsWith('run:')), true);
    assert.equal(ports.printed.some((message) => /Release confirmed; starting execution/.test(message)), true);
  });
});

type RootPackageJson = {
  scripts: Record<string, string>;
  bin: Record<string, string>;
};

function readRootPackageJson(): RootPackageJson {
  return JSON.parse(fs.readFileSync('package.json', 'utf8')) as RootPackageJson;
}

type FakeCliPorts = {
  printed: string[];
  writes: Array<{ path: string; contents: string }>;
  commands: Array<{ command: string; args: string[] }>;
  events: string[];
  confirmCalls: number;
  print(message: string): void;
  confirmRelease(): boolean;
  writeFile(path: string, contents: string): void;
  run(command: string, args: string[]): { exitCode: number; stdout: string; stderr: string };
};

function createFakeCliPorts(input: { confirmResult: boolean }): FakeCliPorts {
  return {
    printed: [],
    writes: [],
    commands: [],
    events: [],
    confirmCalls: 0,
    print(message: string) {
      this.printed.push(message);
      this.events.push(`print:${message.split("\n")[0]}`);
    },
    confirmRelease() {
      this.confirmCalls += 1;
      this.events.push('confirm');
      return input.confirmResult;
    },
    writeFile(path: string, contents: string) {
      this.writes.push({ path, contents });
      this.events.push(`write:${path}`);
    },
    run(command: string, args: string[]) {
      this.commands.push({ command, args });
      this.events.push(`run:${command} ${args.join(" ")}`);
      return { exitCode: 0, stdout: '', stderr: '' };
    },
  };
}

function createCliReleaseRepository(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-release-cli-test-'));
  const runGit = (args: string[]) => execFileSync('git', args, { cwd: rootPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  runGit(['init']);
  runGit(['config', 'user.name', 'Sibu Test']);
  runGit(['config', 'user.email', 'sibu@example.com']);
  fs.writeFileSync(path.join(rootPath, 'one.txt'), 'one', 'utf8');
  runGit(['add', 'one.txt']);
  runGit(['commit', '-m', 'feat: first release baseline']);
  fs.writeFileSync(path.join(rootPath, 'CHANGELOG.md'), '# Changelog\n\n## 1.2.3 - 2026-04-01\n\n### Added\n- Baseline.\n', 'utf8');
  fs.writeFileSync(path.join(rootPath, 'package.json'), '{\n  "name": "sibu",\n  "version": "1.2.3"\n}\n', 'utf8');
  runGit(['add', 'CHANGELOG.md', 'package.json']);
  runGit(['commit', '-m', 'chore: prepare 1.2.3 metadata']);
  runGit(['tag', 'v1.2.3']);
  fs.writeFileSync(path.join(rootPath, 'two.txt'), 'two', 'utf8');
  runGit(['add', 'two.txt']);
  runGit(['commit', '-m', 'fix: handle release planning']);
  return rootPath;
}
