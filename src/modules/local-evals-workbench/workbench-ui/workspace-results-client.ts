export const WORKSPACE_RESULTS_CLIENT = String.raw`
  const resultContainer = one('[data-results-container]');
  const detail = one('[data-detail]');
  const side = one('[data-side-panel]');
  let panelReturn = null;
  let detailReturnCaseId = null;
  let failuresOnly = false, search = '';
  const latestRun = () => Boolean(selectedRunId && latestKnownRunId === selectedRunId);
  function clearSelectedDetail() {
    detailGeneration++;
    resetRepair();
    detail.innerHTML = '<h2>Result detail</h2><p>Select a completed case to inspect it.</p>';
    detailReturnCaseId = null;
  }
  function selectSuite(id) {
    if (!id || suite?.id === id || isActive() || startPending) return;
    suite = suites.find(item => item.id === id) || null;
    run = null; history = []; selectedRunId = null; latestKnownRunId = null; acceptedRunId = null; runtime = null; review = null;
    runGeneration++; historyGeneration++; detailGeneration++;
    if (typeof runtimeGeneration !== 'undefined') runtimeGeneration++;
    if (typeof strictRuntimeChoices !== 'undefined') strictRuntimeChoices = false;
    setRuntimeState('loading', 'Loading compatible models…');
    clearSelectedDetail();
    activePanel = null; panelReturn = null; side.hidden = true; side.innerHTML = '';
    side.removeAttribute('role'); side.removeAttribute('aria-modal'); side.removeAttribute('aria-label');
    detail.hidden = false; failuresOnly = false; search = '';
    setup = { scope: 'all', caseId: suite?.testCases[0]?.id || '', model: '', judgeModel: '', repeats: 1 };
    renderWorkspace(); void loadRuntime(); void loadHistory();
  }
  function caseStatus(caseId) {
    const item = run?.cases.find(value => value.caseId === caseId);
    if (!item) return { state: 'not-run', failed: 0, attempts: [] };
    const failed = item.attempts.filter(value => value.outcome === 'failed').length;
    return { state: item.state !== 'completed' ? item.state : failed ? 'failed' : item.attempts.every(value => value.outcome === 'passed') ? 'passed' : 'incomplete', failed, attempts: item.attempts };
  }
  function renderWorkspace() {
    one('[data-suite-title]').textContent = suite?.name || 'No eval suites yet';
    one('[data-suite-description]').textContent = suite?.description || '';
    one('[data-action="suite-select"]').value = suite?.id || '';
    for (const item of document.querySelectorAll('[data-action="suite"]')) {
      if (item.dataset.suiteId === suite?.id) item.setAttribute('aria-current','page'); else item.removeAttribute('aria-current');
    }
    for (const action of ['coverage','history']) one('[data-action="' + action + '"]').hidden = !suite;
    setupRegion.hidden = !suite || isActive() || startPending || startUncertain;
    const reviewAction = setupRegion.querySelector('[data-action="review"]');
    if (reviewAction) reviewAction.disabled = Boolean(!runtime || !setup.model || needsJudge() && !setup.judgeModel);
    refreshSetupControls();
    const historical = run && history.length && !latestRun();
    one('[data-latest-label]').textContent = run ? (historical ? 'Historical run · read-only' : 'Latest run · ' + new Date(run.createdAt).toLocaleString()) : acceptedRunId ? 'Latest run · queued' : 'Latest run · none';
    const runIds = run?.caseIds || [];
    const visibleCases = run ? [...runIds.map(id => suite?.testCases.find(item => item.id === id) || { id, name: id }),
      ...(suite?.testCases || []).filter(item => !runIds.includes(item.id))] : suite?.testCases || [];
    const statuses = (run ? runIds : visibleCases.map(item => item.id)).map(id => caseStatus(id));
    const passed = statuses.filter(item => item.state === 'passed').length;
    const failed = statuses.filter(item => item.state === 'failed').length;
    const unfinished = statuses.length - passed - failed;
    const excluded = run ? visibleCases.length - runIds.length : 0;
    const summary = !suite ? 'No eval suites yet' : !run ? acceptedRunId ? 'Run queued · loading progress' : suite.testCases.length + ' test cases ready'
      : run.state + ' · ' + passed + ' passed · ' + failed + ' failed · ' + unfinished + ' not finished' + (excluded ? ' · ' + excluded + ' excluded' : '');
    one('[data-status-summary]').textContent = summary;
    if (run) {
      const done = statuses.length - unfinished;
      const current = run.cases.find(item => item.state === 'incomplete') || run.cases.find(item => item.state === 'not-run');
      const elapsed = Math.max(0, ((run.finishedAt || Date.now()) - run.createdAt) / 1000).toFixed(1);
      status(done + '/' + statuses.length + ' complete' + (isActive() && current ? ' · Current: ' + current.caseId : ''));
      one('[data-run-metrics]').textContent = 'Elapsed ' + elapsed + 's · Cost ' + (run.cost == null ? 'unavailable' : run.cost);
    } else if (acceptedRunId) status('Run queued. Loading saved progress…');
    else if (suite) status('0/' + suite.testCases.length + ' complete');
    if (!suite) {
      resultContainer.innerHTML = '<section class="empty" aria-labelledby="empty-title"><h2 id="empty-title">No eval suites yet</h2><p>Ask your coding agent:</p><blockquote>Create production-ready Sibu evals for this project.</blockquote><button type="button" data-action="copy-prompt">Copy prompt</button><p data-copy-status role="status"></p></section>';
      detail.innerHTML = ''; return;
    }
    const rows = visibleCases.map(item => ({ ...item, status: run && !runIds.includes(item.id) ? { state: 'excluded', failed: 0, attempts: [] } : caseStatus(item.id) }))
      .filter(item => (!failuresOnly || item.status.state === 'failed') && item.name.toLowerCase().includes(search));
    resultContainer.innerHTML = '<section class="results" aria-labelledby="results-title"><div class="section-heading"><h2 id="results-title">Results <small>' + visibleCases.length + '</small></h2><label><input type="checkbox" data-action="failures-only"' + (failuresOnly ? ' checked' : '') + '> Failures only</label><label class="search">Search <input type="search" data-action="search" aria-label="Search test cases" value="' + esc(search) + '"></label></div>'
      + (rows.length ? '<ul class="result-list">' + rows.map(item => '<li><button type="button" data-action="case" data-case-id="' + esc(item.id) + '"' + (item.status.attempts.length ? '' : ' disabled') + ' aria-label="' + esc('Open ' + item.name + ', ' + item.status.state + ', ' + item.status.failed + ' failed attempts') + '"><span class="result-icon" aria-hidden="true">' + (item.status.state === 'passed' ? '✓' : item.status.state === 'failed' ? '✕' : '–') + '</span><span><strong>' + esc(item.name) + '</strong><small>' + esc(item.status.state) + ' · ' + item.status.failed + ' failed attempts · ' + item.status.attempts.length + ' attempts</small></span></button></li>').join('') + '</ul>' : '<p>No matching results.</p>')
      + '</section>';
  }
  async function loadHistory() {
    if (!suite) return;
    const current = suite.id, generation = ++historyGeneration;
    try {
      const payload = await json('/api/eval-runs/history?' + new URLSearchParams({ suiteId: current, limit: '50' }));
      if (generation !== historyGeneration || suite?.id !== current) return;
      if (payload.status !== 'ok') { status('Saved history is unavailable. Check local artifact setup.'); return; }
      history = payload.value || [];
      latestKnownRunId = acceptedRunId || history[0]?.runId || latestKnownRunId;
      if (!selectedRunId) selectedRunId = history[0]?.runId || null;
      startUncertain = false;
      renderWorkspace(); if (activePanel === 'history') { renderHistory(); focusPanel(); }
      if (!acceptedRunId && selectedRunId && run?.runId !== selectedRunId) void pollRun();
    } catch { if (generation === historyGeneration) status('Saved history could not be loaded.'); }
  }
  async function pollRun() {
    if (!suite || !selectedRunId) return;
    const current = { suiteId: suite.id, runId: selectedRunId }, generation = ++runGeneration;
    try {
      const payload = await json('/api/eval-runs/status?' + new URLSearchParams(current));
      if (generation !== runGeneration || suite?.id !== current.suiteId || selectedRunId !== current.runId) return;
      if (payload.status !== 'ok') { status('Run status unavailable. Reconnecting…'); setTimeout(pollRun, 1200); return; }
      const previous = run?.state;
      run = payload.value.summary;
      const acceptedFinished = acceptedRunId === current.runId && !['queued', 'running'].includes(run.state);
      if (acceptedFinished) acceptedRunId = null;
      renderWorkspace();
      if (isActive()) setTimeout(pollRun, 700);
      else {
        if (acceptedFinished || previous && ['queued','running'].includes(previous)) { one('[data-status-summary]').focus(); void loadHistory(); }
      }
    } catch { if (generation === runGeneration) { status('Connection lost. Reconnecting to this run…'); setTimeout(pollRun, 1200); } }
  }
  function openPanel(kind) {
    if (!panelReturn) panelReturn = document.activeElement;
    activePanel = kind; side.hidden = false; detail.hidden = true;
    if (matchMedia('(max-width:699px)').matches) { side.setAttribute('role', 'dialog'); side.setAttribute('aria-modal', 'true'); side.setAttribute('aria-label', kind === 'history' ? 'History' : 'Coverage'); }
    else { side.removeAttribute('role'); side.removeAttribute('aria-modal'); side.removeAttribute('aria-label'); }
  }
  function focusPanel() { side.querySelector('h2')?.focus(); }
  function returnToResult() {
    const button = [...resultContainer.querySelectorAll('[data-action="case"]')].find(item => item.dataset.caseId === detailReturnCaseId);
    detailReturnCaseId = null;
    button?.focus();
  }
  function closePanel() { activePanel = null; side.hidden = true; side.removeAttribute('role'); side.removeAttribute('aria-modal'); side.removeAttribute('aria-label'); detail.hidden = false; const target = panelReturn; panelReturn = null; target?.focus(); }
  function renderHistory() {
    openPanel('history');
    side.innerHTML = '<div class="section-heading"><h2 tabindex="-1">History</h2><button type="button" data-action="close-panel">Close</button></div>'
      + (history.length ? '<ol class="history-list">' + history.map(item => '<li><button type="button" data-action="history-run" data-run-id="' + esc(item.runId) + '"><strong>' + esc(new Date(item.createdAt).toLocaleString()) + '</strong><br>' + esc(item.testedModel) + ' · ' + esc(item.scope) + ' · ' + esc(item.repeats) + ' repeat(s)<br>' + esc(item.state) + ' / ' + esc(item.outcome) + ' · ' + esc(item.finishedAt ? Math.max(0, item.finishedAt-item.createdAt) + 'ms' : 'Duration unavailable') + ' · Cost ' + esc(item.cost == null ? 'unavailable' : item.cost) + '</button></li>').join('') + '</ol>' : '<p>No saved runs yet.</p>');
  }
  function renderCoverage() {
    openPanel('coverage');
    const coverage = suite?.coverage;
    const gaps = (coverage?.gaps || []).map(item => '<li><strong>' + esc(item.id) + '</strong><p>' + esc(item.reason) + '</p></li>').join('');
    const categories = (coverage?.categories || []).map(item => '<li><strong>' + esc(item.id) + '</strong> — ' + esc(item.status.replaceAll('-', ' ')) + (item.reason ? '<p>' + esc(item.reason) + '</p>' : '') + '</li>').join('');
    side.innerHTML = '<div class="section-heading"><h2 tabindex="-1">Coverage</h2><button type="button" data-action="close-panel">Close</button></div><h3>Known gaps</h3>' + (gaps ? '<ul>' + gaps + '</ul>' : '<p>No known gaps documented.</p>') + '<h3>Coverage categories</h3><ul>' + categories + '</ul>';
    focusPanel();
  }
  async function inspectCase(caseId, attempt, requestedAssertionId = null) {
    if (!run || !suite) return;
    resetRepair();
    const current = { suiteId: suite.id, runId: run.runId, caseId }, generation = ++detailGeneration;
    function showEvidenceState(message) {
      const html = '<h2>Result detail</h2><p>' + esc(message) + '</p>';
      detail.innerHTML = html;
      if (matchMedia('(max-width:699px)').matches) openSheet('Result detail', html, '<button type="button" data-action="close-sheet">Close</button>');
    }
    showEvidenceState(requestedAssertionId ? 'Loading selected evidence for ' + requestedAssertionId + '…' : 'Loading selected evidence…');
    const query = new URLSearchParams({ ...current, attempt: String(attempt) });
    try {
      const payload = await json('/api/eval-runs/status?' + query);
      if (generation !== detailGeneration || activePanel || suite?.id !== current.suiteId || run?.runId !== current.runId) return;
      if (payload.status !== 'ok' || payload.value.evidenceStatus !== 'available') { showEvidenceState('Selected evidence is unavailable.'); return; }
      const failed = payload.value.evidence.assertions.filter(item => item.outcome === 'failed');
      const rawResponse = payload.value.evidence.output;
      const assertionId = failed.find(item => item.id === requestedAssertionId)?.id || failed[0]?.id;
      if (assertionId) query.set('assertionId', assertionId);
      const selected = assertionId ? await json('/api/eval-runs/status?' + query) : payload;
      if (generation !== detailGeneration || activePanel || suite?.id !== current.suiteId || run?.runId !== current.runId) return;
      if (selected.status !== 'ok' || selected.value.evidenceStatus !== 'available') { showEvidenceState('Selected evidence is unavailable.'); return; }
      const evidence = selected.value.evidence;
      const assertion = assertionId ? evidence.assertions.find(item => item.id === assertionId) : evidence.assertions[0];
      const attempts = run.cases.find(item => item.caseId === caseId)?.attempts || [];
      const attemptChoices = '<label class="field">Attempt<select data-action="attempt-select" data-case-id="' + esc(caseId) + '">' + attempts.map(item => '<option value="' + esc(item.number) + '"' + (item.number === attempt ? ' selected' : '') + '>Attempt ' + esc(item.number) + ' — ' + esc(item.outcome) + '</option>').join('') + '</select></label>';
      const failedChoices = failed.length ? '<label class="field">Failed check ' + (failed.findIndex(item => item.id === assertionId) + 1) + ' of ' + failed.length + '<select data-action="assertion-select" data-case-id="' + esc(caseId) + '" data-attempt="' + esc(attempt) + '">' + failed.map(item => '<option value="' + esc(item.id) + '"' + (item.id === assertionId ? ' selected' : '') + '>' + esc(item.id) + '</option>').join('') + '</select></label>' : '';
      selectedFailure = latestRun() && assertionId ? { suiteId: suite.id, runId: run.runId, testCaseId: caseId, attempt, assertionId, evalRunModelId: run.testedModel, runScope: run.scope === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: caseId } } : null;
      const trace = evidence.turns.map(item => '<p>' + esc(item.role) + ': ' + esc(item.content) + '</p>').join('') + evidence.tools.map(item => '<p>Tool ' + esc(item.name) + ': ' + esc(item.outcome || 'result') + ' · ' + esc(item.arguments) + ' · ' + esc(item.result) + '</p>').join('');
      const allChecks = payload.value.evidence.assertions.map(item => '<li><strong>' + esc(item.id) + '</strong> — ' + esc(item.outcome)
        + (item.score == null ? '' : ' · Score ' + esc(item.score) + (item.threshold == null ? '' : ' · Threshold ' + esc(item.threshold)))
        + '<p>Actual: ' + esc(item.actual || 'Not reported.') + '</p><p>Expected: ' + esc(item.expected || 'Not reported.') + '</p>'
        + (item.diagnostics.length ? '<ul>' + item.diagnostics.map(message => '<li>' + esc(message) + '</li>').join('') + '</ul>' : '') + '</li>').join('');
      const attemptDiagnostics = payload.value.evidence.diagnostics.map(item => '<p>' + esc(item) + '</p>').join('');
      const html = '<div class="section-heading"><h2 tabindex="-1">Result detail</h2><button type="button" data-action="close-detail">Close</button></div>'
        + (latestRun() ? '' : '<p class="readonly">Historical run · read-only</p>')
        + '<h3>' + esc(suite.testCases.find(item => item.id === caseId)?.name || caseId) + '</h3><p>' + esc(evidence.outcome) + ' · ' + failed.length + ' failed checks</p>'
        + attemptChoices + failedChoices
        + '<section class="detail-section"><h3>What happened</h3><p>' + esc(assertion?.actual || 'No actual behavior reported.') + '</p>' + (assertion?.score == null ? '' : '<p>Score ' + esc(assertion.score) + (assertion.threshold == null ? '' : ' · Threshold ' + esc(assertion.threshold)) + '</p>') + '</section>'
        + '<section class="detail-section"><h3>Expected</h3><p>' + esc(assertion?.expected || 'No expected behavior reported.') + '</p></section>'
        + '<details class="detail-section"><summary>All checks (' + payload.value.evidence.assertions.length + ')</summary>' + (allChecks ? '<ul>' + allChecks + '</ul>' : '<p>No checks reported.</p>') + '</details>'
        + '<details class="detail-section"><summary>Conversation turns and tool trace</summary>' + (trace || '<p>No trace reported.</p>') + '</details>'
        + '<details class="detail-section"><summary>Diagnostics</summary>' + ((assertion?.diagnostics || []).map(item => '<p>' + esc(item) + '</p>').join('') || '<p>No selected diagnostics.</p>') + '</details>'
        + '<details class="detail-section"><summary>Attempt diagnostics</summary>' + (attemptDiagnostics || '<p>No attempt diagnostics.</p>') + '</details>'
        + '<details class="detail-section"><summary>Bounded raw response</summary>'
        + (payload.value.evidence.truncated ? '<p>Saved response was truncated.</p>' : '')
        + '<pre>' + esc(rawResponse || 'No raw response was retained for this attempt.') + '</pre></details>'
        + '<section data-repair-host aria-label="Guided repair">' + repairMarkup() + '</section>';
      detail.innerHTML = html;
      if (matchMedia('(max-width:699px)').matches) openSheet('Result detail', html, '<button type="button" data-action="close-sheet">Close</button>');
      else detail.querySelector('h2')?.focus();
    } catch { if (generation === detailGeneration && !activePanel) showEvidenceState('Selected evidence could not be loaded.'); }
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    if (target.dataset.action === 'coverage') { detailGeneration++; renderCoverage(); }
    if (target.dataset.action === 'history') { detailGeneration++; resetRepair(); detail.innerHTML = '<h2>Result detail</h2><p>Select a completed case to inspect it.</p>'; void loadHistory(); renderHistory(); focusPanel(); }
    if (target.dataset.action === 'close-panel') closePanel();
    if (target.dataset.action === 'close-detail') { if (sheetSlot.querySelector('[role="dialog"]')) closeSheet(); else { detailGeneration++; resetRepair(); detail.innerHTML = '<h2>Result detail</h2><p>Select a completed case to inspect it.</p>'; returnToResult(); } }
    if (target.dataset.action === 'case') { detailReturnCaseId = target.dataset.caseId; const attempts = run?.cases.find(item => item.caseId === target.dataset.caseId)?.attempts || []; void inspectCase(target.dataset.caseId, attempts.find(item => item.outcome === 'failed')?.number || attempts[0]?.number || 1); }
    if (target.dataset.action === 'history-run') {
      if (acceptedRunId) { status('Wait for the current run to finish before opening another run.'); return; }
      selectedRunId = target.dataset.runId; run = null; clearSelectedDetail(); void pollRun();
    }
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-action="failures-only"]')) { failuresOnly = event.target.checked; renderWorkspace(); }
    if (event.target.matches('[data-action="attempt-select"]')) void inspectCase(event.target.dataset.caseId, Number(event.target.value));
    if (event.target.matches('[data-action="assertion-select"]')) void inspectCase(event.target.dataset.caseId, Number(event.target.dataset.attempt), event.target.value);
  });
  document.addEventListener('keydown', event => {
    if (side.hidden || side.getAttribute('role') !== 'dialog') return;
    if (event.key === 'Escape') { event.preventDefault(); closePanel(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...side.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')];
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === side.querySelector('h2') || !side.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !side.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('input', event => { if (event.target.matches('[data-action="search"]')) { search = event.target.value.toLowerCase(); renderWorkspace(); one('[data-action="search"]')?.focus(); } });
  setup.caseId = suite?.testCases[0]?.id || '';
  void loadRuntime(); void loadHistory();
`;
