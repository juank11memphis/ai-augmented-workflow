export const WORKBENCH_CLIENT_EVENTS_SECTION = {
  name: 'events',
  source: String.raw`  root.addEventListener('change', (event) => {
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
    if (event.target.matches('[data-control="close-cell"]') || event.target.matches('[data-cell-overlay]')) { selectedCell = null; renderSelectedCell(); return; }
    if (event.target.matches('[data-control="retry-cell"]')) { const cell = selectedCell; const scope = cell ? { type: 'test_case', testCaseId: cell.testCaseId } : selectedScope(); state = { ...state, selectedEvalRunModel: cell?.modelId || state.selectedEvalRunModel, runScope: scope }; selectedCell = null; renderSelectedCell(); await runEval(scope); return; }
    if (!event.target.matches('[data-control="run"]') && !event.target.matches('[data-control="retry-run"]')) return;
    await runEval();
  });

  async function runEval(scopeOverride) {
    const scope = scopeOverride || selectedScope();
    renderRunning();
    try {
      const response = await fetch('/api/eval-runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suiteId: state.selectedSuiteId, evalRunModel: state.selectedEvalRunModel, scope }) });
      renderRunResult(await response.json());
    } catch { renderRunResult({ status: 'error', message: 'The eval could not finish. Try again after checking local setup.' }); }
  }
  root.addEventListener('keydown', (event) => {
    if (selectedCell && event.key === 'Escape') { event.preventDefault(); selectedCell = null; renderSelectedCell(); return; }
    if (selectedCell && event.key === 'Tab') { trapDrawerFocus(event); return; }
    const cellButton = event.target.closest?.('[data-cell-button]');
    if (!cellButton || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const direction = event.key.replace('Arrow', '').toLowerCase();
    const next = navigate({ testCaseId: cellButton.dataset.testCaseId, modelId: cellButton.dataset.modelId }, direction, cellButton.dataset.mode);
    if (!next) return;
    event.preventDefault();
    focusCell(next, cellButton.dataset.mode);
  });`,
} as const;
