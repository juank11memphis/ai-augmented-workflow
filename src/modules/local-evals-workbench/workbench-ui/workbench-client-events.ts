export const WORKBENCH_CLIENT_EVENTS_SECTION = {
  name: 'events',
  source: String.raw`  root.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('[data-control="suite"]')) { latestRun = null; filters = { failuresOnly: false, searchQuery: '', visibleVariantIds: [] }; selectedCell = null; activeAssertionId = null; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; state = { ...state, selectedSuiteId: target.value, runScope: { type: 'all' } }; renderReady(); }
    if (target.matches('[data-control="model"]')) { state = { ...state, selectedEvalRunModel: target.value }; selectedCell = null; activeAssertionId = null; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; renderSelectedCell(); }
    if (target.matches('input[name="runScope"]')) { state = { ...state, runScope: selectedScope() }; renderRunButton(false); }
    if (target.matches('[data-control="failures-only"]')) { filters.failuresOnly = target.checked; selectedCell = null; activeAssertionId = null; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; renderResults(); renderSelectedCell(); }
    if (target.matches('[data-control="variant"]')) { const checked = [...root.querySelectorAll('[data-control="variant"]:checked')].map((input) => input.value); filters.visibleVariantIds = checked.length ? checked : filters.visibleVariantIds.slice(0, 1); selectedCell = null; activeAssertionId = null; renderFilters(); renderResults(); renderSelectedCell(); }
  });
  root.addEventListener('input', (event) => { if (event.target.matches('[data-control="search"]')) { filters.searchQuery = event.target.value; selectedCell = null; activeAssertionId = null; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; renderResults(); renderSelectedCell(); } });
  root.addEventListener('click', async (event) => {
    const cellButton = event.target.closest('[data-cell-button]');
    if (cellButton) { selectedCell = { testCaseId: cellButton.dataset.testCaseId, modelId: cellButton.dataset.modelId }; activeAssertionId = null; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; focusRestoreKey = keyFor(selectedCell, cellButton.dataset.mode); cellButton.dataset.focusKey = focusRestoreKey; renderSelectedCell(); return; }
    if (event.target.closest('[data-control="select-assertion"]')) { activeAssertionId = event.target.closest('[data-control="select-assertion"]').dataset.assertionId; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; renderSelectedCell(); root.querySelector('[data-control="select-assertion"][data-assertion-id="' + h(activeAssertionId) + '"]')?.focus(); return; }
    if (event.target.matches('[data-control="close-cell"]') || event.target.matches('[data-cell-overlay]')) { selectedCell = null; activeAssertionId = null; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; renderSelectedCell(); return; }
    if (event.target.matches('[data-control="analyze-failure"]')) { await analyzeFailure(); return; }
    if (event.target.matches('[data-control="draft-proposal"]')) { await draftProposal(); return; }
    if (event.target.matches('[data-control="retry-cell"]')) { const cell = selectedCell; const scope = cell ? { type: 'test_case', testCaseId: cell.testCaseId } : selectedScope(); state = { ...state, selectedEvalRunModel: cell?.modelId || state.selectedEvalRunModel, runScope: scope }; selectedCell = null; activeAssertionId = null; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; renderSelectedCell(); await runEval(scope); return; }
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
  async function analyzeFailure() {
    const cell = selectedCell && findCell(selectedCell);
    const workbench = cell && failureWorkbench(cell);
    if (!cell || !workbench) return;
    analysisState = { status: 'loading', scopeKey: workbench.conversationScopeKey };
    renderSelectedCell();
    try {
      const response = await fetch('/api/failure-analysis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suiteId: state.selectedSuiteId, testCaseId: cell.testCaseId, evalRunModelId: cell.modelId, runScope: state.runScope || { type: 'all' }, assertionId: activeAssertionId }) });
      const payload = await response.json();
      const current = failureWorkbench(cell);
      if (!current || current.conversationScopeKey !== analysisState.scopeKey) return;
      analysisState = payload.status === 'analysis-ready' ? { status: 'ready', scopeKey: current.conversationScopeKey, result: payload } : payload.status === 'analysis-unavailable' ? { status: 'unavailable', scopeKey: current.conversationScopeKey, result: payload } : { status: 'error', scopeKey: current.conversationScopeKey, message: payload.message || 'Analysis could not finish.' };
      renderSelectedCell();
    } catch {
      const current = selectedCell && findCell(selectedCell);
      const workbenchNow = current && failureWorkbench(current);
      if (!workbenchNow) return;
      analysisState = { status: 'error', scopeKey: workbenchNow.conversationScopeKey, message: 'Analysis could not finish. Try again.' };
      renderSelectedCell();
    }
  }

  async function draftProposal() {
    const cell = selectedCell && findCell(selectedCell);
    const workbench = cell && failureWorkbench(cell);
    const direction = control('repair-direction')?.value || 'prompt_issue';
    const custom = control('repair-direction-custom')?.value || '';
    if (!cell || !workbench) return;
    const repairDirection = direction === 'custom' ? { type: 'custom', instruction: custom } : { type: direction };
    proposalState = { status: 'drafting', scopeKey: workbench.conversationScopeKey };
    renderSelectedCell();
    try {
      const priorAnalysis = analysisState.status === 'ready' && analysisState.scopeKey === workbench.conversationScopeKey ? { summary: analysisState.result.analysis.evidenceSummary, likelyCause: analysisState.result.analysis.likelyCause } : undefined;
      const response = await fetch('/api/repair-proposals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suiteId: state.selectedSuiteId, testCaseId: cell.testCaseId, evalRunModelId: cell.modelId, runScope: state.runScope || { type: 'all' }, assertionId: workbench.activeEvidence.assertionId || activeAssertionId, repairDirection, priorAnalysis }) });
      const payload = await response.json();
      const current = selectedCell && findCell(selectedCell);
      const now = current && failureWorkbench(current);
      if (!now || now.conversationScopeKey !== proposalState.scopeKey) return;
      proposalState = payload.status === 'proposal-ready' ? { status: 'ready', scopeKey: now.conversationScopeKey, result: payload } : payload.status === 'proposal-unavailable' ? { status: 'unavailable', scopeKey: now.conversationScopeKey, result: payload } : payload.status === 'proposal-rejected' || payload.status === 'blocked' ? { status: 'rejected', scopeKey: now.conversationScopeKey, message: payload.message || 'Proposal was rejected.' } : { status: 'error', scopeKey: now.conversationScopeKey, message: payload.message || 'Proposal could not finish.' };
      renderSelectedCell();
    } catch {
      const current = selectedCell && findCell(selectedCell);
      const now = current && failureWorkbench(current);
      if (!now) return;
      proposalState = { status: 'error', scopeKey: now.conversationScopeKey, message: 'Proposal could not finish. Try again.' };
      renderSelectedCell();
    }
  }

  root.addEventListener('keydown', (event) => {
    if (selectedCell && event.key === 'Escape') { event.preventDefault(); selectedCell = null; activeAssertionId = null; analysisState = { status: 'idle' }; proposalState = { status: 'idle' }; renderSelectedCell(); return; }
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
