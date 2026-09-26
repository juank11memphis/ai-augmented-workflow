export const WORKBENCH_CLIENT_RUN_SECTION = {
  name: 'run',
  source: String.raw`  let selectedRun = null;
  let runPollGeneration = 0;
  let runDetailGeneration = 0;
  let runPhase = 'idle';
  const runUnavailable = () => runPhase !== 'idle';
  const runKey = (suiteId) => 'sibu-selected-run:' + suiteId;
  function rememberedRun(suiteId) { try { return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(runKey(suiteId)); } catch { return null; } }
  function rememberRun(suiteId, runId) { try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(runKey(suiteId), runId); } catch { /* Polling still works for this page. */ } }
  function rememberSuite(suiteId) { try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('sibu-selected-suite', suiteId); } catch { /* The current page remains usable. */ } }
  function restoreSuite() {
    let suiteId;
    try { suiteId = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('sibu-selected-suite'); } catch { return; }
    if (suiteId && (state.discovery.suites || []).some(suite => suite.id === suiteId) && suiteId !== state.selectedSuiteId) {
      state = { ...state, selectedSuiteId: suiteId, runScope: { type: 'all' } };
      renderReady();
    }
  }
  const runPanel = () => root.querySelector('[data-run-panel]');
  function lockCurrentRun(locked) {
    for (const node of root.querySelectorAll('[data-control="suite"], [data-control="suite-option"], [data-control="model"], [data-control="run"], [data-control="retry-run"], [data-control="retry-cell"], [data-control="rerun-recommendation"], [data-control="preview-start"], [data-control="test-case"], [data-control="judge"], [data-control="repeats"], input[name="runScope"]')) node.disabled = locked;
  }
  function runLabel(manifest) {
    const done = manifest.cases.filter(item => item.state === 'completed').length;
    const current = manifest.cases.find(item => item.state === 'incomplete') || manifest.cases.find(item => item.state === 'not-run');
    const elapsed = Math.max(0, ((manifest.finishedAt || Date.now()) - manifest.createdAt) / 1000).toFixed(1);
    return manifest.state + ' — ' + done + '/' + manifest.cases.length + ' cases, ' + elapsed + 's'
      + (current && (manifest.state === 'queued' || manifest.state === 'running') ? ', current: ' + current.caseId : '')
      + ', cost unavailable';
  }
  function renderSelectedRun(summary) {
    const panel = runPanel();
    if (!panel) return;
    panel.hidden = false;
    const active = summary.state === 'queued' || summary.state === 'running';
    if (!active) runPollGeneration++;
    const passed = summary.cases.filter(item => item.attempts[0]?.outcome === 'passed').length;
    const failed = summary.cases.filter(item => item.attempts[0]?.outcome === 'failed').length;
    panel.innerHTML = '<h3 tabindex="-1" data-run-status-heading>Run ' + h(summary.state) + '</h3><p role="status" aria-live="polite" data-run-progress></p>'
      + '<p>' + h(passed) + ' passed, ' + h(failed) + ' failed. '
      + h(summary.cases.length - passed - failed) + ' not finished.</p>'
      + (summary.diagnostics?.length ? '<p>Run diagnostics: ' + summary.diagnostics.map(h).join(', ') + '</p>' : '') + '<ul>'
      + summary.cases.map(item => '<li>' + h(item.caseId) + ': ' + h(item.state)
        + (item.attempts[0] ? ' <button type="button" data-run-detail="' + h(item.caseId) + '">Inspect ' + (item.attempts[0].outcome === 'incomplete' ? 'partial evidence' : 'result') + '</button>' : '') + '</li>').join('')
      + '</ul><div data-run-detail-panel></div>';
    panel.querySelector('[data-run-progress]').textContent = runLabel(summary);
    runPhase = active ? 'active' : 'idle';
    lockCurrentRun(runUnavailable());
    if (!active) panel.querySelector('[data-run-status-heading]')?.focus();
  }
  async function pollSelectedRun() {
    if (!selectedRun) return;
    const generation = ++runPollGeneration;
    const selected = selectedRun;
    try {
      const query = new URLSearchParams({ suiteId: selected.suiteId, runId: selected.runId });
      const response = await fetch('/api/eval-runs/status?' + query);
      const payload = await response.json();
      if (generation !== runPollGeneration || selected !== selectedRun || selected.suiteId !== state.selectedSuiteId) return;
      if (payload.status === 'ok') {
        renderSelectedRun(payload.value.summary);
        if (['queued', 'running'].includes(payload.value.summary.state)) setTimeout(pollSelectedRun, 600);
      } else { previewStatus('Run status is temporarily unavailable. Retrying.'); setTimeout(pollSelectedRun, 1000); }
    } catch {
      if (generation === runPollGeneration && selected === selectedRun) {
        previewStatus('Connection lost. Reconnecting to this run.');
        setTimeout(pollSelectedRun, 1000);
      }
    }
  }
  async function startReviewedRun(command, review) {
    if (runUnavailable()) return false;
    runPhase = 'pending';
    lockCurrentRun(true);
    try {
      const response = await fetch('/api/eval-runs/start', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...command, review: { selectedCaseIds: review.selectedCaseIds, targetCalls: review.targetCalls,
          judgeCalls: review.judgeCalls, totalCalls: review.totalCalls, cost: review.cost } }) });
      const result = await response.json();
      if (result.status !== 'queued') { previewStatus(previewBlockMessage(result.reason)); return false; }
      selectedRun = { suiteId: result.suiteId, runId: result.runId };
      runPhase = 'active';
      rememberSuite(result.suiteId);
      rememberRun(result.suiteId, result.runId);
      previewStatus('Run queued. Progress is saved locally.');
      void pollSelectedRun();
      return true;
    } catch {
      previewStatus('Start status is uncertain. Check run history before starting again.');
      return false;
    } finally { if (runPhase === 'pending') runPhase = 'idle'; lockCurrentRun(runUnavailable()); }
  }
  async function inspectRunCase(caseId) {
    if (!selectedRun) return;
    const generation = ++runDetailGeneration;
    const selected = selectedRun;
    const query = new URLSearchParams({ suiteId: selected.suiteId, runId: selected.runId, caseId, attempt: '1' });
    const target = runPanel()?.querySelector('[data-run-detail-panel]');
    if (!target) return;
    target.textContent = 'Loading selected result…';
    try {
      const response = await fetch('/api/eval-runs/status?' + query);
      const payload = await response.json();
      if (generation !== runDetailGeneration || selected !== selectedRun) return;
      target.textContent = '';
      if (payload.status !== 'ok' || payload.value.evidenceStatus !== 'available') { target.textContent = 'Selected evidence is unavailable.'; return; }
      const evidence = payload.value.evidence;
      const heading = document.createElement('h4'); heading.textContent = caseId + ' result'; target.append(heading);
      const status = document.createElement('p'); status.textContent = 'Attempt: ' + evidence.outcome; target.append(status);
      for (const diagnostic of [...(evidence.diagnostics || []), ...(evidence.assertions || []).flatMap(item => item.diagnostics || [])]) {
        const item = document.createElement('p'); item.textContent = 'Diagnostic: ' + diagnostic; target.append(item);
      }
      for (const assertion of evidence.assertions) {
        const item = document.createElement('p');
        item.textContent = assertion.id + ': ' + assertion.outcome + '. Expected: ' + assertion.expected + '. Actual: ' + assertion.actual;
        target.append(item);
      }
      const details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = 'Bounded raw output'; details.append(summary);
      const output = document.createElement('pre'); output.textContent = evidence.output; details.append(output); target.append(details);
    } catch { if (generation === runDetailGeneration) target.textContent = 'Selected evidence could not be loaded.'; }
  }
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-run-detail]');
    if (button) void inspectRunCase(button.dataset.runDetail);
  });
  function restoreSelectedRun() {
    const runId = rememberedRun(state.selectedSuiteId);
    if (runId) { selectedRun = { suiteId: state.selectedSuiteId, runId }; runPhase = 'active'; lockCurrentRun(true); void pollSelectedRun(); }
  }
  restoreSuite();
  restoreSelectedRun();`,
} as const;
