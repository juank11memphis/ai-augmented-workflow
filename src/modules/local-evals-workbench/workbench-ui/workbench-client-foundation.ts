export const WORKBENCH_CLIENT_FOUNDATION_SECTION = {
  name: 'foundation',
  source: String.raw`  function filteredRows(currentMatrix) {
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

  function trapDrawerFocus(event) {
    const dialog = root.querySelector('.cell-dialog');
    if (!dialog) return;
    const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),details summary,[tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return; }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function restoreFocus() {
    if (!focusRestoreKey) return;
    const escaped = window.CSS?.escape ? CSS.escape(focusRestoreKey) : focusRestoreKey.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    requestAnimationFrame(() => root.querySelector('[data-focus-key="' + escaped + '"]')?.focus() || root.querySelector('[data-results-region]')?.focus());
  }

  function focusCell(selection, mode) {
    [...root.querySelectorAll('[data-cell-button]')].find((button) => button.dataset.testCaseId === selection.testCaseId && button.dataset.modelId === selection.modelId && button.dataset.mode === mode)?.focus();
  }

  function statusLabel(status) { return ({ passed: 'Passed', failed: 'Failed', blocked: 'Blocked', error: 'Could not run', running: 'Running...', 'not-run': 'Not run' })[status] || 'Could not run'; }
  function statusMessage(status) { return ({ passed: 'All completed eval results passed.', failed: 'One or more eval results failed.', blocked: 'Add local config, then run the eval again.', error: 'The eval did not finish.', running: 'Running local evals. Controls are disabled until this run finishes.', 'not-run': 'Output will appear after running the eval.' })[status] || 'The eval did not finish.'; }
  function statusIcon(status) { return ({ passed: '✓', failed: '!', blocked: '◇', error: '×', running: '…', 'not-run': '○' })[status] || '!'; }
  function assertionSummary(cell) { const total = (cell.assertions || []).length; const failed = (cell.assertions || []).filter((item) => item.status === 'failed').length; const passed = (cell.assertions || []).filter((item) => item.status === 'passed').length; return total ? (failed ? failed + ' failed / ' + total : passed + ' passed / ' + total) : 'No assertion details reported.'; }
  function metricItems(cell) { const duration = cell.durationMs == null ? [] : [{ label: 'Duration', value: Math.round(cell.durationMs) + ' ms' }]; return duration.concat((cell.metrics || []).map((metric) => ({ label: metric.name, value: String(metric.value) + (metric.unit ? ' ' + metric.unit : '') }))); }
  function metricsSummary(cell) { const token = (cell.metrics || []).find((metric) => metric.name.includes('token')); const cost = (cell.metrics || []).find((metric) => ['cost', 'total_cost', 'usd_cost'].includes(metric.name) || metric.unit === 'usd'); const parts = [cell.durationMs == null ? null : Math.round(cell.durationMs) + ' ms', token ? Math.round(token.value).toLocaleString('en-US') + ' tokens' : null, cost ? '$' + cost.value.toFixed(4) : null].filter(Boolean); return parts.length ? parts.join(' · ') : 'Metrics unavailable'; }
  function averageLatency(currentMatrix) { const values = (currentMatrix.rows || []).flatMap((row) => row.cells || []).map((cell) => cell.durationMs).filter((value) => typeof value === 'number'); return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) + ' ms' : '—'; }
  function totalCost(currentMatrix) { const total = (currentMatrix.rows || []).flatMap((row) => row.cells || []).flatMap((cell) => cell.metrics || []).filter((metric) => ['cost', 'total_cost', 'usd_cost'].includes(metric.name) || metric.unit === 'usd').reduce((sum, metric) => sum + metric.value, 0); return '$' + total.toFixed(4); }
  function emptyMessage() { return filters.failuresOnly ? 'No failed results are visible.' : filters.searchQuery ? 'No test cases match this search.' : 'No results are visible with the selected models.'; }
  function selectedScope() { const checked = root.querySelector('input[name="runScope"]:checked'); return checked?.value === 'test_case' ? { type: 'test_case', testCaseId: state.runScope?.testCaseId || '' } : { type: 'all' }; }
  function setText(name, value) { for (const node of bind(name)) node.textContent = value; }
  function setProgress(percent) { for (const progress of bind('progress')) progress.value = percent; }
  function setDisabled(value) { for (const element of root.querySelectorAll('select,input,button')) { if (value) element.setAttribute('disabled', ''); else element.removeAttribute('disabled'); } }`,
} as const;
