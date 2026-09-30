import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';

function readEnvironmentFile(projectRoot: string, fileName: string): Record<string, string> | null {
  try {
    return parse(readFileSync(join(projectRoot, fileName)));
  } catch {
    return null;
  }
}

export function loadEvalEnvironment(projectRoot: string, inheritedEnvironment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const projectEnvironment = readEnvironmentFile(projectRoot, '.env');
  const selectedEnvironment = projectEnvironment?.OPENAI_API_KEY?.trim()
    ? projectEnvironment
    : readEnvironmentFile(projectRoot, '.env.local') ?? {};
  const environment = { ...selectedEnvironment, ...inheritedEnvironment };

  if (!inheritedEnvironment.OPENAI_API_KEY?.trim() && selectedEnvironment.OPENAI_API_KEY?.trim()) {
    environment.OPENAI_API_KEY = selectedEnvironment.OPENAI_API_KEY;
  }

  return environment;
}
