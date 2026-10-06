import type { WorkspaceViewModel } from './workspace-view-model.js';
import { escapeHtml } from './render-workbench-shell.js';

export function renderWorkspaceResults(model: WorkspaceViewModel): string {
  if (!model.suite) return `<section class="empty" aria-labelledby="empty-title"><h2 id="empty-title">No eval suites yet</h2><p>Ask your coding agent:</p><blockquote>Create production-ready Sibu evals for this project.</blockquote><button type="button" data-action="copy-prompt">Copy prompt</button><p data-copy-status role="status"></p></section>`;
  return `<section class="results" aria-labelledby="results-title"><div class="section-heading"><h2 id="results-title">Results <small>${model.cases.length}</small></h2><label><input type="checkbox" data-action="failures-only"> Failures only</label><label class="search">Search <input type="search" data-action="search" aria-label="Search cases"></label></div>
    <div class="result-head" aria-hidden="true"><span>Case</span><span>Result</span><span>Attempts</span></div><p data-result-empty ${model.cases.length ? 'hidden' : ''}>No results yet.</p><ul class="result-list" data-result-list>${model.cases.map(item => `<li data-case-id="${escapeHtml(item.id)}" data-case-status="${item.status}"><button type="button" data-action="case" data-case-id="${escapeHtml(item.id)}" ${item.attempts ? '' : 'disabled'}><span class="result-icon" aria-hidden="true">${item.status === 'passed' ? '✓' : item.status === 'failed' ? '✕' : '–'}</span><span class="result-name"><strong>${escapeHtml(item.name)}</strong></span><span class="result-status"><span class="result-label">Result: </span>${escapeHtml(item.status.replaceAll('-', ' '))}</span><span class="result-attempts"><span class="result-label">Attempts: </span>${item.attempts}${item.failedChecks ? ` · ${item.failedChecks} failed` : ''}</span>${item.attempts ? '<span class="result-open" aria-hidden="true">›</span>' : ''}</button></li>`).join('')}</ul></section>`;
}

export function renderWorkspaceCoverage(model: WorkspaceViewModel): string {
  const coverage = model.suite?.coverage;
  if (!coverage) return '<p>Coverage is unavailable for this suite.</p>';
  const gaps = coverage.gaps.map(gap => `<li><strong>${escapeHtml(gap.id)}</strong><p>${escapeHtml(gap.reason)}</p></li>`).join('');
  const categories = coverage.categories.map(category => `<li><strong>${escapeHtml(category.id)}</strong> — ${escapeHtml(category.status.replaceAll('-', ' '))}${category.reason ? `<p>${escapeHtml(category.reason)}</p>` : ''}</li>`).join('');
  return `<section><h3>Known gaps</h3>${gaps ? `<ul>${gaps}</ul>` : '<p>No known gaps documented.</p>'}<h3>Coverage categories</h3><ul>${categories}</ul></section>`;
}
