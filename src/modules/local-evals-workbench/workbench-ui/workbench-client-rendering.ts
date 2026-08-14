export const WORKBENCH_CLIENT_RENDERING_SECTION = {
  name: 'rendering',
  source: String.raw`  function renderReady() {
    const suite = selectedSuite();
    if (!suite) return;
    state = { ...state, selectedSuiteId: suite.id, runScope: state.runScope || { type: 'all' } };
    const models = suite.modelOptions || [];
    if (!models.some((model) => model.id === state.selectedEvalRunModel)) {
      state.selectedEvalRunModel = models.some((model) => model.id === state.preferredEvalRunModel) ? state.preferredEvalRunModel : models[0]?.id || 'gpt-5-mini';
    }
    setText('suite-name', suite.name);
    setText('suite-description', suite.description);
    setText('status-label', state.discovery.status === 'blocked' ? 'Blocked' : 'Ready');
    setText('status-message', state.discovery.status === 'blocked' ? state.discovery.message : suite.readyTestCaseCount + ' test case' + (suite.readyTestCaseCount === 1 ? '' : 's') + ' ready.');
    setText('progress-label', '0/' + suite.readyTestCaseCount + ' complete');
    setText('pass-rate', '—');
    setText('avg-latency', '—');
    setText('total-cost', '$0.0000');
    setProgress(0);
    renderSuiteNavigationState(suite.id);
    renderTestCasePicker();
    renderModelOptions(models);
    renderRunButton(false);
    renderResults();
  }

  function renderModelOptions(models) {
    const model = control('model');
    if (!model) return;
    model.textContent = '';
    const families = new Map();
    for (const option of models) {
      const family = option.family || 'Models';
      families.set(family, [...(families.get(family) || []), option]);
    }
    if (families.size <= 1 && families.has('Models')) {
      for (const option of models) model.add(modelOption(option));
      return;
    }
    for (const [family, options] of families) {
      const group = document.createElement('optgroup');
      group.label = family;
      for (const option of options) group.append(modelOption(option));
      model.append(group);
    }
  }

  function modelOption(option) {
    const label = option.label + (option.priceEstimate ? ' · ' + option.priceEstimate : '');
    return new Option(label, option.id, option.id === state.selectedEvalRunModel, option.id === state.selectedEvalRunModel);
  }

  function renderSuiteNavigationState(selectedSuiteId) {
    const suiteSelect = control('suite');
    if (suiteSelect) suiteSelect.value = selectedSuiteId;
    for (const button of root.querySelectorAll('[data-control="suite-option"]')) {
      const selected = button.dataset.suiteId === selectedSuiteId;
      button.classList.toggle('suite-nav__item--selected', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  }

  function renderTestCasePicker() {
    const picker = root.querySelector('.test-case-picker');
    const select = control('test-case');
    if (!picker || !select) return;
    const suite = selectedSuite();
    const testCases = suite?.testCases || [];
    select.textContent = '';
    for (const testCase of testCases) select.add(new Option(testCase.name, testCase.id, testCase.id === state.runScope?.testCaseId, testCase.id === state.runScope?.testCaseId));
    if (state.runScope?.type === 'test_case' && !testCases.some((testCase) => testCase.id === state.runScope.testCaseId) && testCases[0]) state.runScope = { type: 'test_case', testCaseId: testCases[0].id };
    picker.hidden = state.runScope?.type !== 'test_case';
  }

  function renderRunButton(disabled) {
    const run = control('run');
    if (!run) return;
    run.textContent = disabled ? 'Running...' : state.runScope?.type === 'test_case' ? 'Run 1 test case' : 'Run all ' + (selectedSuite()?.readyTestCaseCount || 0) + ' test cases';
    setDisabled(disabled);
  }

  function renderRunning() {
    selectedCell = null;
    activeAssertionId = null;
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
    activeAssertionId = null;
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
    if (!currentMatrix) { region.innerHTML = statePanel() + '<p class="empty-results">Run evals to see result cards and the matrix.</p>'; return; }
    const rows = filteredRows(currentMatrix);
    const variants = visibleVariants(currentMatrix);
    if (rows.length === 0) { region.innerHTML = statePanel() + '<p class="empty-results">' + emptyMessage() + '</p>'; return; }
    region.innerHTML = statePanel() + phoneCards(rows) + desktopMatrix(rows, variants);
  }

  function statePanel() {
    const status = latestRun?.status === 'completed' ? matrix()?.status : latestRun?.status || (state.discovery.status === 'blocked' ? 'blocked' : null);
    if (status !== 'blocked' && status !== 'error') return '';
    const title = status === 'error' ? 'Could not run' : 'Blocked';
    const message = latestRun?.message || (state.discovery.status === 'blocked' ? state.discovery.message : statusMessage(status));
    const guidance = status === 'error' ? 'Try again after checking local setup.' : 'Add local config, then run the eval again.';
    const diagnostics = [...(state.discovery.diagnostics || []), ...(latestRun?.diagnostics || []), ...(matrix()?.diagnostics || [])];
    const diagnosticList = diagnostics.length ? '<ul>' + diagnostics.map((diagnostic) => '<li>' + h(diagnostic.message) + '</li>').join('') + '</ul>' : '';
    const action = status === 'error' ? '<button type="button" data-control="retry-run">Try again</button>' : '';
    return '<section class="state-panel state-panel--' + h(status) + '" role="status" aria-live="polite"><h2>' + h(title) + '</h2><p>' + h(message) + '</p><p>' + h(guidance) + '</p>' + diagnosticList + action + '</section>';
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
    slot.outerHTML = drawerHtml(cell);
    root.querySelector('[data-control="close-cell"]')?.focus();
  }

  function drawerHtml(cell) {
    const failure = failureWorkbench(cell);
    const title = failure ? 'Failure Workbench' : statusLabel(cell.status) + ' result';
    const description = (failure ? 'Failed' : statusLabel(cell.status)) + ' · ' + cell.modelLabel + ' · ' + cell.testCaseId;
    const retry = cell.status === 'error' ? '<button type="button" data-control="retry-cell">Try again</button>' : '';
    const body = failure ? failureWorkbenchHtml(failure) : recoveryHtml(cell) + detailSections(cell) + retry;
    return '<div class="cell-dialog-overlay" data-selected-cell data-cell-overlay><aside class="cell-dialog" role="dialog" aria-modal="true" aria-labelledby="cell-dialog-title" aria-describedby="cell-dialog-description"><div class="cell-dialog__header"><div><p class="cell-dialog__eyebrow">Result detail</p><h2 id="cell-dialog-title">' + h(title) + '</h2><p id="cell-dialog-description">' + h(description) + '</p></div><button type="button" data-control="close-cell" aria-label="Close result detail">Close</button></div>' + body + '</aside></div>';
  }

  function failureWorkbenchHtml(workbench) {
    const evidence = workbench.activeEvidence;
    return '<section class="failure-workbench" data-failure-workbench data-conversation-scope-key="' + h(workbench.conversationScopeKey) + '"><section class="detail-section"><h3>Failed assertions</h3><div class="failure-queue">' + workbench.queue.map((item) => '<button type="button" class="failure-queue__item' + (item.selected ? ' failure-queue__item--active' : '') + '" data-control="select-assertion" data-assertion-id="' + h(item.assertionId) + '" aria-pressed="' + (item.selected ? 'true' : 'false') + '" aria-label="' + h((item.selected ? 'Selected ' : 'Select ') + item.kind + ' ' + item.label) + '"><span aria-hidden="true">' + (item.selected ? '●' : '○') + '</span> <strong>' + h(item.label) + '</strong><span>' + h(item.kind) + '</span></button>').join('') + '</div></section>' + sectionHtml('Active failure', [{ label: evidence.label, value: evidence.message }], 'No active failure.') + sectionHtml('Actual output', evidence.actualPreview ? [{ label: 'Actual preview', value: evidence.actualPreview }] : [], 'No actual output preview reported.') + sectionHtml('Expected', evidence.expectedPreview ? [{ label: 'Expected preview', value: evidence.expectedPreview }] : [], 'No expected or reference context reported.') + sectionHtml('Cell output', evidence.containingCellOutputPreview ? [{ label: 'Output preview', value: evidence.containingCellOutputPreview }] : [], 'No containing cell output preview reported.') + sectionHtml('Diagnostics', evidence.diagnostics.map((diagnostic) => ({ label: diagnostic.code, value: diagnostic.message, meta: diagnostic.location, tone: diagnostic.severity })), 'No diagnostics.') + sectionHtml('Raw artifacts', evidence.artifacts.map((artifact) => ({ label: artifact.label, value: artifact.preview || artifact.reference || artifact.kind, meta: artifact.reference })), 'No raw artifacts.') + analysisHtml(workbench) + proposalHtml(workbench) + '</section>';
  }

  function analysisHtml(workbench) {
    const scopeKey = workbench.conversationScopeKey;
    if (analysisState.status === 'loading' && analysisState.scopeKey === scopeKey) return '<section class="detail-section conversation-placeholder" aria-live="polite"><h3>Conversation</h3><p>Analyzing this failure...</p><button type="button" data-control="analyze-failure" disabled aria-disabled="true">Analyzing...</button></section>';
    if (analysisState.status === 'ready' && analysisState.scopeKey === scopeKey) {
      const analysis = analysisState.result.analysis;
      return '<section class="detail-section conversation-placeholder analysis-result" aria-live="polite"><h3>Analysis</h3><p><strong>What failed</strong></p><p>' + h(analysis.exactFailureExplanation) + '</p><p><strong>Likely cause</strong></p><p class="analysis-result__cause">' + h(causeLabel(analysis.likelyCause)) + '</p><p><strong>Evidence</strong></p><p>' + h(analysis.evidenceSummary) + '</p><p><strong>Uncertainty</strong></p><p>' + h(analysis.uncertainty) + '</p><button type="button" data-control="analyze-failure">Analyze again</button></section>';
    }
    if (analysisState.status === 'unavailable' && analysisState.scopeKey === scopeKey) {
      const guidance = (analysisState.result.setupGuidance || []).map((item) => '<li>' + h(item) + '</li>').join('');
      return '<section class="detail-section conversation-placeholder analysis-unavailable" aria-live="polite"><h3>Analysis unavailable</h3><p>Set up server-side analysis, then try again. Result evidence is still available.</p><ul>' + guidance + '</ul><button type="button" data-control="analyze-failure">Check again</button></section>';
    }
    if (analysisState.status === 'error' && analysisState.scopeKey === scopeKey) return '<section class="detail-section conversation-placeholder analysis-error" aria-live="polite"><h3>Analysis error</h3><p>' + h(analysisState.message) + '</p><button type="button" data-control="analyze-failure">Try again</button></section>';
    return '<section class="detail-section conversation-placeholder" aria-live="polite"><h3>Conversation</h3><p>Sibu: Want me to analyze this failed assertion?</p><button type="button" data-control="analyze-failure">Analyze this failure</button></section>';
  }

  function proposalHtml(workbench) {
    const scopeKey = workbench.conversationScopeKey;
    if (proposalState.status === 'applying' && proposalState.scopeKey === scopeKey) return '<section class="detail-section proposal-preview" aria-live="polite"><h3>Proposal</h3><p>Applying the approved proposal...</p><button type="button" disabled aria-disabled="true">Applying...</button></section>';
    if (proposalState.status === 'applied' && proposalState.scopeKey === scopeKey) { const recommendation = proposalState.result.rerunRecommendation || {}; const primary = recommendation.primaryAction || {}; const alternate = (recommendation.alternateActions || [])[0]; return '<section class="detail-section proposal-preview proposal-applied" aria-live="polite"><h3>Proposal applied</h3><p>' + h(proposalState.result.changedFileCount || 0) + ' project file' + ((proposalState.result.changedFileCount || 0) === 1 ? '' : 's') + ' changed. Validation has not rerun yet, so Sibu is not claiming the issue is resolved.</p>' + sectionHtml('Changed files', (proposalState.result.changedFiles || []).map((file) => ({ label: file.summary || 'Changed artifact', value: file.path })), 'No project files changed.') + '<section class="detail-section detail-section--guidance"><h3>Next</h3><p>' + h(recommendation.message || 'Rerun evals to check the change.') + '</p><button type="button" data-control="rerun-recommendation" data-rerun-scope="primary">' + h(primary.label || 'Rerun this test case') + '</button>' + (alternate ? '<button type="button" data-control="rerun-recommendation" data-rerun-scope="suite">' + h(alternate.label || 'Rerun full suite') + '</button>' : '') + '</section></section>'; }
    if (proposalState.status === 'blocked' && proposalState.scopeKey === scopeKey) return '<section class="detail-section proposal-preview proposal-blocked" aria-live="polite"><h3>Proposal blocked</h3><p>' + h(proposalState.result.message || 'Proposal was blocked.') + '</p><p>No project files changed.</p>' + proposalControls() + '</section>';
    if (proposalState.status === 'drafting' && proposalState.scopeKey === scopeKey) return '<section class="detail-section proposal-preview" aria-live="polite"><h3>Proposal</h3><p>Drafting a concrete proposal for this active assertion...</p><button type="button" disabled aria-disabled="true">Drafting...</button></section>';
    if (proposalState.status === 'ready' && proposalState.scopeKey === scopeKey) {
      const proposal = proposalState.result.proposal;
      return '<section class="detail-section proposal-preview" aria-live="polite"><h3>Proposal</h3><p><strong>Approval state</strong>: ' + h(proposal.approvalState) + '</p><p>Approve this concrete proposal only if you want Sibu to change these project files.</p>' + sectionHtml('Affected files', (proposal.affectedProjectFiles || []).map((file) => ({ label: 'Change artifact', value: file })), 'No affected files reported.') + sectionHtml('Change summary', [{ label: 'Summary', value: proposal.changeSummary }], 'No summary.') + sectionHtml('Rationale', [{ label: 'Why', value: proposal.rationale }], 'No rationale.') + sectionHtml('Expected eval impact', [{ label: 'Impact', value: proposal.expectedEvalImpact }], 'No expected eval impact.') + sectionHtml('Proposed change', [{ label: proposal.proposedChange.kind, value: proposal.proposedChange.representation }], 'No proposed patch/change representation.') + '<button type="button" data-control="apply-proposal" data-proposal-id="' + h(proposal.proposalId) + '">Approve and apply proposal</button></section>';
    }
    if (proposalState.status === 'unavailable' && proposalState.scopeKey === scopeKey) {
      const guidance = (proposalState.result.setupGuidance || []).map((item) => '<li>' + h(item) + '</li>').join('');
      return '<section class="detail-section proposal-preview proposal-unavailable" aria-live="polite"><h3>Proposal unavailable</h3><p>Set up server-side proposal drafting, then try again. Result evidence is still available.</p><ul>' + guidance + '</ul>' + proposalControls() + '</section>';
    }
    if ((proposalState.status === 'rejected' || proposalState.status === 'error') && proposalState.scopeKey === scopeKey) return '<section class="detail-section proposal-preview proposal-error" aria-live="polite"><h3>Proposal</h3><p>' + h(proposalState.message) + '</p>' + proposalControls() + '</section>';
    return '<section class="detail-section proposal-preview"><h3>Proposal</h3><p>Choose a repair direction for this active failed assertion. No project files are changed by drafting.</p>' + proposalControls() + '</section>';
  }

  function proposalControls() {
    return '<label class="field">Repair direction<select data-control="repair-direction" aria-label="Repair direction"><option value="prompt_issue">Prompt issue</option><option value="eval_assertion_issue">Eval assertion issue</option><option value="fixture_input_issue">Fixture/input issue</option><option value="regression_case">Regression case</option><option value="custom">Custom direction</option></select></label><label class="field">Custom direction<input type="text" data-control="repair-direction-custom" aria-label="Custom repair direction" placeholder="Name the target and intended change"></label><button type="button" data-control="draft-proposal">Draft proposal</button>';
  }

  function causeLabel(cause) {
    return ({ prompt_issue: 'Prompt issue', eval_assertion_issue: 'Eval assertion issue', fixture_input_issue: 'Fixture/input issue', model_nondeterminism: 'Model nondeterminism', unclear_needs_human_judgment: 'Unclear / needs human judgment' })[cause] || 'Unclear / needs human judgment';
  }


  function recoveryHtml(cell) {
    const guidance = cell.status === 'blocked' ? 'Add local config, then run the eval again.' : cell.status === 'error' ? 'Try again after checking local setup.' : cell.status === 'running' ? 'Wait for this run to finish.' : cell.status === 'not-run' ? 'Run this eval to inspect output.' : '';
    return guidance ? '<section class="detail-section detail-section--guidance"><h3>Next</h3><p>' + h(guidance) + '</p></section>' : '';
  }

  function detailSections(cell) {
    if (cell.status === 'running') return sectionHtml('Status', [], 'Running local evals. Details will appear when this run finishes.');
    if (cell.status === 'not-run') return sectionHtml('Status', [], 'Output will appear after running the eval.');
    return sectionHtml('Assertions', (cell.assertions || []).map((assertion) => ({ label: statusLabel(assertion.status) + ': ' + assertion.label, value: assertion.message || (assertion.status === 'passed' ? 'Passed.' : 'No assertion message.'), meta: [assertion.expectedPreview ? 'Expected: ' + assertion.expectedPreview : null, assertion.actualPreview ? 'Actual: ' + assertion.actualPreview : null].filter(Boolean).join(' · '), tone: assertion.status })), cell.status === 'passed' ? 'No assertions reported.' : 'No assertion details reported.') + sectionHtml('Diagnostics', (cell.diagnostics || []).map((diagnostic) => ({ label: diagnostic.code, value: diagnostic.message, meta: diagnostic.location, tone: diagnostic.severity })), 'No diagnostics.') + sectionHtml('Output', cell.outputPreview ? [{ label: 'Output preview', value: cell.outputPreview }] : [], 'Output will appear after running the eval.') + sectionHtml('Metrics', metricItems(cell), 'Metrics unavailable.') + sectionHtml('Raw artifacts', (cell.artifacts || []).map((artifact) => ({ label: artifact.label, value: artifact.preview || artifact.reference || artifact.kind, meta: artifact.reference })), 'No raw artifacts.');
  }

  function sectionHtml(title, items, emptyMessage) {
    const body = items.length ? '<ul>' + items.map(itemHtml).join('') + '</ul>' : '<p>' + h(emptyMessage) + '</p>';
    return '<section class="detail-section"><h3>' + h(title) + '</h3>' + body + '</section>';
  }

  function itemHtml(item) {
    const tone = item.tone === 'passed' ? ' detail-item--success' : item.tone === 'blocked' || item.tone === 'warning' ? ' detail-item--warning' : item.tone === 'failed' || item.tone === 'error' ? ' detail-item--error' : '';
    const meta = item.meta ? '<p class="detail-item__meta">' + h(item.meta) + '</p>' : '';
    return '<li class="detail-item' + tone + '"><strong>' + h(item.label) + '</strong><p>' + h(item.value) + '</p>' + meta + '</li>';
  }`,
} as const;
