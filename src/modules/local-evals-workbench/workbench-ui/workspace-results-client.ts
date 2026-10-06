export const WORKSPACE_RESULTS_CLIENT = String.raw`
  const resultContainer = one('[data-results-container]');
  const detail = one('[data-detail]');
  const side = one('[data-side-panel]');
  const workspace = one('[data-workspace]');
  let taskView = 'results';
  let setupReturn = null;
  function showTaskView(view) {
    if (view === 'new-run' && (!suite || isActive() || startPending || startUncertain)) return;
    taskView = view;
    workspace.dataset.taskView = view;
    setupRegion.hidden = view !== 'new-run';
    resultContainer.hidden = view === 'new-run';
    if (view === 'new-run') {
      setupReturn = document.activeElement;
      one('#run-setup-title')?.focus();
    } else {
      const returnTarget = setupReturn;
      setupReturn = null;
      returnTarget?.focus();
    }
  }
  let panelReturn = null;
  let historyReadError = false;
  let readNotices = { status: null, history: null, evidence: null };
  let readIssueDetails = null;
  const readCategories = new Set(['invalid-request', 'not-found', 'corrupt', 'unknown', 'unavailable',
    'unsafe-path', 'not-ignored', 'tracked-artifacts', 'git-unavailable', 'unverifiable-root',
    'limit-exceeded', 'invalid-transition', 'owner-unknown', 'index-stale']);
  function readCopy(stage, payload, disconnected = false) {
    if (disconnected) return { title: 'Connection to Sibu failed', guidance: 'Could not read ' + stage + '. Previous results remain available. Recheck the read; a matching terminal event may not exist.', details: null };
    const issue = payload?.issue;
    const issueStage = stage === 'evidence' ? 'status' : stage;
    const valid = issue?.stage === issueStage && ['blocked', 'failed'].includes(issue.outcome)
      && (readCategories.has(issue.category) || issue.category === 'input-unsafe')
      && safeReference(issue.reference) && issue.category === payload.reason;
    const category = valid ? issue.category === 'input-unsafe' ? 'unclassified' : issue.category : 'unknown';
    const title = stage === 'history' ? 'Saved History could not be read' : stage === 'status' ? 'Run status could not be read' : 'Selected evidence could not be read';
    const cause = category === 'unclassified' ? 'Older input was rejected without a precise cause. Review runner setup and request size.'
      : category === 'unknown' ? 'Cause unknown.' : category === 'corrupt' ? 'The saved record is unreadable.'
      : category === 'not-found' ? 'The requested record was not found.' : 'The read is unavailable.';
    return { title, guidance: cause + ' Previous results remain available. Recheck this read; the run outcome has not changed.',
      details: valid ? 'Stage: ' + issueStage + '\nOutcome: ' + issue.outcome + '\nCategory: ' + category + '\nReference: ' + issue.reference.toLowerCase() : null };
  }
  function showReadNotice(stage, payload, disconnected = false) {
    readNotices[stage] = readCopy(stage, payload, disconnected);
    renderReadNotice();
  }
  function clearReadNotice(stage) { readNotices[stage] = null; renderReadNotice(); }
  function renderReadNotice() {
    const notice = one('[data-read-notice]'); if (!notice) return;
    const active = readNotices.status || readNotices.history || readNotices.evidence;
    if (!active) { notice.hidden = true; readIssueDetails = null; return; }
    const heading = one('[data-read-heading]');
    const guidance = one('[data-read-guidance]');
    const changed = heading.textContent !== active.title || guidance.textContent !== active.guidance;
    heading.textContent = active.title; guidance.textContent = active.guidance;
    readIssueDetails = active.details;
    const details = one('[data-read-details]'); details.textContent = active.details || ''; details.hidden = !active.details;
    one('[data-action="copy-read-issue"]').hidden = !active.details;
    notice.hidden = false;
    if (changed) one('[data-read-announcement]').textContent = active.title;
  }
  function runOutcomeCopy(summary) {
    if (summary.state === 'queued' || summary.state === 'running') return summary.state;
    const reason = (summary.diagnostics || []).find(value => ['runner-timeout', 'runner-protocol-invalid', 'input-unsafe'].includes(value));
    if (reason === 'runner-timeout') return 'Runner did not answer in time. Check the runner; saved results remain available.';
    if (reason === 'runner-protocol-invalid') return 'Runner response was unusable. Check runner compatibility; saved results remain available.';
    if (reason === 'input-unsafe') return 'Run input was rejected without a precise cause. Review runner setup and request size; saved results remain available.';
    return ({ completed: summary.outcome === 'failed' ? 'Completed with failed checks' : 'Completed',
      blocked: 'Run blocked before completion', partial: 'Run partially completed',
      interrupted: 'Run interrupted', error: 'Run could not complete' })[summary.state] || 'Run outcome unavailable';
  }
  let detailReturnCaseId = null;
  let visibleDetailCaseId = null;
  let failuresOnly = false, search = '';
  const latestRun = () => Boolean(selectedRunId && latestKnownRunId === selectedRunId);
  function clearSelectedDetail() {
    detailGeneration++;
    resetRepair();
    detail.innerHTML = '<h2>Result detail</h2><p>Select a completed case to inspect it.</p>';
    detailReturnCaseId = null;
    visibleDetailCaseId = null;
  }
  function selectSuite(id) {
    if (!id || suite?.id === id || isActive() || startPending) return;
    suite = suites.find(item => item.id === id) || null;
    if (taskView === 'new-run') showTaskView('results');
    run = null; history = []; selectedRunId = null; latestKnownRunId = null; acceptedRunId = null; runtime = null; review = null;
    if (typeof previewGeneration !== 'undefined') previewGeneration++;
    if (typeof clearPreviewNotice === 'function') clearPreviewNotice();
    runGeneration++; historyGeneration++; detailGeneration++;
    if (typeof runtimeGeneration !== 'undefined') runtimeGeneration++;
    if (typeof strictRuntimeChoices !== 'undefined') strictRuntimeChoices = false;
    setRuntimeState('loading', 'Loading compatible models…');
    clearSelectedDetail();
    activePanel = null; panelReturn = null; side.hidden = true; side.innerHTML = '';
    side.removeAttribute('role'); side.removeAttribute('aria-modal'); side.removeAttribute('aria-label');
    detail.hidden = true; failuresOnly = false; search = '';
    const searchInput = resultContainer.querySelector?.('[data-action="search"]');
    if (searchInput) searchInput.value = '';
    setup = { scope: 'all', caseId: suite?.testCases[0]?.id || '', model: '', judgeModel: '', repeats: 1 };
    renderWorkspace(); void loadRuntime(); void loadHistory();
  }
  function caseStatus(caseId) {
    const item = run?.cases.find(value => value.caseId === caseId);
    if (!item) return { state: 'not-run', failed: 0, attempts: [] };
    const failed = item.attempts.filter(value => value.outcome === 'failed').length;
    const state = item.state === 'not-run' ? 'not-run' : item.state === 'incomplete'
      ? run?.state === 'running' ? 'running' : 'incomplete'
      : failed ? 'failed' : item.attempts.length && item.attempts.every(value => value.outcome === 'passed') ? 'passed' : 'incomplete';
    return { state, failed, attempts: item.attempts };
  }
  function renderWorkspace() {
    one('[data-suite-title]').textContent = suite?.name || 'No eval suites yet';
    one('[data-suite-description]').textContent = suite?.description || '';
    one('[data-action="suite-select"]').value = suite?.id || '';
    for (const item of document.querySelectorAll('[data-action="suite"]')) {
      if (item.dataset.suiteId === suite?.id) item.setAttribute('aria-current','page'); else item.removeAttribute('aria-current');
    }
    for (const action of ['coverage','history','new-run']) { const control = one('[data-action="' + action + '"]'); if (control) control.hidden = !suite; }
    if (taskView === 'new-run' && (isActive() || startPending)) showTaskView('results');
    setupRegion.hidden = taskView !== 'new-run' || !suite;
    const startForm = one('[data-start-form]'); if (startForm) startForm.hidden = startUncertain;
    const reviewAction = setupRegion.querySelector('[data-action="review"]');
    if (reviewAction) reviewAction.disabled = Boolean(!runtime || !setup.model || needsJudge() && !setup.judgeModel);
    refreshSetupControls();
    const historical = run && latestKnownRunId && !latestRun();
    one('[data-latest-label]').textContent = run ? (historical ? 'Past run · read-only' : 'Latest run · ' + new Date(run.createdAt).toLocaleString()) : acceptedRunId ? 'Latest run · queued' : 'Latest run · none';
    const runIds = run?.caseIds || [];
    const visibleCases = run ? [...runIds.map(id => suite?.testCases.find(item => item.id === id) || { id, name: id }),
      ...(suite?.testCases || []).filter(item => !runIds.includes(item.id))] : suite?.testCases || [];
    const statuses = (run ? runIds : visibleCases.map(item => item.id)).map(id => caseStatus(id));
    const passed = statuses.filter(item => item.state === 'passed').length;
    const failed = statuses.filter(item => item.state === 'failed').length;
    const unfinished = statuses.length - passed - failed;
    const excluded = run ? visibleCases.length - runIds.length : 0;
    const summary = !suite ? 'No eval suites yet' : !run ? acceptedRunId ? 'Run queued · loading progress' : suite.testCases.length + ' test cases ready'
      : runOutcomeCopy(run) + ' · ' + passed + ' passed · ' + failed + ' failed · ' + unfinished + ' not finished' + (excluded ? ' · ' + excluded + ' excluded' : '');
    one('[data-status-summary]').textContent = summary;
    if (run) {
      const done = statuses.length - unfinished;
      status(done + '/' + statuses.length + ' complete');
      const metrics = [];
      if (run.finishedAt != null && run.createdAt != null) metrics.push('Elapsed ' + Math.max(0, (run.finishedAt - run.createdAt) / 1000).toFixed(1) + 's');
      if (run.cost != null) metrics.push('Cost ' + run.cost);
      if (run.testedModel) metrics.unshift('Model: ' + run.testedModel);
      one('[data-run-metrics]').textContent = metrics.join(' · ');
    } else if (acceptedRunId) status('Run queued. Loading saved progress…');
    else if (suite) status('0/' + suite.testCases.length + ' complete');
    if (!suite) {
      resultContainer.innerHTML = discovery.status === 'blocked' && discovery.reason === 'unreadable-eval-suites'
        ? '<section class="empty" aria-labelledby="results-title"><h2 id="results-title">Results</h2><p>Results are unavailable until suites can be read.</p></section>'
        : '<section class="empty" aria-labelledby="empty-title"><h2 id="empty-title">No eval suites yet</h2><p>Ask your coding agent:</p><blockquote>Create production-ready Sibu evals for this project.</blockquote><button type="button" data-action="copy-prompt">Copy prompt</button><p data-copy-status role="status"></p></section>';
    detail.innerHTML = ''; detail.hidden = true; return;
    }
    const rows = visibleCases.map(item => ({ ...item, status: run && !runIds.includes(item.id) ? { state: 'excluded', failed: 0, attempts: [] } : caseStatus(item.id) }))
      .filter(item => (!failuresOnly || item.status.state === 'failed') && item.name.toLowerCase().includes(search.toLowerCase()));
    if (visibleDetailCaseId && !rows.some(item => item.id === visibleDetailCaseId)) {
      if (matchMedia('(max-width:699px)').matches && sheetSlot.querySelector('[role="dialog"]')) closeSheet();
      clearSelectedDetail(); detail.hidden = true;
    }
    if (!resultContainer.querySelector?.('.results')) {
      resultContainer.innerHTML = '<section class="results" aria-labelledby="results-title"><div class="section-heading"><h2 id="results-title">Results <small></small></h2><label><input type="checkbox" data-action="failures-only"> Failures only</label><label class="search">Search <input type="search" data-action="search" aria-label="Search cases"></label></div><div class="result-head" aria-hidden="true"><span>Case</span><span>Result</span><span>Attempts</span></div><p data-result-empty hidden></p><ul class="result-list" data-result-list></ul></section>';
    }
    const count = resultContainer.querySelector?.('#results-title small');
    const list = resultContainer.querySelector?.('[data-result-list]');
    const empty = resultContainer.querySelector?.('[data-result-empty]');
    const failureFilter = resultContainer.querySelector?.('[data-action="failures-only"]');
    if (count) count.textContent = String(rows.length);
    if (failureFilter) failureFilter.checked = failuresOnly;
    const focusedCase = list?.contains?.(document.activeElement) ? document.activeElement.closest?.('[data-action="case"]')?.dataset.caseId : null;
    if (list) list.innerHTML = rows.map(item => '<li data-case-status="' + item.status.state + '"><button type="button" data-action="case" data-case-id="' + esc(item.id) + '"' + (item.status.attempts.length ? '' : ' disabled') + '><span class="result-icon" aria-hidden="true">' + (item.status.state === 'passed' ? '✓' : item.status.state === 'failed' ? '✕' : '–') + '</span><span class="result-name"><strong>' + esc(item.name) + '</strong></span><span class="result-status"><span class="result-label">Result: </span>' + esc(item.status.state.replaceAll('-', ' ')) + '</span><span class="result-attempts"><span class="result-label">Attempts: </span>' + item.status.attempts.length + (item.status.failed ? ' · ' + item.status.failed + ' failed' : '') + '</span>' + (item.status.attempts.length ? '<span class="result-open" aria-hidden="true">›</span>' : '') + '</button></li>').join('');
    if (focusedCase) [...list.querySelectorAll('[data-action="case"]')].find(item => item.dataset.caseId === focusedCase)?.focus();
    if (empty) { empty.hidden = rows.length > 0; empty.textContent = search ? 'No test cases match this search.' : failuresOnly ? 'No failed results are visible.' : 'No results yet.'; }
  }
  async function loadHistory() {
    if (!suite) return;
    const current = suite.id, generation = ++historyGeneration;
    try {
      const payload = await json('/api/eval-runs/history?' + new URLSearchParams({ suiteId: current, limit: '50' }));
      if (generation !== historyGeneration || suite?.id !== current) return;
      if (payload.status !== 'ok') { showHistoryReadError(payload); return; }
      historyReadError = false;
      clearReadNotice('history');
      history = payload.value || [];
      latestKnownRunId = acceptedRunId || history[0]?.runId || latestKnownRunId;
      if (!selectedRunId) selectedRunId = history[0]?.runId || null;
      renderWorkspace(); if (activePanel === 'history') renderHistory();
      if (!acceptedRunId && selectedRunId && run?.runId !== selectedRunId) void pollRun();
      if (startUncertain && startReference && startSuiteId === current) {
        await resolveUncertainStart(current, startReference, generation);
      }
    } catch { if (generation === historyGeneration && suite?.id === current) showHistoryReadError(null, true); }
  }
  function showHistoryReadError(payload, disconnected = false) {
    historyReadError = true;
    showReadNotice('history', payload, disconnected);
    if (activePanel === 'history') renderHistory();
  }
  async function resolveUncertainStart(suiteId, reference, generation) {
    try {
      const correlation = await json('/api/eval-runs/history?' + new URLSearchParams({ suiteId, limit: '50', reference }));
      if (generation !== historyGeneration || suite?.id !== suiteId || startReference !== reference || !startUncertain) return;
      if (correlation.status !== 'confirmed' || correlation.suiteId !== suiteId ||
        correlation.reference !== reference.toLowerCase() || !safeRunId(correlation.runId) ||
        !history.some(item => item.runId === correlation.runId)) return;
      const found = await json('/api/eval-runs/status?' + new URLSearchParams({ suiteId, runId: correlation.runId }));
      if (generation !== historyGeneration || suite?.id !== suiteId || startReference !== reference || !startUncertain) return;
      if (found.status !== 'ok' || found.value?.summary?.runId !== correlation.runId) return;
      runGeneration++;
      selectedRunId = correlation.runId; latestKnownRunId = history[0]?.runId || correlation.runId;
      run = found.value.summary;
      startUncertain = false; startReference = null; startSuiteId = null; review = null;
      one('[data-start-notice]').hidden = true;
      clearSelectedDetail(); renderWorkspace();
      if (activePanel === 'history') renderHistory();
      if (isActive()) void pollRun();
    } catch { /* An unreadable correlation or status cannot confirm a start. */ }
  }
  async function pollRun() {
    if (!suite || !selectedRunId) return;
    const current = { suiteId: suite.id, runId: selectedRunId }, generation = ++runGeneration;
    try {
      const payload = await json('/api/eval-runs/status?' + new URLSearchParams(current));
      if (generation !== runGeneration || suite?.id !== current.suiteId || selectedRunId !== current.runId) return;
      if (payload.status !== 'ok') { showReadNotice('status', payload); setTimeout(pollRun, 1200); return; }
      clearReadNotice('status');
      if (payload.value?.summary?.runId !== current.runId) { showReadNotice('status', null); return; }
      const previous = run?.state, previousRunId = run?.runId;
      run = payload.value.summary;
      if (previousRunId && previousRunId !== run.runId) clearSelectedDetail();
      const acceptedFinished = acceptedRunId === current.runId && !['queued', 'running'].includes(run.state);
      if (acceptedFinished) acceptedRunId = null;
      renderWorkspace();
      if (isActive()) setTimeout(pollRun, 700);
      else {
        if (acceptedFinished || previous && ['queued','running'].includes(previous)) {
          void loadHistory();
        }
      }
    } catch { if (generation === runGeneration) { showReadNotice('status', null, true); setTimeout(pollRun, 1200); } }
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
  function closePanel() { activePanel = null; side.hidden = true; side.removeAttribute('role'); side.removeAttribute('aria-modal'); side.removeAttribute('aria-label'); detail.hidden = !detailReturnCaseId; const target = panelReturn; panelReturn = null; target?.focus(); }
  function renderHistory() {
    openPanel('history');
    side.innerHTML = '<div class="section-heading"><h2 tabindex="-1">History</h2><button type="button" data-action="close-panel">Close</button></div>'
      + (historyReadError ? '<p>Saved History could not be read. Previous results are still available.</p><button type="button" data-action="recheck-history">Recheck History</button>' : '')
      + (history.length ? '<ol class="history-list">' + history.map((item, index) => '<li><button type="button" data-action="history-run" data-run-id="' + esc(item.runId) + '"' + (selectedRunId === item.runId ? ' aria-current="true"' : '') + '><strong>' + (index === 0 ? 'Latest run · ' : 'Past run · ') + esc(new Date(item.createdAt).toLocaleString()) + '</strong><br>' + esc(item.testedModel) + ' · ' + esc(item.scope) + ' · ' + esc(item.repeats) + ' repeat(s)<br>' + esc(item.state) + ' / ' + esc(item.outcome) + ' · ' + esc(item.finishedAt ? Math.max(0, item.finishedAt-item.createdAt) + 'ms' : 'Duration unavailable') + ' · Cost ' + esc(item.cost == null ? 'unavailable' : item.cost) + '</button></li>').join('') + '</ol>' : '<p>No saved runs yet.</p>');
  }
  function renderCoverage() {
    openPanel('coverage');
    const coverage = suite?.coverage;
    const gaps = (coverage?.gaps || []).map(item => '<li><strong>' + esc(item.id) + '</strong><p>' + esc(item.reason) + '</p></li>').join('');
    const categories = (coverage?.categories || []).map(item => '<li><strong>' + esc(item.id) + '</strong> — ' + esc(item.status.replaceAll('-', ' ')) + (item.reason ? '<p>' + esc(item.reason) + '</p>' : '') + '</li>').join('');
    side.innerHTML = '<div class="section-heading"><h2 tabindex="-1">Coverage</h2><button type="button" data-action="close-panel">Close</button></div><h3>Known gaps</h3>' + (gaps ? '<ul>' + gaps + '</ul>' : '<p>No known gaps documented.</p>') + '<h3>Coverage categories</h3><ul>' + categories + '</ul>';
    focusPanel();
  }
  async function selectHistoryRun(runId) {
    if (!suite || !history.some(item => item.runId === runId)) return;
    const current = { suiteId: suite.id, runId }, priorSelection = selectedRunId, generation = ++runGeneration;
    try {
      const payload = await json('/api/eval-runs/status?' + new URLSearchParams(current));
      if (generation !== runGeneration || suite?.id !== current.suiteId || selectedRunId !== priorSelection || !history.some(item => item.runId === runId)) return;
      if (payload.status !== 'ok' || payload.value?.summary?.runId !== runId) {
        showReadNotice('status', payload); return;
      }
      clearReadNotice('status');
      selectedRunId = runId;
      run = payload.value.summary;
      clearSelectedDetail();
      if (taskView === 'new-run') showTaskView('results');
      closePanel();
      renderWorkspace();
      if (isActive()) setTimeout(pollRun, 700);
    } catch {
      if (generation === runGeneration && suite?.id === current.suiteId && selectedRunId === priorSelection) showReadNotice('status', null, true);
    }
  }
  async function inspectCase(caseId, attempt, requestedAssertionId = null) {
    if (!run || !suite) return;
    const switchingCase = visibleDetailCaseId !== null && visibleDetailCaseId !== caseId;
    visibleDetailCaseId = caseId;
    const current = { suiteId: suite.id, runId: run.runId, caseId }, generation = ++detailGeneration;
    function showEvidenceState(message) {
      const html = '<h2>Result detail</h2><p>' + esc(message) + '</p>';
      detail.innerHTML = html;
      detail.hidden = false;
      if (matchMedia('(max-width:699px)').matches) openSheet('Result detail', html, '<button type="button" data-action="close-sheet">Close</button>');
    }
    const previousDetail = switchingCase ? '' : detail.innerHTML;
    const switchingAssertion = requestedAssertionId !== null;
    if (switchingCase || switchingAssertion) {
      resetRepair();
      showEvidenceState(switchingAssertion ? 'Loading selected evidence for ' + requestedAssertionId + '…' : 'Loading selected evidence…');
    } else if (!previousDetail.includes('detail-section')) showEvidenceState('Loading selected evidence…');
    const query = new URLSearchParams({ ...current, attempt: String(attempt) });
    try {
      const payload = await json('/api/eval-runs/status?' + query);
      if (generation !== detailGeneration || activePanel || suite?.id !== current.suiteId || run?.runId !== current.runId || visibleDetailCaseId !== caseId) return;
      if (payload.status !== 'ok' || payload.value.evidenceStatus !== 'available') {
        showReadNotice('evidence', payload.status === 'ok' ? null : payload);
        if (!switchingAssertion && previousDetail.includes('detail-section')) detail.innerHTML = previousDetail;
        else showEvidenceState('Selected evidence is unavailable. Previous results remain available.');
        return;
      }
      const failed = payload.value.evidence.assertions.filter(item => item.outcome === 'failed');
      const assertionId = failed.find(item => item.id === requestedAssertionId)?.id || failed[0]?.id;
      if (assertionId) query.set('assertionId', assertionId);
      const selected = assertionId ? await json('/api/eval-runs/status?' + query) : payload;
      if (generation !== detailGeneration || activePanel || suite?.id !== current.suiteId || run?.runId !== current.runId || visibleDetailCaseId !== caseId) return;
      if (selected.status !== 'ok' || selected.value.evidenceStatus !== 'available') {
        showReadNotice('evidence', selected.status === 'ok' ? null : selected);
        if (!switchingAssertion && previousDetail.includes('detail-section')) detail.innerHTML = previousDetail;
        else showEvidenceState('Selected evidence is unavailable. Previous results remain available.');
        return;
      }
      clearReadNotice('evidence'); resetRepair();
      const evidence = selected.value.evidence;
      const assertion = assertionId ? evidence.assertions.find(item => item.id === assertionId) : null;
      const attempts = run.cases.find(item => item.caseId === caseId)?.attempts || [];
      selectedFailure = latestRun() && assertionId ? { suiteId: suite.id, runId: run.runId, testCaseId: caseId, attempt, assertionId, evalRunModelId: run.testedModel, runScope: run.scope === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: caseId } } : null;
      const html = renderCaseDetail({ suiteName: suite.name, runId: run.runId, caseId,
        caseName: suite.testCases.find(item => item.id === caseId)?.name || caseId,
        attempt, attempts, evidence, selectedCheck: assertion, latest: latestRun() });
      detail.innerHTML = html;
      if (matchMedia('(max-width:699px)').matches) openSheet('Result detail', html, '<button type="button" data-action="close-sheet">Close</button>');
      else detail.querySelector('h2')?.focus();
    } catch { if (generation === detailGeneration && !activePanel && suite?.id === current.suiteId && run?.runId === current.runId && visibleDetailCaseId === caseId) {
      showReadNotice('evidence', null, true);
      if (!switchingAssertion && previousDetail.includes('detail-section')) detail.innerHTML = previousDetail;
      else showEvidenceState('Selected evidence could not be loaded. Previous results remain available.');
    } }
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    if (target.dataset.action === 'recheck-read') {
      if (readNotices.status && selectedRunId) void pollRun();
      else if (readNotices.history) void loadHistory();
      else if (readNotices.evidence && detailReturnCaseId) {
        const attempts = run?.cases.find(item => item.caseId === detailReturnCaseId)?.attempts || [];
        void inspectCase(detailReturnCaseId, attempts.find(item => item.outcome === 'failed')?.number || attempts[0]?.number || 1);
      }
    }
    if (target.dataset.action === 'recheck-history') void loadHistory();
    if (target.dataset.action === 'copy-read-issue' && readIssueDetails) {
      const details = readIssueDetails;
      if (!navigator.clipboard?.writeText) one('[data-read-copy-status]').textContent = 'Copy unavailable. Select the issue details above.';
      else void navigator.clipboard.writeText(details).then(() => { one('[data-read-copy-status]').textContent = 'Issue details copied'; },
        () => { one('[data-read-copy-status]').textContent = 'Copy unavailable. Select the issue details above.'; });
    }
    if (target.dataset.action === 'coverage') { detailGeneration++; renderCoverage(); }
    if (target.dataset.action === 'history') { void loadHistory(); renderHistory(); focusPanel(); }
    if (target.dataset.action === 'new-run') showTaskView('new-run');
    if (target.dataset.action === 'return-results') showTaskView('results');
    if (target.dataset.action === 'close-panel') closePanel();
    if (target.dataset.action === 'close-detail') { if (sheetSlot.querySelector('[role="dialog"]')) closeSheet(); else { detailGeneration++; resetRepair(); detail.innerHTML = ''; detail.hidden = true; visibleDetailCaseId = null; returnToResult(); } }
    if (target.dataset.action === 'case') { detailReturnCaseId = target.dataset.caseId; const attempts = run?.cases.find(item => item.caseId === target.dataset.caseId)?.attempts || []; void inspectCase(target.dataset.caseId, attempts.find(item => item.outcome === 'failed')?.number || attempts[0]?.number || 1); }
    if (target.dataset.action === 'history-run') {
      if (acceptedRunId) { status('Wait for the current run to finish before opening another run.'); return; }
      void selectHistoryRun(target.dataset.runId);
    }
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-action="failures-only"]')) { failuresOnly = event.target.checked; renderWorkspace(); }
    if (event.target.matches('[data-action="attempt-select"]')) void inspectCase(event.target.dataset.caseId, Number(event.target.value));
    if (event.target.matches('[data-action="assertion-select"]')) void inspectCase(event.target.dataset.caseId, Number(event.target.dataset.attempt), event.target.value);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && taskView === 'new-run' && side.hidden && !sheetSlot.querySelector('[role="dialog"]')) {
      event.preventDefault(); showTaskView('results'); return;
    }
    if (side.hidden || side.getAttribute('role') !== 'dialog') return;
    if (event.key === 'Escape') { event.preventDefault(); closePanel(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...side.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')];
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === side.querySelector('h2') || !side.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !side.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('input', event => { if (event.target.matches('[data-action="search"]')) { search = event.target.value; renderWorkspace(); } });
  setup.caseId = suite?.testCases[0]?.id || '';
  void loadDiscovery(); void loadRuntime(); void loadHistory();
`;
