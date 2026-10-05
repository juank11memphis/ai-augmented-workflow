import type { NpmVersionCheckResult } from '../../shared/types.js';

export function getNpmVersionAdvisoryLines(result: NpmVersionCheckResult): string[] {
  if (result.status !== 'update-available') return [];
  return [
    `A newer Sibu version is available: ${result.latestVersion} (${result.currentVersion} installed).`,
    'Update with `npm install -g @juancr11/sibu`.',
  ];
}
