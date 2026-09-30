export const WORKSPACE_SETUP_CLIENT = String.raw`
  const root = document.querySelector('[data-workspace]');
  const discovery = JSON.parse(document.getElementById('sibu-workspace-state').textContent || '{}');
  if (!root) return;
  const suites = discovery.suites || [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let suite = suites[0] || null;
  let run = null, history = [], selectedRunId = null, latestKnownRunId = null, acceptedRunId = null, runtime = null, review = null;
  let runGeneration = 0, historyGeneration = 0, detailGeneration = 0, runtimeGeneration = 0, previewGeneration = 0;
  let strictRuntimeChoices = false;
  let runtimeState = 'loading', runtimeMessage = 'Loading compatible models…';
  let setup = { scope: 'all', caseId: '', model: '', judgeModel: '', repeats: 1 };
  let sheetReturn = null, startPending = false, startUncertain = false, activePanel = null;
  const one = selector => document.querySelector(selector);
  const sheetSlot = one('[data-sheet-slot]');
  const setupRegion = one('[data-run-setup]');
  const selectedCaseIds = () => setup.scope === 'all' ? (suite?.testCases || []).map(item => item.id) : [setup.caseId];
  const needsJudge = () => selectedCaseIds().some(id => (runtime?.rubricCaseIds || []).includes(id));
  const isActive = () => Boolean(acceptedRunId || run && ['queued', 'running'].includes(run.state));
  const json = async (url, options) => (await fetch(url, options)).json();
  const post = (url, body) => json(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const command = () => ({ suiteId: suite.id, scope: setup.scope === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: setup.caseId }, model: setup.model, judgeModel: needsJudge() ? setup.judgeModel || null : null, repeats: Number(setup.repeats) });
  function blockedModelMessage(reason) {
    switch (reason) {
      case 'model-unavailable': return 'This suite listed no models. Update its supported models, then restart Sibu Evals.';
      case 'judge-unavailable': return 'This suite listed no compatible Judge models. Check its Judge model setup, then restart Sibu Evals.';
      case 'runner-unavailable': return "This suite's eval runner could not start. Check the suite setup, then restart Sibu Evals.";
      case 'runner-invalid': return "This suite's eval runner returned an invalid description. Check the suite setup, then restart Sibu Evals.";
      case 'environment-missing': return 'This suite needs server-side setup before its models can be checked. Check the suite requirements in the terminal that starts Sibu Evals, then restart Sibu Evals.';
      case 'capability-unsupported': return 'This suite needs runner capabilities that are not available. Check its runner setup, then restart Sibu Evals.';
      default: return 'Compatible models could not be checked. Check the suite setup, then try again.';
    }
  }
  function setRuntimeState(state, message) {
    runtimeState = state; runtimeMessage = message;
    const announcement = one('[data-setup-status]');
    if (announcement && announcement.textContent !== message) announcement.textContent = message;
  }
  function status(message) { const node = one('[data-progress]'); if (node && node.textContent !== message) node.textContent = message; }
  function openSheet(title, content, actions) {
    if (!sheetReturn) sheetReturn = document.activeElement;
    sheetSlot.innerHTML = '<div class="sheet-overlay"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="sheet-header"><h2 id="sheet-title">' + esc(title) + '</h2><button type="button" data-action="close-sheet" aria-label="Close ' + esc(title) + '">×</button></div>' + content + '<div class="sheet-actions">' + actions + '</div></section></div>';
    sheetSlot.querySelector('button')?.focus();
  }
  function closeSheet() {
    if (review) { review = null; previewGeneration++; }
    detailGeneration++; resetRepair(); sheetSlot.textContent = '';
    const target = sheetReturn; sheetReturn = null; target?.focus();
  }
  function trapSheet(event) {
    const dialog = sheetSlot.querySelector('[role="dialog"]');
    if (!dialog) return;
    if (event.key === 'Escape') { event.preventDefault(); closeSheet(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary')].filter(node => !node.closest('[hidden]'));
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
  function setupMarkup() {
    const cases = (suite?.testCases || []).map(item => '<option value="' + esc(item.id) + '"' + (setup.caseId === item.id ? ' selected' : '') + '>' + esc(item.name) + '</option>').join('');
    const models = (runtime?.models || []).map(id => '<option value="' + esc(id) + '"' + (setup.model === id ? ' selected' : '') + '>' + esc(id) + '</option>').join('');
    const judges = (runtime?.judgeModels || []).map(id => '<option value="' + esc(id) + '"' + (setup.judgeModel === id ? ' selected' : '') + '>' + esc(id) + '</option>').join('');
    return '<fieldset><legend>Run scope</legend><label><input type="radio" name="scope" value="all"' + (setup.scope === 'all' ? ' checked' : '') + '> All ' + esc(suite?.testCases.length || 0) + ' cases</label><label><input type="radio" name="scope" value="one"' + (setup.scope === 'one' ? ' checked' : '') + '> One case</label></fieldset>'
      + '<label class="field" data-case-field' + (setup.scope === 'one' ? '' : ' hidden') + '>Test case<select data-field="case">' + cases + '</select></label>'
      + '<label class="field">Model being tested<select data-field="model" aria-describedby="model-readiness"' + (runtimeState === 'ready' ? '' : ' disabled') + '><option value="">Choose model</option>' + models + '</select></label>'
      + '<p id="model-readiness" data-model-readiness>' + esc(runtimeMessage) + '</p>'
      + '<details><summary>Model support</summary><p>Tests can use models supported by this suite. Sibu\'s built-in analysis and repair help currently uses OpenAI. More providers are planned.</p></details>'
      + (needsJudge() ? '<label class="field">Judge model<select data-field="judge"><option value="">Choose Judge model</option>' + judges + '</select></label>' : '')
      + '<details><summary>Repeat cases</summary><label class="field">Repeats<input type="number" data-field="repeats" min="1" max="20" step="1" value="' + esc(setup.repeats) + '"></label></details>';
  }
  function showSetup() {
    if (!suite || isActive() || startPending || startUncertain) return;
    resetRepair();
    review = null; previewGeneration++;
    if (sheetSlot.querySelector('[role="dialog"]')) closeSheet();
    setupRegion.querySelector('[data-action="review"]')?.focus();
  }
  function refreshSetupControls() {
    const fields = setupRegion?.querySelector('[data-setup-fields]');
    if (!fields) return;
    const focused = document.activeElement;
    const selector = focused?.name === 'scope' ? 'input[name="scope"][value="' + setup.scope + '"]'
      : focused?.dataset?.field ? '[data-field="' + focused.dataset.field + '"]' : null;
    fields.innerHTML = setupMarkup();
    const reviewAction = setupRegion.querySelector('[data-action="review"]');
    if (reviewAction) reviewAction.disabled = Boolean(runtimeState !== 'ready' || !setup.model || needsJudge() && !setup.judgeModel);
    if (selector) fields.querySelector(selector)?.focus();
  }
  function readSetup() {
    const judge = setupRegion.querySelector('[data-field="judge"]');
    setup = { scope: setupRegion.querySelector('input[name="scope"]:checked')?.value || 'all', caseId: setupRegion.querySelector('[data-field="case"]')?.value || '', model: setupRegion.querySelector('[data-field="model"]')?.value || '', judgeModel: judge ? judge.value : setup.judgeModel, repeats: Number(setupRegion.querySelector('[data-field="repeats"]')?.value || 1) };
    review = null; previewGeneration++;
    const reviewAction = setupRegion.querySelector('[data-action="review"]');
    if (reviewAction) reviewAction.disabled = Boolean(runtimeState !== 'ready' || !setup.model || needsJudge() && !setup.judgeModel);
  }
  async function loadRuntime() {
    if (!suite) return;
    const current = suite.id, generation = ++runtimeGeneration, hadModel = Boolean(setup.model), hadJudge = Boolean(setup.judgeModel);
    runtime = null; review = null; previewGeneration++;
    setRuntimeState('loading', 'Loading compatible models…');
    refreshSetupControls();
    try {
      const payload = await post('/api/eval-suites/describe', { suiteId: current });
      if (suite?.id !== current || generation !== runtimeGeneration) return;
      if (payload.status !== 'ready') { setRuntimeState('blocked', blockedModelMessage(payload.reason)); refreshSetupControls(); return; }
      if (!payload.models?.length) { setRuntimeState('blocked', blockedModelMessage('model-unavailable')); refreshSetupControls(); return; }
      runtime = payload;
      if (!(payload.models || []).includes(setup.model)) setup.model = strictRuntimeChoices || hadModel ? '' : payload.models[0];
      if (!(payload.judgeModels || []).includes(setup.judgeModel)) setup.judgeModel = strictRuntimeChoices || hadJudge ? '' : payload.judgeModels?.[0] || '';
      setRuntimeState('ready', (strictRuntimeChoices || hadModel || hadJudge) && (!setup.model || needsJudge() && !setup.judgeModel)
        ? 'Previous model choice is unavailable. Choose compatible models before review.' : 'Compatible models ready.');
      if (strictRuntimeChoices && (!setup.model || needsJudge() && !setup.judgeModel)) status('Previous model choice is unavailable. Choose compatible models before review.');
      strictRuntimeChoices = false;
      refreshSetupControls();
    } catch { if (suite?.id === current && generation === runtimeGeneration) { setRuntimeState('blocked', blockedModelMessage('unknown')); refreshSetupControls(); } }
  }
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
      if (result.status !== 'ready') { one('[data-setup-status]').textContent = 'Run cannot be reviewed: ' + (result.reason || 'check local setup'); return; }
      review = { request, result };
      const cost = result.cost?.status === 'available' ? result.cost.currency + ' ' + result.cost.amount : 'Cost unavailable: ' + (result.cost?.reason || 'estimate unavailable');
      const selectedCase = suite.testCases.find(item => item.id === result.selectedCaseIds[0]);
      const scope = request.scope.type === 'all' ? 'All ' + result.selectedCaseIds.length + ' cases' : '1 test case';
      const content = '<p>' + esc(suite.name) + '</p><dl><div><dt>Scope</dt><dd>' + esc(scope) + '</dd></div>'
        + (request.scope.type === 'test_case' ? '<div><dt>Test case</dt><dd>' + esc(selectedCase?.name || request.scope.testCaseId) + '</dd></div>' : '')
        + '<div><dt>Repeats</dt><dd>' + esc(result.repeats) + '</dd></div><div><dt>Model</dt><dd>' + esc(result.model) + '</dd></div>'
        + (result.judgeModel ? '<div><dt>Judge</dt><dd>' + esc(result.judgeModel) + '</dd></div>' : '')
        + '<div><dt>Expected calls</dt><dd>' + esc(result.totalCalls) + '</dd></div><div><dt>Estimated cost</dt><dd>' + esc(cost) + '</dd></div></dl><p>Actual cost may vary.</p><p role="status" data-review-status></p>';
      sheetReturn = setupRegion.querySelector('[data-action="review"]') || sheetReturn;
      openSheet('Review run', content, '<button type="button" data-action="back-setup">Back</button><button class="primary" type="button" data-action="start">Start run</button>');
    } catch { const node = one('[data-setup-status]'); if (descriptionGeneration === runtimeGeneration && requestGeneration === previewGeneration && node) node.textContent = 'Run preview could not finish. Try again.'; }
  }
  async function startRun() {
    if (!review || startPending || startUncertain || isActive()) return;
    const { request, result } = review; startPending = true;
    if (setupRegion) setupRegion.hidden = true;
    status('Starting run…');
    const button = sheetSlot.querySelector('[data-action="start"]'); if (button) button.disabled = true;
    try {
      const payload = await post('/api/eval-runs/start', { ...request, review: { selectedCaseIds: result.selectedCaseIds, targetCalls: result.targetCalls, judgeCalls: result.judgeCalls, totalCalls: result.totalCalls, cost: result.cost } });
      if (payload.status !== 'queued') {
        const message = 'Run was not started: ' + (payload.reason || 'review it again') + '. Check History before reviewing again.';
        const reviewStatus = sheetSlot.querySelector('[data-review-status]');
        if (reviewStatus) reviewStatus.textContent = message;
        status(message); review = null; if (button) button.disabled = true;
        if (setupRegion) setupRegion.hidden = false;
        return;
      }
      selectedRunId = payload.runId; latestKnownRunId = payload.runId; acceptedRunId = payload.runId; run = null;
      closeSheet(); clearSelectedDetail(); renderWorkspace(); status('Run queued. Loading saved progress…');
      void pollRun(); void loadHistory();
    } catch {
      startUncertain = true;
      const message = 'Start status is uncertain. Check History before starting again.';
      const reviewStatus = sheetSlot.querySelector('[data-review-status]');
      if (reviewStatus) reviewStatus.textContent = message;
      status(message);
    }
    finally { startPending = false; if (button && review && !startUncertain) button.disabled = false; }
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    if (target.dataset.action === 'suite') selectSuite(target.dataset.suiteId);
    if (target.dataset.action === 'copy-prompt') { navigator.clipboard?.writeText('Create production-ready Sibu evals for this project.').then(() => { const node = one('[data-copy-status]'); if (node) node.textContent = 'Prompt copied.'; }).catch(() => { const node = one('[data-copy-status]'); if (node) node.textContent = 'Copy failed. Select the prompt text instead.'; }); }
    if (target.dataset.action === 'close-sheet') closeSheet();
    if (target.dataset.action === 'review') void showReview();
    if (target.dataset.action === 'back-setup') showSetup();
    if (target.dataset.action === 'start') void startRun();
  });
  document.addEventListener('keydown', event => { if (sheetSlot.querySelector('[role="dialog"]')) trapSheet(event); });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-action="suite-select"]')) selectSuite(event.target.value);
    if (event.target.matches('input[name="scope"]')) { readSetup(); refreshSetupControls(); }
    if (event.target.matches('[data-field]')) { readSetup(); if (event.target.matches('[data-field="case"]')) refreshSetupControls(); }
  });
`;
