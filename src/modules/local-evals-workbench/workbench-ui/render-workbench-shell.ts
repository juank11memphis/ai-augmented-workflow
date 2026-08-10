import type { WorkbenchCellSummary, WorkbenchResultRow, WorkbenchResultVariant, WorkbenchViewModel } from './view-model.js';

export function renderWorkbenchShell(viewModel: WorkbenchViewModel, clientScript: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(viewModel.title)}</title>
  <style>${workbenchStyles()}</style>
</head>
<body>
  <main class="workbench" data-workbench-root>
    <header class="workbench__header">
      <p>${escapeHtml(viewModel.eyebrow)}</p>
      <h1>${escapeHtml(viewModel.title)}</h1>
    </header>
    ${renderControls(viewModel)}
    ${renderResults(viewModel)}
    ${renderSelectedCell(viewModel)}
  </main>
  <script type="application/json" id="sibu-workbench-state">${escapeJsonForHtml(viewModel.bootstrappedState)}</script>
  <script>${clientScript}</script>
</body>
</html>`;
}

export function renderWorkbenchControls(viewModel: WorkbenchViewModel): string {
  return renderControls(viewModel);
}

function renderControls(viewModel: WorkbenchViewModel): string {
  return `<section class="workbench__controls" aria-label="Eval suite controls">
    <label class="field">Eval Suite
      <select name="suiteId" data-control="suite" ${disabled(viewModel.controlsDisabled)}>${viewModel.suites.map((suite) => `<option value="${escapeAttribute(suite.id)}" ${optionSelected(suite.selected)}>${escapeHtml(suite.name)}</option>`).join('')}</select>
    </label>
    <div class="suite-summary">
      <div class="suite-summary__title-row"><h2 data-bind="suite-name">${escapeHtml(viewModel.selectedSuite.name)}</h2><strong data-bind="status-label">${escapeHtml(viewModel.statusLabel)}</strong></div>
      <p data-bind="suite-description">${escapeHtml(viewModel.selectedSuite.description)}</p>
      <p aria-live="polite" aria-atomic="true" data-live-status><span data-bind="status-message">${escapeHtml(viewModel.statusMessage)}</span> <span data-bind="progress-label">${escapeHtml(viewModel.progress.label)}</span>.</p>
    </div>
    <fieldset class="run-scope" aria-label="Run scope" ${fieldsetDisabled(viewModel.controlsDisabled)}>
      <legend>Run scope</legend>
      ${viewModel.runScopeOptions.map((option) => `<label><input type="radio" name="runScope" value="${option.type}" ${inputChecked(option.selected)} ${disabled(option.disabled)}> ${escapeHtml(option.label)}</label>`).join('')}
    </fieldset>
    <button type="button" data-control="run" ${disabled(viewModel.controlsDisabled)}>${escapeHtml(viewModel.runButtonLabel)}</button>
    <label class="field">Model
      <select name="evalRunModel" data-control="model" ${disabled(viewModel.controlsDisabled)}>${viewModel.modelOptions.map((model) => `<option value="${escapeAttribute(model.id)}" ${optionSelected(model.selected)}>${escapeHtml(model.label)}</option>`).join('')}</select>
    </label>
    <dl class="summary" aria-label="Run summary">
      <div><dt>Pass rate</dt><dd data-bind="pass-rate">${escapeHtml(viewModel.summary.passRateLabel)}</dd></div>
      <div><dt>Avg latency</dt><dd data-bind="avg-latency">${escapeHtml(viewModel.summary.averageLatencyLabel)}</dd></div>
      <div><dt>Cost</dt><dd data-bind="total-cost">${escapeHtml(viewModel.summary.totalCostLabel)}</dd></div>
      <div><dt>Progress</dt><dd data-bind="progress-label">${escapeHtml(viewModel.progress.label)}</dd></div>
    </dl>
    <div class="progress"><label for="eval-progress">Progress</label><progress id="eval-progress" max="100" value="${viewModel.progress.percent}" aria-label="Eval run progress" data-bind="progress">${viewModel.progress.percent}%</progress></div>
    ${renderResultFilters(viewModel)}
    ${renderDiagnostics(viewModel)}
  </section>`;
}

function renderResultFilters(viewModel: WorkbenchViewModel): string {
  const display = viewModel.resultDisplay;
  return `<section class="filters" aria-label="Result filters">
    <label><input type="checkbox" data-control="failures-only" ${inputChecked(display.filters.failuresOnly)}> Failures only</label>
    <label class="field">Search test cases
      <input type="search" data-control="search" placeholder="Search test cases..." value="${escapeAttribute(display.filters.searchQuery)}">
    </label>
    <fieldset class="variant-filter" aria-label="Visible models">
      <legend>Variant</legend>
      ${display.variants.length === 0 ? '<p>No result models yet.</p>' : display.variants.map(renderVariantToggle).join('')}
    </fieldset>
  </section>`;
}

function renderVariantToggle(variant: WorkbenchResultVariant): string {
  return `<label><input type="checkbox" data-control="variant" value="${escapeAttribute(variant.id)}" ${inputChecked(variant.selected)}> ${escapeHtml(variant.label)}</label>`;
}

function renderResults(viewModel: WorkbenchViewModel): string {
  if (viewModel.status === 'blocked') return `<section class="blocked" role="status"><h2>Blocked</h2><p>${escapeHtml(viewModel.statusMessage)}</p></section>`;
  const content = viewModel.resultDisplay.emptyMessage ? `<p class="empty-results">${escapeHtml(viewModel.resultDisplay.emptyMessage)}</p>` : `${renderPhoneCards(viewModel.resultDisplay.rows)}${renderDesktopMatrix(viewModel.resultDisplay.rows, viewModel.resultDisplay.visibleVariants)}`;
  return `<section class="results" aria-label="Eval results" data-results-region tabindex="-1">${content}</section>`;
}

function renderPhoneCards(rows: readonly WorkbenchResultRow[]): string {
  return `<div class="phone-cards" data-view="phone"><h2>Test Cases</h2>${rows.map((row) => `<article class="test-card"><header><h3>${escapeHtml(row.name)}</h3><code>${escapeHtml(row.testCaseId)}</code></header>${row.cells.map((cell) => renderCellButton(cell, 'phone')).join('')}</article>`).join('')}</div>`;
}

function renderDesktopMatrix(rows: readonly WorkbenchResultRow[], variants: readonly WorkbenchResultVariant[]): string {
  return `<div class="matrix-wrap" data-view="desktop"><table class="matrix"><caption>Eval result matrix</caption><thead><tr><th scope="col">Test Case</th>${variants.map((variant) => `<th scope="col">${escapeHtml(variant.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr><th scope="row"><span>${escapeHtml(row.name)}</span><code>${escapeHtml(row.testCaseId)}</code></th>${variants.map((variant) => `<td>${row.cells.find((cell) => cell.modelId === variant.id) ? renderCellButton(row.cells.find((cell) => cell.modelId === variant.id)!, 'desktop') : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderCellButton(cell: WorkbenchCellSummary, mode: 'phone' | 'desktop'): string {
  return `<button type="button" class="result-cell result-cell--${cell.status}" data-cell-button data-test-case-id="${escapeAttribute(cell.testCaseId)}" data-model-id="${escapeAttribute(cell.modelId)}" data-mode="${mode}" data-focus-key="${escapeAttribute(`${cell.testCaseId}:${cell.modelId}:${mode}`)}" aria-label="${escapeAttribute(cell.actionLabel)}">
    <span class="status"><span aria-hidden="true">${escapeHtml(cell.statusIcon)}</span> ${escapeHtml(cell.statusLabel)}</span>
    <span>${escapeHtml(cell.assertionSummary)}</span>
    <span>${escapeHtml(cell.modelLabel)}</span>
    <span>${escapeHtml(cell.metricsSummary)}</span>
    <span>${escapeHtml(cell.outputPreview)}</span>
    <span>${escapeHtml(cell.diagnosticsSummary)}</span>
  </button>`;
}

function renderSelectedCell(viewModel: WorkbenchViewModel): string {
  const cell = viewModel.resultDisplay.selectedCell;
  if (!cell) return '<div data-selected-cell></div>';
  return `<aside class="cell-dialog" role="dialog" aria-modal="true" aria-labelledby="cell-dialog-title" data-selected-cell>
    <div><h2 id="cell-dialog-title">Result detail</h2><button type="button" data-control="close-cell">Close</button></div>
    <p>${escapeHtml(cell.actionLabel)}</p>
  </aside>`;
}

function renderDiagnostics(viewModel: WorkbenchViewModel): string {
  if (viewModel.diagnostics.length === 0) return '';
  return `<ul class="diagnostics" aria-label="Diagnostics">${viewModel.diagnostics.map((diagnostic) => `<li>${escapeHtml(diagnostic.message)}</li>`).join('')}</ul>`;
}

function workbenchStyles(): string {
  return `body{margin:0;background:#020617;color:#f8fafc;font-family:Inter,system-ui,sans-serif}.workbench{max-width:86rem;margin:0 auto;padding:1rem}.workbench__header,.workbench__controls,.blocked,.test-card,.matrix th,.matrix td,.cell-dialog{border:1px solid #334155;background:#0f172a}.workbench__header,.workbench__controls,.blocked,.test-card,.cell-dialog{padding:1rem}.workbench__controls,.filters,.phone-cards,.results{display:flex;flex-direction:column;gap:1rem}.field{display:flex;flex-direction:column;gap:.4rem}.suite-summary__title-row{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.run-scope,.variant-filter{display:flex;gap:1rem;flex-wrap:wrap}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:.75rem}.summary div{border:1px solid #334155;padding:.75rem}.progress{display:flex;flex-direction:column;gap:.4rem}.filters{border-top:1px solid #334155;padding-top:1rem}select,button,input[type=search]{min-height:44px;border:1px solid #475569;background:#020617;color:#f8fafc;padding:.5rem}button{background:#2563eb;border-color:#60a5fa;font-weight:700}button:disabled,select:disabled,input:disabled{opacity:.55;cursor:not-allowed}.result-cell{display:grid;width:100%;gap:.25rem;text-align:left;background:#020617}.result-cell--passed{border-color:#34d399}.result-cell--failed{border-color:#fb7185}.result-cell--blocked{border-color:#fbbf24}.result-cell--error{border-color:#f87171}.status{font-weight:800}.matrix-wrap{display:none;overflow:auto}.matrix{width:100%;border-collapse:collapse}.matrix caption{text-align:left;font-weight:800;margin:.75rem 0}.matrix th,.matrix td{padding:.75rem;vertical-align:top}.matrix code,.test-card code{display:block;color:#cbd5e1}.cell-dialog{position:fixed;inset:auto 0 0;max-height:80vh;overflow:auto;box-shadow:0 -20px 60px #0008}.cell-dialog>div{display:flex;align-items:center;justify-content:space-between;gap:1rem}:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}@media (min-width:768px){.workbench__controls{display:grid;grid-template-columns:16rem 1fr auto;align-items:end}.suite-summary,.summary,.progress,.filters,.diagnostics{grid-column:1/-1}.cell-dialog{inset:0 0 0 auto;width:min(28rem,45vw)}}@media (min-width:1024px){.workbench{display:grid;grid-template-columns:16rem 1fr;gap:1rem}.workbench__header{grid-column:1/-1}.workbench__controls,.results{grid-column:2}.phone-cards{display:none}.matrix-wrap{display:block}}`;
}

function disabled(isDisabled: boolean): string {
  return isDisabled ? 'disabled aria-disabled="true"' : '';
}

function fieldsetDisabled(isDisabled: boolean): string {
  return isDisabled ? 'disabled' : '';
}

function optionSelected(isSelected: boolean): string {
  return isSelected ? 'selected' : '';
}

function inputChecked(isSelected: boolean): string {
  return isSelected ? 'checked' : '';
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&]/g, (character) => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026' }[character] ?? character));
}
