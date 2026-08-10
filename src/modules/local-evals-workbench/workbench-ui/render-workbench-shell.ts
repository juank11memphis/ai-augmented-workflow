import type { WorkbenchViewModel } from './view-model.js';

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
  <main class="workbench workbench--compact" data-workbench-root>
    <header class="workbench__header">
      <p>${escapeHtml(viewModel.eyebrow)}</p>
      <h1>${escapeHtml(viewModel.title)}</h1>
    </header>
    ${renderControls(viewModel)}
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
    ${renderDiagnostics(viewModel)}
  </section>`;
}

function renderDiagnostics(viewModel: WorkbenchViewModel): string {
  if (viewModel.diagnostics.length === 0) return '';
  return `<ul class="diagnostics" aria-label="Diagnostics">${viewModel.diagnostics.map((diagnostic) => `<li>${escapeHtml(diagnostic.message)}</li>`).join('')}</ul>`;
}

function workbenchStyles(): string {
  return 'body{margin:0;background:#020617;color:#f8fafc;font-family:Inter,system-ui,sans-serif}.workbench{max-width:72rem;margin:0 auto;padding:1rem}.workbench__header,.workbench__controls{border:1px solid #334155;background:#0f172a;padding:1rem}.workbench__controls{display:flex;flex-direction:column;gap:1rem}.field{display:flex;flex-direction:column;gap:.4rem}.suite-summary__title-row{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.run-scope{display:flex;gap:1rem;flex-wrap:wrap}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:.75rem}.summary div{border:1px solid #334155;padding:.75rem}.progress{display:flex;flex-direction:column;gap:.4rem}select,button{min-height:44px;border:1px solid #475569;background:#020617;color:#f8fafc;padding:.5rem}button{background:#2563eb;border-color:#60a5fa;font-weight:700}button:disabled,select:disabled,input:disabled{opacity:.55;cursor:not-allowed}@media (min-width:768px){.workbench--compact{padding:1.25rem}.workbench__controls{display:grid;grid-template-columns:16rem 1fr auto;align-items:end}.suite-summary,.summary,.progress,.diagnostics{grid-column:1/-1}}@media (min-width:1024px){.workbench--compact{display:grid;grid-template-columns:16rem 1fr;gap:1rem}.workbench__header{grid-column:1/-1}}';
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
