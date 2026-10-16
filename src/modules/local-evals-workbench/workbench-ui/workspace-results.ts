import type { WorkspaceViewModel } from './workspace-view-model.js';
import { escapeHtml } from './render-workbench-shell.js';

export function renderWorkspaceResults(model: WorkspaceViewModel): string {
  if (!model.suite) return `<section class="empty" aria-labelledby="empty-title"><h2 id="empty-title">No eval suites yet</h2><p>Ask your coding agent:</p><blockquote>Create production-ready Sibu evals for this project.</blockquote><button type="button" data-action="copy-prompt">Copy prompt</button><p data-copy-status role="status"></p></section>`;
  return `<section class="results" aria-labelledby="results-title"><div class="section-heading"><h2 id="results-title">Results <small>${model.results.length}</small></h2><label><input type="checkbox" data-action="failures-only"> Failures only</label><label class="search">Search <input type="search" data-action="search" aria-label="Search cases"></label></div>
    <div class="result-head" aria-hidden="true"><span>Case</span><span>Status</span><span>Model</span><span>Judge</span><span>Action</span></div><p data-result-empty ${model.results.length ? 'hidden' : ''}>${model.unfinished ? `${model.unfinished} not finished. ` : ''}No completed results yet.</p><ul class="result-list" data-result-list>${model.results.map(item => `<li data-case-status="${item.status}"><button type="button" data-action="case" data-case-id="${escapeHtml(item.detail.caseId)}" data-attempt="${item.detail.attempt}"><span class="result-name"><strong>${escapeHtml(item.name)}</strong></span><span class="result-status"><span class="result-label">Status: </span>${item.status === 'passed' ? 'Pass' : 'Fail'}</span><span class="result-model"><span class="result-label">Model: </span>${escapeHtml(item.model)}</span><span class="result-judge">${item.judgeModel ? `<span class="result-label">Judge model: </span>${escapeHtml(item.judgeModel)}` : ''}</span><span class="result-action">View result</span></button></li>`).join('')}</ul></section>`;
}

export function renderWorkspaceCoverage(model: WorkspaceViewModel): string {
  const coverage = model.suite?.coverage;
  if (!coverage) return '<p>Coverage is unavailable for this suite.</p>';
  const gaps = coverage.gaps.map(gap => `<li><strong>${escapeHtml(gap.id)}</strong><p>${escapeHtml(gap.reason)}</p></li>`).join('');
  const categories = coverage.categories.map(category => `<li><strong>${escapeHtml(category.id)}</strong> — ${escapeHtml(category.status.replaceAll('-', ' '))}${category.reason ? `<p>${escapeHtml(category.reason)}</p>` : ''}</li>`).join('');
  return `<section><h3>Known gaps</h3>${gaps ? `<ul>${gaps}</ul>` : '<p>No known gaps documented.</p>'}<h3>Coverage categories</h3><ul>${categories}</ul></section>`;
}
