import type { ReleasePackageJsonUpdatePlan, ReleaseWarning } from './command.js';

export type PlanPackageJsonVersionUpdateResult =
  | {
      status: 'ok';
      plan: ReleasePackageJsonUpdatePlan;
    }
  | BlockedPackageJsonResult;

export function planPackageJsonVersionUpdate(existingContent: string | undefined, targetVersion: string): PlanPackageJsonVersionUpdateResult {
  if (existingContent === undefined) {
    return malformedPackageJson('Root package.json could not be read.');
  }

  const parsedPackageJson = parsePackageJson(existingContent);
  if (parsedPackageJson.status === 'blocked') {
    return parsedPackageJson;
  }

  const currentVersion = parsedPackageJson.value.version;
  if (typeof currentVersion !== 'string') {
    return malformedPackageJson('Root package.json must contain a string version field.');
  }

  const versionValueRange = findRootStringPropertyValueRange(existingContent, 'version');
  if (!versionValueRange) {
    return malformedPackageJson('Root package.json version field could not be located safely.');
  }

  return {
    status: 'ok',
    plan: {
      path: 'package.json',
      currentVersion,
      targetVersion,
      nextContent: replaceRange(existingContent, versionValueRange.start, versionValueRange.end, JSON.stringify(targetVersion)),
    },
  };
}

type ParsedPackageJsonResult =
  | {
      status: 'ok';
      value: { version?: unknown };
    }
  | BlockedPackageJsonResult;

type BlockedPackageJsonResult = {
  status: 'blocked';
  message: string;
  warnings: ReleaseWarning[];
};

type TextRange = {
  start: number;
  end: number;
};

function parsePackageJson(content: string): ParsedPackageJsonResult {
  try {
    const parsed: unknown = JSON.parse(content);

    if (!isRecord(parsed)) {
      return malformedPackageJson('Root package.json must contain a JSON object.');
    }

    return {
      status: 'ok',
      value: parsed,
    };
  } catch {
    return malformedPackageJson('Root package.json could not be parsed as JSON.');
  }
}

function findRootStringPropertyValueRange(content: string, propertyName: string): TextRange | undefined {
  let index = skipWhitespace(content, 0);
  if (content[index] !== '{') {
    return undefined;
  }

  index += 1;

  while (index < content.length) {
    index = skipWhitespaceAndComma(content, index);

    if (content[index] === '}') {
      return undefined;
    }

    if (content[index] !== '"') {
      return undefined;
    }

    const keyEnd = findStringLiteralEnd(content, index);
    if (keyEnd === undefined) {
      return undefined;
    }

    const key = parseStringLiteral(content.slice(index, keyEnd));
    index = skipWhitespace(content, keyEnd);

    if (content[index] !== ':') {
      return undefined;
    }

    index = skipWhitespace(content, index + 1);
    const valueStart = index;
    const valueEnd = findJsonValueEnd(content, valueStart);
    if (valueEnd === undefined) {
      return undefined;
    }

    if (key === propertyName) {
      if (content[valueStart] !== '"') {
        return undefined;
      }

      return {
        start: valueStart,
        end: valueEnd,
      };
    }

    index = valueEnd;
  }

  return undefined;
}

function findJsonValueEnd(content: string, start: number): number | undefined {
  const firstCharacter = content[start];

  if (firstCharacter === '"') {
    return findStringLiteralEnd(content, start);
  }

  if (firstCharacter === '{' || firstCharacter === '[') {
    return findContainerEnd(content, start);
  }

  const match = /^[^,\]}]+/.exec(content.slice(start));
  return match ? start + match[0].trimEnd().length : undefined;
}

function findContainerEnd(content: string, start: number): number | undefined {
  const openingCharacter = content[start];
  const closingCharacter = openingCharacter === '{' ? '}' : ']';
  let depth = 0;
  let index = start;

  while (index < content.length) {
    const character = content[index];

    if (character === '"') {
      const stringEnd = findStringLiteralEnd(content, index);
      if (stringEnd === undefined) {
        return undefined;
      }
      index = stringEnd;
      continue;
    }

    if (character === openingCharacter) {
      depth += 1;
    }

    if (character === closingCharacter) {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }

    index += 1;
  }

  return undefined;
}

function findStringLiteralEnd(content: string, start: number): number | undefined {
  let escaped = false;

  for (let index = start + 1; index < content.length; index += 1) {
    const character = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '"') {
      return index + 1;
    }
  }

  return undefined;
}

function parseStringLiteral(value: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function skipWhitespace(content: string, start: number): number {
  let index = start;

  while (/\s/.test(content[index] ?? '')) {
    index += 1;
  }

  return index;
}

function skipWhitespaceAndComma(content: string, start: number): number {
  let index = skipWhitespace(content, start);

  if (content[index] === ',') {
    index = skipWhitespace(content, index + 1);
  }

  return index;
}

function replaceRange(content: string, start: number, end: number, replacement: string): string {
  return `${content.slice(0, start)}${replacement}${content.slice(end)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformedPackageJson(message: string): BlockedPackageJsonResult {
  return {
    status: 'blocked',
    message,
    warnings: [
      {
        code: 'malformed-package-json',
        message,
      },
    ],
  };
}
