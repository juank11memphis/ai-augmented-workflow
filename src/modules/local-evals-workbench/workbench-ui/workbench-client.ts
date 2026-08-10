export const WORKBENCH_CLIENT_SCRIPT = `(() => {
  const root = document.querySelector('[data-workbench-root]');
  const stateNode = document.getElementById('sibu-workbench-state');
  if (!root || !stateNode) return;
  let state = JSON.parse(stateNode.textContent || '{}');
  let latestRun = null;
  let filters = { failuresOnly: false, searchQuery: '', visibleVariantIds: [] };
  let selectedCell = null;
  let focusRestoreKey = null;

  const control = (name) => root.querySelector('[data-control="' + name + '"]');
  const bind = (name) => root.querySelectorAll('[data-bind="' + name + '"]');
  const selectedSuite = () => (state.discovery.suites || []).find((suite) => suite.id === state.selectedSuiteId) || (state.discovery.suites || [])[0];
  const matrix = () => latestRun?.matrix && latestRun.matrix.suiteId === state.selectedSuiteId ? latestRun.matrix : null;
  const h = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const keyFor = (selection, mode) => selection.testCaseId + ':' + selection.modelId + ':' + mode;

  function renderReady() {
    const suite = selectedSuite();
    if (!suite) return;
    state = { ...state, selectedSuiteId: suite.id, runScope: state.runScope || { type: 'all' } };
    const models = suite.modelOptions || [];
    if (!models.some((model) => model.id === state.selectedEvalRunModel)) state.selectedEvalRunModel = models[0]?.id || 'gpt-5-mini';
    setText('suite-name', suite.name);
    setText('suite-description', suite.description);
    setText('status-label', state.discovery.status === 'blocked' ? 'Blocked' : 'Ready');
    setText('status-message', state.discovery.status === 'blocked' ? state.discovery.message : suite.readyTestCaseCount + ' test case' + (suite.readyTestCaseCount === 1 ? '' : 's') + ' ready.');
    setText('progress-label', '0/' + suite.readyTestCaseCount + ' complete');
    setText('pass-rate', '—');
    setText('avg-latency', '—');
    setText('total-cost', '$0.0000');
    setProgress(0);
    renderModelOptions(models);
    renderRunButton(false);
    renderResults();
  }

  function renderModelOptions(models) {
    const model = control('model');
    if (!model) return;
    model.textContent = '';
    for (const option of models) model.add(new Option(option.label, option.id, option.id === state.selectedEvalRunModel, option.id === state.selectedEvalRunModel));
  }

  function renderRunButton(disabled) {
    const run = control('run');
    if (!run) return;
    run.textContent = disabled ? 'Running...' : state.runScope?.type === 'test_case' ? 'Run 1 test case' : 'Run all ' + (selectedSuite()?.readyTestCaseCount || 0) + ' test cases';
    setDisabled(disabled);
  }

  function renderRunning() {
    selectedCell = null;
    focusRestoreKey = null;
    renderSelectedCell();
    renderRunButton(true);
    setText('status-label', 'Running...');
    setText('status-message', 'Running local evals. Controls are disabled until this run finishes.');
    setText('progress-label', '0/' + (selectedSuite()?.readyTestCaseCount || 0) + ' complete');
    setProgress(0);
  }

  function renderRunResult(payload) {
    latestRun = payload;
    const currentMatrix = matrix();
    const status = payload?.status === 'completed' ? currentMatrix?.status : payload?.status;
    normalizeVisibleVariants();
    selectedCell = null;
    setText('status-label', statusLabel(status));
    setText('status-message', payload?.message || statusMessage(status));
    if (currentMatrix?.aggregates) {
      const total = currentMatrix.aggregates.total || 0;
      const passed = currentMatrix.aggregates.passed || 0;
      setText('pass-rate', total > 0 ? Math.round((passed / total) * 100) + '%' : '0%');
      setText('progress-label', total + '/' + total + ' complete');
      setProgress(total > 0 ? 100 : 0);
      setText('avg-latency', averageLatency(currentMatrix));
      setText('total-cost', totalCost(currentMatrix));
    }
    setDisabled(false);
    renderRunButton(false);
    renderFilters();
    renderResults();
    renderSelectedCell();
  }

  function renderFilters() {
    const failuresOnly = control('failures-only');
    const search = control('search');
    if (failuresOnly) failuresOnly.checked = filters.failuresOnly;
    if (search) search.value = filters.searchQuery;
    root.querySelectorAll('[data-control="variant"]').forEach((input) => { input.checked = filters.visibleVariantIds.includes(input.value); });
  }

  function renderResults() {
    const region = root.querySelector('[data-results-region]');
    if (!region) return;
    const currentMatrix = matrix();
    if (!currentMatrix) { region.innerHTML = '<p class="empty-results">Run evals to see result cards and the matrix.</p>'; return; }
    const rows = filteredRows(currentMatrix);
    const variants = visibleVariants(currentMatrix);
    if (rows.length === 0) { region.innerHTML = '<p class="empty-results">' + emptyMessage() + '</p>'; return; }
    region.innerHTML = phoneCards(rows) + desktopMatrix(rows, variants);
  }

  function phoneCards(rows) {
    return '<div class="phone-cards" data-view="phone"><h2>Test Cases</h2>' + rows.map((row) => '<article class="test-card"><header><h3>' + h(row.name) + '</h3><code>' + h(row.testCaseId) + '</code></header>' + visibleCells(row).map((cell) => cellButton(cell, 'phone')).join('') + '</article>').join('') + '</div>';
  }

  function desktopMatrix(rows, variants) {
    return '<div class="matrix-wrap" data-view="desktop"><table class="matrix"><caption>Eval result matrix</caption><thead><tr><th scope="col">Test Case</th>' + variants.map((variant) => '<th scope="col">' + h(variant.label) + '</th>').join('') + '</tr></thead><tbody>' + rows.map((row) => '<tr><th scope="row"><span>' + h(row.name) + '</span><code>' + h(row.testCaseId) + '</code></th>' + variants.map((variant) => '<td>' + (row.cells || []).filter((cell) => cell.modelId === variant.id).map((cell) => cellButton(cell, 'desktop')).join('') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }

  function cellButton(cell, mode) {
    const label = 'Open ' + cell.modelLabel + ' ' + statusLabel(cell.status) + ' result for test case ' + cell.testCaseId;
    return '<button type="button" class="result-cell result-cell--' + h(cell.status) + '" data-cell-button data-test-case-id="' + h(cell.testCaseId) + '" data-model-id="' + h(cell.modelId) + '" data-mode="' + mode + '" data-focus-key="' + h(keyFor({ testCaseId: cell.testCaseId, modelId: cell.modelId }, mode)) + '" aria-label="' + h(label) + '"><span class="status"><span aria-hidden="true">' + h(statusIcon(cell.status)) + '</span> ' + h(statusLabel(cell.status)) + '</span><span>' + h(assertionSummary(cell)) + '</span><span>' + h(cell.modelLabel) + '</span><span>' + h(metricsSummary(cell)) + '</span><span>' + h(cell.outputPreview || 'Output will appear here.') + '</span><span>' + h((cell.diagnostics || [])[0]?.message || 'No diagnostics.') + '</span></button>';
  }

  function renderSelectedCell() {
    const slot = root.querySelector('[data-selected-cell]');
    if (!slot) return;
    if (!selectedCell) { slot.outerHTML = '<div data-selected-cell></div>'; restoreFocus(); return; }
    const cell = findCell(selectedCell);
    if (!cell) { selectedCell = null; slot.outerHTML = '<div data-selected-cell></div>'; restoreFocus(); return; }
    slot.outerHTML = '<aside class="cell-dialog" role="dialog" aria-modal="true" aria-labelledby="cell-dialog-title" data-selected-cell><div><h2 id="cell-dialog-title">Result detail</h2><button type="button" data-control="close-cell">Close</button></div><p>' + h('Open ' + cell.modelLabel + ' ' + statusLabel(cell.status) + ' result for test case ' + cell.testCaseId) + '</p></aside>';
    root.querySelector('[data-control="close-cell"]')?.focus();
  }

  function filteredRows(currentMatrix) {
    const query = filters.searchQuery.trim().toLowerCase();
    return (currentMatrix.rows || []).filter((row) => (!query || (row.name + ' ' + row.testCaseId).toLowerCase().includes(query)) && visibleCells(row).length > 0 && (!filters.failuresOnly || visibleCells(row).some((cell) => cell.status === 'failed')));
  }
  function visibleCells(row) { return (row.cells || []).filter((cell) => filters.visibleVariantIds.includes(cell.modelId)); }
  function variants(currentMatrix) { const map = new Map(); for (const row of currentMatrix.rows || []) for (const cell of row.cells || []) map.set(cell.modelId, { id: cell.modelId, label: cell.modelLabel }); return [...map.values()]; }
  function visibleVariants(currentMatrix) { return variants(currentMatrix).filter((variant) => filters.visibleVariantIds.includes(variant.id)); }
  function normalizeVisibleVariants() { const ids = matrix() ? variants(matrix()).map((variant) => variant.id) : []; filters.visibleVariantIds = filters.visibleVariantIds.filter((id) => ids.includes(id)); if (filters.visibleVariantIds.length === 0) filters.visibleVariantIds = ids.slice(0, 1); }
  function findCell(selection) { return (matrix()?.rows || []).find((row) => row.testCaseId === selection.testCaseId)?.cells?.find((cell) => cell.modelId === selection.modelId); }

  function navigate(current, direction, mode) {
    const rows = filteredRows(matrix()).map((row) => visibleCells(row).map((cell) => ({ testCaseId: row.testCaseId, modelId: cell.modelId })));
    const grid = mode === 'phone' ? rows.flatMap((row) => row.map((cell) => [cell])) : rows;
    let position = null;
    grid.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => { if (cell.testCaseId === current.testCaseId && cell.modelId === current.modelId) position = { row: rowIndex, column: columnIndex }; }));
    if (!position) return null;
    const next = mode === 'phone' ? { row: position.row + (direction === 'down' || direction === 'right' ? 1 : -1), column: 0 } : { row: position.row + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0), column: position.column + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0) };
    return grid[next.row]?.[next.column] || null;
  }

  function restoreFocus() {
    if (!focusRestoreKey) return;
    const escaped = window.CSS?.escape ? CSS.escape(focusRestoreKey) : focusRestoreKey.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    requestAnimationFrame(() => root.querySelector('[data-focus-key="' + escaped + '"]')?.focus() || root.querySelector('[data-results-region]')?.focus());
  }

  function focusCell(selection, mode) {
    [...root.querySelectorAll('[data-cell-button]')].find((button) => button.dataset.testCaseId === selection.testCaseId && button.dataset.modelId === selection.modelId && button.dataset.mode === mode)?.focus();
  }

  function statusLabel(status) { return ({ passed: 'Passed', failed: 'Failed', blocked: 'Blocked', error: 'Could not run' })[status] || 'Could not run'; }
  function statusMessage(status) { return ({ passed: 'All completed eval results passed.', failed: 'One or more eval results failed.', blocked: 'Add local config, then run the eval again.', error: 'The eval did not finish.' })[status] || 'The eval did not finish.'; }
  function statusIcon(status) { return ({ passed: '✓', failed: '!', blocked: '◇', error: '×' })[status] || '!'; }
  function assertionSummary(cell) { const total = (cell.assertions || []).length; const failed = (cell.assertions || []).filter((item) => item.status === 'failed').length; const passed = (cell.assertions || []).filter((item) => item.status === 'passed').length; return total ? (failed ? failed + ' failed / ' + total : passed + ' passed / ' + total) : 'No assertion details reported.'; }
  function metricsSummary(cell) { const token = (cell.metrics || []).find((metric) => metric.name.includes('token')); const cost = (cell.metrics || []).find((metric) => ['cost', 'total_cost', 'usd_cost'].includes(metric.name) || metric.unit === 'usd'); const parts = [cell.durationMs == null ? null : Math.round(cell.durationMs) + ' ms', token ? Math.round(token.value).toLocaleString('en-US') + ' tokens' : null, cost ? '$' + cost.value.toFixed(4) : null].filter(Boolean); return parts.length ? parts.join(' · ') : 'Metrics unavailable'; }
  function averageLatency(currentMatrix) { const values = (currentMatrix.rows || []).flatMap((row) => row.cells || []).map((cell) => cell.durationMs).filter((value) => typeof value === 'number'); return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) + ' ms' : '—'; }
  function totalCost(currentMatrix) { const total = (currentMatrix.rows || []).flatMap((row) => row.cells || []).flatMap((cell) => cell.metrics || []).filter((metric) => ['cost', 'total_cost', 'usd_cost'].includes(metric.name) || metric.unit === 'usd').reduce((sum, metric) => sum + metric.value, 0); return '$' + total.toFixed(4); }
  function emptyMessage() { return filters.failuresOnly ? 'No failed results are visible.' : filters.searchQuery ? 'No test cases match this search.' : 'No results are visible with the selected models.'; }
  function selectedScope() { const checked = root.querySelector('input[name="runScope"]:checked'); return checked?.value === 'test_case' ? { type: 'test_case', testCaseId: state.runScope?.testCaseId || '' } : { type: 'all' }; }
  function setText(name, value) { for (const node of bind(name)) node.textContent = value; }
  function setProgress(percent) { for (const progress of bind('progress')) progress.value = percent; }
  function setDisabled(value) { for (const element of root.querySelectorAll('select,input,button')) { if (value) element.setAttribute('disabled', ''); else element.removeAttribute('disabled'); } }

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('[data-control="suite"]')) { latestRun = null; filters = { failuresOnly: false, searchQuery: '', visibleVariantIds: [] }; selectedCell = null; state = { ...state, selectedSuiteId: target.value, runScope: { type: 'all' } }; renderReady(); }
    if (target.matches('[data-control="model"]')) state = { ...state, selectedEvalRunModel: target.value };
    if (target.matches('input[name="runScope"]')) { state = { ...state, runScope: selectedScope() }; renderRunButton(false); }
    if (target.matches('[data-control="failures-only"]')) { filters.failuresOnly = target.checked; selectedCell = null; renderResults(); renderSelectedCell(); }
    if (target.matches('[data-control="variant"]')) { const checked = [...root.querySelectorAll('[data-control="variant"]:checked')].map((input) => input.value); filters.visibleVariantIds = checked.length ? checked : filters.visibleVariantIds.slice(0, 1); selectedCell = null; renderFilters(); renderResults(); renderSelectedCell(); }
  });
  root.addEventListener('input', (event) => { if (event.target.matches('[data-control="search"]')) { filters.searchQuery = event.target.value; selectedCell = null; renderResults(); renderSelectedCell(); } });
  root.addEventListener('click', async (event) => {
    const cellButton = event.target.closest('[data-cell-button]');
    if (cellButton) { selectedCell = { testCaseId: cellButton.dataset.testCaseId, modelId: cellButton.dataset.modelId }; focusRestoreKey = keyFor(selectedCell, cellButton.dataset.mode); cellButton.dataset.focusKey = focusRestoreKey; renderSelectedCell(); return; }
    if (event.target.matches('[data-control="close-cell"]')) { selectedCell = null; renderSelectedCell(); return; }
    if (!event.target.matches('[data-control="run"]')) return;
    renderRunning();
    try {
      const response = await fetch('/api/eval-runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suiteId: state.selectedSuiteId, evalRunModel: state.selectedEvalRunModel, scope: selectedScope() }) });
      renderRunResult(await response.json());
    } catch { renderRunResult({ status: 'error', message: 'The eval could not finish. Try again after checking local setup.' }); }
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selectedCell) { selectedCell = null; renderSelectedCell(); return; }
    const cellButton = event.target.closest?.('[data-cell-button]');
    if (!cellButton || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const direction = event.key.replace('Arrow', '').toLowerCase();
    const next = navigate({ testCaseId: cellButton.dataset.testCaseId, modelId: cellButton.dataset.modelId }, direction, cellButton.dataset.mode);
    if (!next) return;
    event.preventDefault();
    focusCell(next, cellButton.dataset.mode);
  });
})();`;
