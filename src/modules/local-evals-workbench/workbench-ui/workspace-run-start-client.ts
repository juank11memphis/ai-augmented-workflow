export const WORKSPACE_RUN_START_CLIENT = String.raw`
  async function startRun() {
    readSetup();
    if (!runtime || !setup.model || needsJudge() && !setup.judgeModel) {
      one('[data-setup-status]').textContent = needsJudge() && !setup.judgeModel ? 'Choose a compatible Judge model.' : 'Choose a compatible model.';
      return;
    }
    if (startPending || startUncertain || isActive()) return;
    const reference = globalThis.crypto?.randomUUID?.();
    if (!safeReference(reference)) {
      showStartNotice('Run start unavailable', 'Sibu could not prepare a safe start reference. Check browser support before trying again.');
      return;
    }
    const request = command();
    startReference = reference;
    startSuiteId = suite.id;
    startPending = true;
    const button = setupRegion.querySelector('[data-action="start"]');
    if (button) button.disabled = true;
    status('Starting run…');
    try {
      const response = await fetch('/api/eval-runs/start', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sibu-request-reference': reference },
        body: JSON.stringify(request) });
      const payload = await response.json();
      if (response.status !== 202 || payload?.status !== 'queued' || !safeRunId(payload.runId) ||
        payload.suiteId !== request.suiteId || !safeReference(payload.reference) || payload.reference.toLowerCase() !== reference.toLowerCase()) {
        const blocked = response.status !== 202 && blockedStartIssue(payload);
        if (blocked) {
          showStartNotice(blocked.copy.title, blocked.copy.explanation + ' ' + blocked.copy.nextStep, blocked.details, blocked.copy.recoveryAction);
          status('Run start blocked.');
          startReference = null; startSuiteId = null;
        } else {
          startUncertain = true;
          showStartNotice('Run start not confirmed', 'The response could not confirm the start. The run may already exist. Check History before starting another.', null, 'history');
          status('Run start not confirmed. Check History.');
        }
        const form = one('[data-start-form]'); if (form) form.hidden = startUncertain;
        one('[data-start-notice]')?.querySelector('[data-start-heading]')?.focus?.();
        return;
      }
      selectedRunId = payload.runId; latestKnownRunId = payload.runId; acceptedRunId = payload.runId; run = null;
      startReference = null; startSuiteId = null;
      clearSelectedDetail(); renderWorkspace(); status('Run queued. Loading saved progress…');
      void pollRun(); void loadHistory();
    } catch {
      startUncertain = true;
      showStartNotice('Run start not confirmed', 'The connection ended before Sibu could confirm the start. The run may already exist. Check History before starting another. A matching terminal event may not exist.', null, 'history');
      status('Run start not confirmed. Check History.');
      const form = one('[data-start-form]'); if (form) form.hidden = true;
      one('[data-start-notice]')?.querySelector('[data-start-heading]')?.focus?.();
    } finally {
      startPending = false;
      if (button && !startUncertain && !isActive()) button.disabled = false;
    }
  }
`;
