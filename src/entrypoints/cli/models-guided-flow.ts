import { createInterface } from 'node:readline';
import type { ListModelRoutesResult, ModelRouteListItem } from '../../modules/workflow-configuration-manager/list-model-routes/result.js';
import type { ResetModelRoutesCommand } from '../../modules/workflow-configuration-manager/reset-model-routes/command.js';
import type { ResetModelRoutesResult } from '../../modules/workflow-configuration-manager/reset-model-routes/result.js';
import type { SetModelRouteCommand } from '../../modules/workflow-configuration-manager/set-model-route/command.js';
import type { SetModelRouteResult } from '../../modules/workflow-configuration-manager/set-model-route/result.js';

export type ModelsTerminal = { write(line: string): void; ask(prompt: string): Promise<string | null>; close(): void; width: number };
export type ModelsOperations = {
  list(): ListModelRoutesResult;
  set(command: SetModelRouteCommand): SetModelRouteResult;
  reset(command: ResetModelRoutesCommand): ResetModelRoutesResult;
};

export function createModelsTerminal(): ModelsTerminal {
  const lines: string[] = [];
  const waiters: Array<(answer: string | null) => void> = [];
  const input = createInterface({ input: process.stdin, terminal: false });
  let ended = false;
  input.on('line', (line) => { const waiter = waiters.shift(); if (waiter) waiter(line); else lines.push(line); });
  input.on('close', () => { ended = true; for (const waiter of waiters.splice(0)) waiter(null); });
  return {
    width: process.stdout.columns || 80,
    write: (line) => process.stdout.write(`${line}\n`),
    ask: async (prompt) => {
      process.stdout.write(`${prompt} `);
      if (lines.length) return lines.shift()!;
      if (ended) return null;
      return new Promise((resolve) => waiters.push(resolve));
    },
    close: () => input.close(),
  };
}

export async function runModelsGuidedFlow(terminal: ModelsTerminal, operations: ModelsOperations): Promise<void> {
  const originalWrite = terminal.write;
  terminal = { ...terminal, write: (line) => {
    for (const wrapped of wrapLine(line, terminal.width)) originalWrite(wrapped);
  } };
  try {
    while (true) {
      const listed = operations.list();
      if (listed.status === 'recommendation-unavailable') {
        terminal.write('Saved model routes');
        terminal.write('');
        if (!listed.savedRoutes.length) terminal.write('No saved routes.');
        for (const route of listed.savedRoutes) {
          terminal.write(`${roleLabel(route.role)} · ${workloadLabel(route.workloadClass)}`);
          terminal.write(`   ${modelLabel(route.model)} / ${route.reasoningEffort} · Recommendation unavailable`);
        }
        terminal.write('');
        terminal.write(listed.recovery);
        return;
      }
      if (listed.status !== 'listed') { terminal.write(listed.recovery); return; }
      terminal.write('Model routes');
      terminal.write('');
      terminal.write('Which route would you like to review?');
      terminal.write('');
      listed.routes.forEach((item, index) => {
        terminal.write(`${index + 1}. ${roleLabel(item.recommendation.role)} · ${workloadLabel(item.recommendation.workloadClass)}`);
        const value = item.route ? `${modelLabel(item.route.model)} / ${item.route.reasoningEffort} · ${statusLabel(item)}` : 'Not configured';
        writeWrapped(terminal, `   ${value}`);
        terminal.write('');
      });
      terminal.write(`${listed.routes.length + 1}. Reset routes`);
      terminal.write(`${listed.routes.length + 2}. Exit`);
      const choice = await terminal.ask('Choose a number:');
      if (choice === null || choice === String(listed.routes.length + 2)) return;
      if (choice === String(listed.routes.length + 1)) { await resetAll(terminal, operations, listed); continue; }
      const number = parseChoice(choice, listed.routes.length);
      if (number === null) { terminal.write('Choose a listed number.'); continue; }
      await reviewRoute(terminal, operations, listed.routes[number - 1], listed.catalogVersion, listed.stateBasis);
    }
  } finally { terminal.close(); }
}

async function reviewRoute(terminal: ModelsTerminal, operations: ModelsOperations, item: ModelRouteListItem, catalogVersion: string, stateBasis: string): Promise<void> {
  const key = item.recommendation;
  while (true) {
    terminal.write('');
    if (item.route) {
      writeWrapped(terminal, `Current: ${modelLabel(item.route.model)} / ${item.route.reasoningEffort}`);
      terminal.write(`Status: ${statusLabel(item)}`);
      terminal.write('');
      terminal.write('1. Keep current');
      terminal.write('2. Choose another');
      terminal.write('3. Reset to current recommendation');
      terminal.write('4. Back');
    } else {
      terminal.write('Current: Not configured');
      terminal.write('Status: Not configured');
      terminal.write('');
      terminal.write('1. Use current recommendation');
      terminal.write('2. Choose another');
      terminal.write('3. Back');
    }
    const choice = await terminal.ask('Choose a number:');
    if (choice === null || choice === (item.route ? '4' : '3') || choice === '1' && !!item.route) return;
    if (choice === '2' || choice === '1' && !item.route) {
      const selected = choice === '1' ? { model: key.model, effort: key.reasoningEffort } : await chooseModel(terminal, item);
      if (!selected) continue;
      const result = operations.set({ type: 'models:set', agentEnvironment: key.agentEnvironment, role: key.role,
        workloadClass: key.workloadClass, model: selected.model, reasoningEffort: selected.effort, catalogVersion, stateBasis });
      if (result.status === 'saved') {
        writeWrapped(terminal, `Saved ${modelLabel(result.route.model)} / ${result.route.reasoningEffort} for ${roleLabel(key.role)} · ${workloadLabel(key.workloadClass)}. ${result.route.origin === 'user-selected' ? 'User selected.' : 'Recommended.'}`);
        return;
      }
      terminal.write(`Could not save route. ${result.recovery}`);
      return;
    }
    if (choice === '3' && item.route) {
      reportReset(terminal, operations.reset({ type: 'models:reset', scope: 'one', key, confirmed: true, catalogVersion, stateBasis }));
      return;
    }
    terminal.write('Choose a listed number.');
  }
}

async function chooseModel(terminal: ModelsTerminal, item: ModelRouteListItem): Promise<{ model: string; effort: string } | null> {
  const recommendation = item.recommendation;
  terminal.write(`Choose a model for ${roleLabel(recommendation.role)} · ${workloadLabel(recommendation.workloadClass)}`);
  terminal.write(`Recommended: ${modelLabel(recommendation.model)} / ${recommendation.reasoningEffort}`);
  terminal.write('1. Use recommended');
  terminal.write('2. Enter another model');
  terminal.write('3. Back');
  const choice = await terminal.ask('Choose a number:');
  if (choice === '1') return { model: recommendation.model, effort: recommendation.reasoningEffort };
  if (choice !== '2') return null;
  const model = await terminal.ask('Model identifier (or blank to cancel):');
  if (!model) return null;
  const effort = await terminal.ask('Reasoning effort (low, medium, high, xhigh, max, ultra):');
  if (!effort || !['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(effort)) {
    terminal.write('Choose a supported reasoning effort. No route changed.'); return null;
  }
  return { model, effort };
}

async function resetAll(terminal: ModelsTerminal, operations: ModelsOperations, listed: Extract<ListModelRoutesResult, { status: 'listed' }>): Promise<void> {
  terminal.write(`Reset all ${listed.routes.length} routes to current recommendations?`);
  terminal.write('Type RESET ALL to confirm, or press Enter to cancel.');
  const answer = await terminal.ask('Confirm:');
  if (answer !== 'RESET ALL') { terminal.write('No routes were changed.'); return; }
  reportReset(terminal, operations.reset({ type: 'models:reset', scope: 'all', confirmed: true,
    catalogVersion: listed.catalogVersion, stateBasis: listed.stateBasis }));
}

function reportReset(terminal: ModelsTerminal, result: ResetModelRoutesResult): void {
  terminal.write(`Completed: ${result.completed.length} route${result.completed.length === 1 ? '' : 's'}.`);
  for (const key of result.completed) terminal.write(`  ${roleLabel(key.role)} · ${workloadLabel(key.workloadClass)}`);
  if (result.status === 'completed') return;
  if (result.status === 'failed' || result.status === 'conflict') {
    terminal.write(`${result.status === 'conflict' ? 'Conflict' : 'Failed'}: ${result.failed ? `${roleLabel(result.failed.role)} · ${workloadLabel(result.failed.workloadClass)}` : 'state review'}.`);
    terminal.write(`Not attempted: ${result.notAttempted.length} route${result.notAttempted.length === 1 ? '' : 's'}.`);
    for (const key of result.notAttempted) terminal.write(`  ${roleLabel(key.role)} · ${workloadLabel(key.workloadClass)}`);
  }
  terminal.write(result.recovery);
}

function statusLabel(item: ModelRouteListItem): string {
  if (item.status === 'not-configured') return 'Not configured';
  return `${item.status === 'recommended' ? 'Recommended' : 'User selected'}${item.reviewNeeded ? ' · Review current recommendation' : ''}`;
}

function roleLabel(role: string): string { return role.split('-').map((part, index) => index ? part : part === 'github' ? 'GitHub' : part[0].toUpperCase() + part.slice(1)).join(' '); }
function workloadLabel(workload: string): string { return workload === 'high-risk' ? 'high-risk' : workload; }
function modelLabel(model: string): string { return model.replace(/^gpt-6-/, 'GPT-6 ').replace(/^(GPT-6 )([a-z])/, (_, prefix: string, first: string) => prefix + first.toUpperCase()); }
function parseChoice(value: string, count: number): number | null { const number = Number(value); return Number.isInteger(number) && number >= 1 && number <= count && String(number) === value ? number : null; }

function writeWrapped(terminal: ModelsTerminal, line: string): void {
  terminal.write(line);
}

function wrapLine(line: string, availableWidth: number): string[] {
  const width = Number.isFinite(availableWidth) ? Math.max(1, Math.floor(availableWidth)) : 80;
  if (!line || line.length <= width) return [line];
  const wrapped: string[] = [];
  const continuation = width > 6 ? '   ' : '';
  let current = (line.match(/^\s*/)?.[0] ?? '').slice(0, width - 1);
  for (const word of line.trim().split(/\s+/)) {
    if (current.trim() && current.length + word.length + 1 <= width) { current += ` ${word}`; continue; }
    if (!current.trim() && current.length + word.length <= width) { current += word; continue; }
    if (current.trim()) wrapped.push(current);
    current = continuation;
    let remaining = word;
    while (remaining.length > width - current.length) {
      const capacity = width - current.length;
      wrapped.push(current + remaining.slice(0, capacity));
      remaining = remaining.slice(capacity);
      current = continuation;
    }
    current += remaining;
  }
  if (current.trim()) wrapped.push(current);
  return wrapped;
}
