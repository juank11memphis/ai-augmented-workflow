import { readFileSync } from 'node:fs';

export function readPromptTemplate(templateUrl: URL): string {
  return readFileSync(templateUrl, 'utf8').trim();
}

export function renderPromptTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/{{([a-zA-Z0-9_]+)}}/g, (placeholder, key: string) => values[key] ?? placeholder);
}
