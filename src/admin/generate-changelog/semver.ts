export type ParsedSemverVersion = {
  version: string;
  major: number;
  minor: number;
  patch: number;
};

export type SemverBump = 'major' | 'minor' | 'patch';

export type ParseSemverVersionResult =
  | {
      status: 'ok';
      version: ParsedSemverVersion;
    }
  | {
      status: 'invalid';
      message: string;
    };

export type DetermineSemverBumpResult =
  | {
      status: 'ok';
      bump: SemverBump;
    }
  | {
      status: 'not-comparable';
    };

export function parseSemverVersion(input: string): ParseSemverVersionResult {
  const trimmedInput = input.trim();
  const match = /^v?(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)$/.exec(trimmedInput);

  if (!match?.groups) {
    return {
      status: 'invalid',
      message: `Release version \`${input}\` must use SemVer format MAJOR.MINOR.PATCH, with an optional leading v.`,
    };
  }

  const major = Number(match.groups.major);
  const minor = Number(match.groups.minor);
  const patch = Number(match.groups.patch);

  return {
    status: 'ok',
    version: {
      version: `${major}.${minor}.${patch}`,
      major,
      minor,
      patch,
    },
  };
}

export function determineSemverBump(previousVersion: ParsedSemverVersion, nextVersion: ParsedSemverVersion): DetermineSemverBumpResult {
  if (nextVersion.major > previousVersion.major) {
    return { status: 'ok', bump: 'major' };
  }

  if (nextVersion.major !== previousVersion.major) {
    return { status: 'not-comparable' };
  }

  if (nextVersion.minor > previousVersion.minor) {
    return { status: 'ok', bump: 'minor' };
  }

  if (nextVersion.minor !== previousVersion.minor) {
    return { status: 'not-comparable' };
  }

  if (nextVersion.patch > previousVersion.patch) {
    return { status: 'ok', bump: 'patch' };
  }

  return { status: 'not-comparable' };
}
