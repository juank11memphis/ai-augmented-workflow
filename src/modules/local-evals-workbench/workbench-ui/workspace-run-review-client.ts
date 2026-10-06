export const WORKSPACE_RUN_REVIEW_CLIENT = String.raw`
  async function showReview() {
    readSetup();
    if (!runtime || !setup.model || needsJudge() && !setup.judgeModel || !Number.isInteger(setup.repeats) || setup.repeats < 1 || setup.repeats > 20) {
      one('[data-setup-status]').textContent = needsJudge() && !setup.judgeModel ? 'Choose a compatible Judge model.' : 'Choose a compatible model and repeat count from 1 to 20.'; return;
    }
    const request = command(), descriptionGeneration = runtimeGeneration, requestGeneration = ++previewGeneration;
    one('[data-setup-status]').textContent = 'Checking calls and cost…';
    try {
      const result = await post('/api/eval-runs/preview', request);
      if (descriptionGeneration !== runtimeGeneration || requestGeneration !== previewGeneration ||
        JSON.stringify(request) !== JSON.stringify(command()) || !setupRegion?.isConnected || startPending || startUncertain || isActive()) return;
      if (result.status !== 'ready') { previewFailure(result); return; }
      review = { request, result, descriptionGeneration };
      const cost = result.cost?.status === 'available' ? result.cost.currency + ' ' + result.cost.amount : 'Unavailable (estimate not confirmed)';
      const selectedCase = suite.testCases.find(item => item.id === result.selectedCaseIds[0]);
      const scope = request.scope.type === 'all' ? 'All ' + result.selectedCaseIds.length + ' cases' : '1 test case';
      const content = '<p>' + esc(suite.name) + '</p><dl><div><dt>Scope</dt><dd>' + esc(scope) + '</dd></div>'
        + (request.scope.type === 'test_case' ? '<div><dt>Test case</dt><dd>' + esc(selectedCase?.name || request.scope.testCaseId) + '</dd></div>' : '')
        + '<div><dt>Repeats</dt><dd>' + esc(result.repeats) + '</dd></div><div><dt>Model</dt><dd>' + esc(result.model) + '</dd></div>'
        + (result.judgeModel ? '<div><dt>Judge</dt><dd>' + esc(result.judgeModel) + '</dd></div>' : '')
        + '<div><dt>Expected calls</dt><dd>' + esc(result.totalCalls) + '</dd></div><div><dt>Estimated cost</dt><dd>' + esc(cost) + '</dd></div></dl><p>Actual cost may vary.</p><p role="status" data-review-status></p>';
      sheetReturn = setupRegion.querySelector('[data-action="review"]') || sheetReturn;
      openSheet('Review run', content, '<button type="button" data-action="back-setup">Back</button><button class="primary" type="button" data-action="start">Start run</button>');
    } catch { if (descriptionGeneration === runtimeGeneration && requestGeneration === previewGeneration &&
      JSON.stringify(request) === JSON.stringify(command()) && setupRegion?.isConnected) {
      showPreviewNotice('Preview not confirmed', 'The preview received no response. Check the connection and preview again. A matching terminal event may not exist.');
    } }
  }
  async function startRun() {
    if (!review || startPending || startUncertain || isActive()) return;
    if (review.descriptionGeneration !== undefined &&
      (review.descriptionGeneration !== runtimeGeneration || JSON.stringify(review.request) !== JSON.stringify(command()))) {
      review = null;
      closeSheet();
      return;
    }
    const reference = globalThis.crypto?.randomUUID?.();
    if (!safeReference(reference)) {
      showStartNotice('Run start unavailable', 'Sibu could not prepare a safe start reference. Check browser support before reviewing again.');
      return;
    }
    startReference = reference;
    startSuiteId = suite.id;
    const { request, result } = review; startPending = true;
    if (setupRegion) setupRegion.hidden = true;
    status('Starting run…');
    const button = sheetSlot.querySelector('[data-action="start"]'); if (button) button.disabled = true;
    try {
      const response = await fetch('/api/eval-runs/start', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sibu-request-reference': reference },
        body: JSON.stringify({ ...request, review: { selectedCaseIds: result.selectedCaseIds, targetCalls: result.targetCalls, judgeCalls: result.judgeCalls, totalCalls: result.totalCalls, cost: result.cost } }) });
      const payload = await response.json();
      if (response.status !== 202 || payload?.status !== 'queued' || !safeRunId(payload.runId) ||
        payload.suiteId !== request.suiteId || !safeReference(payload.reference) || payload.reference.toLowerCase() !== reference.toLowerCase()) {
        const blocked = response.status !== 202 && blockedStartIssue(payload);
        if (blocked) {
          showStartNotice(blocked.copy.title, blocked.copy.explanation + ' ' + blocked.copy.nextStep, blocked.details, blocked.copy.recoveryAction);
          status('Run start blocked.');
          review = null; startReference = null; startSuiteId = null;
        } else {
          startUncertain = true;
          showStartNotice('Run start not confirmed', 'The response could not confirm the start. The run may already exist. Check History before starting another.', null, 'history');
          status('Run start not confirmed. Check History.');
        }
        if (button) button.disabled = true;
        if (setupRegion) setupRegion.hidden = false;
        const form = one('[data-start-form]'); if (form) form.hidden = startUncertain;
        sheetSlot.textContent = ''; sheetReturn = null;
        one('[data-start-notice]')?.querySelector('[data-start-heading]')?.focus?.();
        return;
      }
      selectedRunId = payload.runId; latestKnownRunId = payload.runId; acceptedRunId = payload.runId; run = null;
      startReference = null; startSuiteId = null;
      closeSheet(); clearSelectedDetail(); renderWorkspace(); status('Run queued. Loading saved progress…');
      void pollRun(); void loadHistory();
    } catch {
      startUncertain = true;
      showStartNotice('Run start not confirmed', 'The connection ended before Sibu could confirm the start. The run may already exist. Check History before starting another. A matching terminal event may not exist.', null, 'history');
      status('Run start not confirmed. Check History.');
      if (setupRegion) setupRegion.hidden = false;
      const form = one('[data-start-form]'); if (form) form.hidden = true;
      sheetSlot.textContent = ''; sheetReturn = null;
      one('[data-start-notice]')?.querySelector('[data-start-heading]')?.focus?.();
    }
    finally { startPending = false; if (button && review && !startUncertain) button.disabled = false; }
  }
`;
