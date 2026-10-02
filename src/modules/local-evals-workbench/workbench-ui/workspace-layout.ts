import type { EvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/result.js';
import { escapeHtml } from './render-workbench-shell.js';
import { createWorkspaceViewModel } from './workspace-view-model.js';
import { renderWorkspaceResults } from './workspace-results.js';
import { WORKSPACE_STYLES } from './workspace-styles.js';
import { WORKSPACE_CLIENT_SCRIPT } from './workspace-client.js';

const jsonForHtml = (value: unknown): string => JSON.stringify(value).replace(/[<>&]/g, char => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026' })[char] ?? char);

export function renderWorkspaceShell(discovery: EvalSuiteDiscoveryResult): string {
  const model = createWorkspaceViewModel({ discovery });
  const options = discovery.suites.map(suite => `<option value="${escapeHtml(suite.id)}">${escapeHtml(suite.name)}</option>`).join('');
  const rail = discovery.suites.map(suite => `<button type="button" data-action="suite" data-suite-id="${escapeHtml(suite.id)}" ${suite.id === model.suite?.id ? 'aria-current="page"' : ''}>${escapeHtml(suite.name)}</button>`).join('');
  const notice = model.discoveryNotice;
  const entryNotice = notice ? `<div data-discovery-notice style="flex-basis:100%"><h3 tabindex="-1">${escapeHtml(notice.title)}</h3><p data-discovery-guidance>${escapeHtml(notice.explanation)} ${escapeHtml(notice.nextStep)}</p><span data-discovery-announcement role="status" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></span><p data-issue-details hidden></p><button type="button" data-action="copy-issue" hidden>Copy issue details</button><p data-issue-copy-status role="status"></p></div>` : '<div data-discovery-notice style="flex-basis:100%" hidden></div>';
  // Diagnostics and raw discovery messages are not needed by the browser workspace.
  const browserDiscovery = { status: discovery.status, reason: discovery.status === 'blocked' ? discovery.reason : undefined, suites: discovery.suites };
  const results = !model.suite && discovery.status === 'blocked' && discovery.reason === 'unreadable-eval-suites'
    ? '<section class="empty" aria-labelledby="results-title"><h2 id="results-title">Results</h2><p>Results are unavailable until suites can be read.</p></section>'
    : renderWorkspaceResults(model);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sibu Evals</title><style>${WORKSPACE_STYLES}</style></head><body>
  <header class="app-header"><div class="app-header__row"><h1>Sibu Evals</h1><nav aria-label="Workspace panels"><button type="button" data-action="coverage" ${model.suite ? '' : 'hidden'}>Coverage</button><button type="button" data-action="history" ${model.suite ? '' : 'hidden'}>History</button></nav></div><label class="suite-picker">Eval Suite<select data-action="suite-select" aria-label="Eval Suite">${options}</select></label></header>
  <main class="workspace" data-workspace><aside class="suite-rail" aria-label="Eval suites"><h2>Eval suites</h2>${rail}</aside><section class="context" aria-labelledby="suite-title"><h2 id="suite-title" data-suite-title>${escapeHtml(model.suite?.name ?? 'No eval suites yet')}</h2><p data-suite-description>${escapeHtml(model.suite?.description ?? '')}</p>${entryNotice}<p data-latest-label>Latest run · none</p><p data-status-summary tabindex="-1">${escapeHtml(model.statusText)}</p><p class="live" aria-live="polite" aria-atomic="true" data-progress>${escapeHtml(model.progress)}</p><p data-run-metrics></p></section>
  <section class="context" data-run-setup ${model.suite ? '' : 'hidden'} aria-labelledby="run-setup-title"><h2 id="run-setup-title">New run</h2><div data-setup-fields></div><button class="primary" type="button" data-action="review">Review run</button><div class="model-notice" data-preview-notice hidden><h3 tabindex="-1" data-preview-heading></h3><p data-preview-guidance></p><pre data-preview-details hidden></pre><button type="button" data-action="copy-preview-issue" hidden>Copy issue details</button><p role="status" data-preview-copy-status></p></div><p role="status" data-setup-status></p></section>
  <div data-results-container>${results}</div><aside class="detail" aria-label="Selected result" data-detail><h2>Result detail</h2><p>Select a completed case to inspect it.</p></aside><aside class="side-panel" data-side-panel hidden></aside></main><div data-sheet-slot></div>
  <script type="application/json" id="sibu-workspace-state">${jsonForHtml(browserDiscovery)}</script><script>${WORKSPACE_CLIENT_SCRIPT}</script></body></html>`;
}
