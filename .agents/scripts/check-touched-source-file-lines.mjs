#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const MAX_SOURCE_FILE_LINES = 500;
const SOURCE_EXTENSIONS = new Set([
  '.bash',
  '.c',
  '.cc',
  '.cjs',
  '.clj',
  '.cljs',
  '.cpp',
  '.cs',
  '.cts',
  '.cxx',
  '.dart',
  '.ex',
  '.exs',
  '.fs',
  '.fsx',
  '.go',
  '.h',
  '.hpp',
  '.hs',
  '.java',
  '.js',
  '.jsx',
  '.kt',
  '.kts',
  '.lua',
  '.mjs',
  '.mts',
  '.php',
  '.pl',
  '.pm',
  '.ps1',
  '.py',
  '.rb',
  '.rs',
  '.scala',
  '.sh',
  '.swift',
  '.ts',
  '.tsx',
  '.zsh',
]);

function main() {
  const repoRoot = getRepoRoot();
  const touchedSourceFiles = getTouchedSourceFiles(repoRoot);
  const violations = [];

  for (const relativePath of touchedSourceFiles) {
    const lineCount = countPhysicalLines(path.join(repoRoot, relativePath));

    if (lineCount > MAX_SOURCE_FILE_LINES) {
      violations.push({ relativePath, lineCount });
    }
  }

  if (violations.length > 0) {
    console.error(`Source file size gate failed: ${violations.length} touched source file(s) exceed ${MAX_SOURCE_FILE_LINES} lines.`);
    for (const violation of violations) {
      console.error(`- ${violation.relativePath}: ${violation.lineCount} lines`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Source file size gate passed: ${touchedSourceFiles.length} touched source file(s) checked, limit ${MAX_SOURCE_FILE_LINES} lines.`);
}

function getRepoRoot() {
  try {
    return runGit(['rev-parse', '--show-toplevel'], process.cwd()).trim();
  } catch (error) {
    throw new Error(`Unable to find a git repository. Run this checker from a repo root or subdirectory. ${getGitErrorMessage(error)}`);
  }
}

function getTouchedSourceFiles(repoRoot) {
  const statusOutput = getGitStatus(repoRoot);
  const touchedPaths = parsePorcelainStatus(statusOutput);
  const sourcePaths = touchedPaths.filter((relativePath) => isReadableSourceFile(repoRoot, relativePath));

  return [...new Set(sourcePaths)].sort();
}

function getGitStatus(repoRoot) {
  try {
    return runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], repoRoot);
  } catch (error) {
    throw new Error(`Unable to inspect touched files with git status. ${getGitErrorMessage(error)}`);
  }
}

function parsePorcelainStatus(statusOutput) {
  const entries = statusOutput.split('\0').filter(Boolean);
  const touchedPaths = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const status = entry.slice(0, 2);
    const relativePath = entry.slice(3);

    if (status.includes('R') || status.includes('C')) {
      index += 1;
    }

    if (status === '!!' || !status.includes('D')) {
      touchedPaths.push(relativePath);
    }
  }

  return touchedPaths;
}

function isReadableSourceFile(repoRoot, relativePath) {
  if (!SOURCE_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) {
    return false;
  }

  const absolutePath = path.join(repoRoot, relativePath);

  if (!existsSync(absolutePath)) {
    return false;
  }

  return statSync(absolutePath).isFile();
}

function countPhysicalLines(absolutePath) {
  const contents = readFileSync(absolutePath, 'utf8');

  if (contents.length === 0) {
    return 0;
  }

  const newlineCount = contents.match(/\n/g)?.length ?? 0;
  return contents.endsWith('\n') ? newlineCount : newlineCount + 1;
}

function runGit(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function getGitErrorMessage(error) {
  if (error && typeof error === 'object' && 'stderr' in error && typeof error.stderr === 'string' && error.stderr.trim()) {
    return error.stderr.trim();
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Git command failed.';
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Source file size gate failed: ${message}`);
  process.exitCode = 1;
}
