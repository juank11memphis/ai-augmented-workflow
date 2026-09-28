export const WORKSPACE_SETUP_CLIENT = String.raw`
  const root = document.querySelector('[data-workspace]');
  const discovery = JSON.parse(document.getElementById('sibu-workspace-state').textContent || '{}');
  if (!root) return;
  const suites = discovery.suites || [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let suite = suites[0] || null;
  let run = null, history = [], selectedRunId = null, latestKnownRunId = null, acceptedRunId = null, runtime = null, review = null;
  let runGeneration = 0, historyGeneration = 0, detailGeneration = 0, runtimeGeneration = 0;
  let strictRuntimeChoices = false;
  let setup = { scope: 'all', caseId: '', model: '', judgeModel: '', repeats: 1 };
  let sheetReturn = null, startPending = false, startUncertain = false, activePanel = null;
  const one = selector => document.querySelector(selector);
  const sheetSlot = one('[data-sheet-slot]');
  const selectedCaseIds = () => setup.scope === 'all' ? (suite?.testCases || []).map(item => item.id) : [setup.caseId];
  const needsJudge = () => selectedCaseIds().some(id => (runtime?.rubricCaseIds || []).includes(id));
  const isActive = () => Boolean(acceptedRunId || run && ['queued', 'running'].includes(run.state));
  const json = async (url, options) => (await fetch(url, options)).json();
  const post = (url, body) => json(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const command = () => ({ suiteId: suite.id, scope: setup.scope === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: setup.caseId }, model: setup.model, judgeModel: needsJudge() ? setup.judgeModel || null : null, repeats: Number(setup.repeats) });
  function status(message) { const node = one('[data-progress]'); if (node && node.textContent !== message) node.textContent = message; }
  function openSheet(title, content, actions) {
    if (!sheetReturn) sheetReturn = document.activeElement;
    sheetSlot.innerHTML = '<div class="sheet-overlay"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="sheet-header"><h2 id="sheet-title">' + esc(title) + '</h2><button type="button" data-action="close-sheet" aria-label="Close ' + esc(title) + '">×</button></div>' + content + '<div class="sheet-actions">' + actions + '</div></section></div>';
    sheetSlot.querySelector('button')?.focus();
  }
  function closeSheet() { detailGeneration++; resetRepair(); sheetSlot.textContent = ''; const target = sheetReturn; sheetReturn = null; target?.focus(); }
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
      + '<label class="field">Model being tested<select data-field="model"><option value="">Choose model</option>' + models + '</select></label>'
      + (needsJudge() ? '<label class="field">Judge model<select data-field="judge"><option value="">Choose Judge model</option>' + judges + '</select></label>' : '')
      + '<details><summary>Repeat cases</summary><label class="field">Repeats<input type="number" data-field="repeats" min="1" max="20" step="1" value="' + esc(setup.repeats) + '"></label></details><p role="status" data-setup-status></p>';
  }
  function showSetup() {
    if (!suite || isActive() || startPending || startUncertain) return;
    resetRepair();
    review = null;
    openSheet('New run', '<div data-setup-fields>' + setupMarkup() + '</div>', '<button class="primary" type="button" data-action="review">Review run</button>');
  }
  function refreshSetupControls() {
    const fields = sheetSlot.querySelector('[data-setup-fields]');
    if (!fields) return;
    const focused = document.activeElement;
    const selector = focused?.name === 'scope' ? 'input[name="scope"][value="' + setup.scope + '"]'
      : focused?.dataset?.field ? '[data-field="' + focused.dataset.field + '"]' : null;
    fields.innerHTML = setupMarkup();
    if (selector) fields.querySelector(selector)?.focus();
  }
  function readSetup() {
    const dialog = sheetSlot;
    const judge = dialog.querySelector('[data-field="judge"]');
    setup = { scope: dialog.querySelector('input[name="scope"]:checked')?.value || 'all', caseId: dialog.querySelector('[data-field="case"]')?.value || '', model: dialog.querySelector('[data-field="model"]')?.value || '', judgeModel: judge ? judge.value : setup.judgeModel, repeats: Number(dialog.querySelector('[data-field="repeats"]')?.value || 1) };
    review = null;
  }
  async function loadRuntime() {
    if (!suite) return;
    const current = suite.id, generation = ++runtimeGeneration; runtime = null;
    try {
      const payload = await post('/api/eval-suites/describe', { suiteId: current });
      if (suite?.id !== current || generation !== runtimeGeneration) return;
      if (payload.status !== 'ready') { status('Compatible models unavailable: ' + (payload.reason || 'check local setup')); return; }
      runtime = payload;
      if (!(payload.models || []).includes(setup.model)) setup.model = strictRuntimeChoices ? '' : payload.models?.[0] || '';
      if (!(payload.judgeModels || []).includes(setup.judgeModel)) setup.judgeModel = strictRuntimeChoices ? '' : payload.judgeModels?.[0] || '';
      if (strictRuntimeChoices && (!setup.model || needsJudge() && !setup.judgeModel)) status('Previous model choice is unavailable. Choose compatible models before review.');
      strictRuntimeChoices = false;
      refreshSetupControls();
    } catch { if (suite?.id === current && generation === runtimeGeneration) { strictRuntimeChoices = false; status('Compatible models could not be loaded.'); } }
  }
  async function showReview() {
    readSetup();
    if (!runtime || !setup.model || needsJudge() && !setup.judgeModel || !Number.isInteger(setup.repeats) || setup.repeats < 1 || setup.repeats > 20) {
      sheetSlot.querySelector('[data-setup-status]').textContent = needsJudge() && !setup.judgeModel ? 'Choose a compatible Judge model.' : 'Choose a compatible model and repeat count from 1 to 20.'; return;
    }
    const request = command();
    sheetSlot.querySelector('[data-setup-status]').textContent = 'Checking calls and cost…';
    try {
      const result = await post('/api/eval-runs/preview', request);
      if (JSON.stringify(request) !== JSON.stringify(command()) || sheetSlot.querySelector('[data-setup-status]') === null) return;
      if (result.status !== 'ready') { sheetSlot.querySelector('[data-setup-status]').textContent = 'Run cannot be reviewed: ' + (result.reason || 'check local setup'); return; }
      review = { request, result };
      const cost = result.cost?.status === 'available' ? result.cost.currency + ' ' + result.cost.amount : 'Cost unavailable: ' + (result.cost?.reason || 'estimate unavailable');
      const content = '<p>' + esc(suite.name) + '</p><p>' + esc(result.selectedCaseIds.length) + ' cases · ' + esc(result.repeats === 1 ? 'once' : result.repeats + ' repeats') + '</p><dl><div><dt>Model</dt><dd>' + esc(result.model) + '</dd></div>' + (result.judgeModel ? '<div><dt>Judge</dt><dd>' + esc(result.judgeModel) + '</dd></div>' : '') + '<div><dt>Expected calls</dt><dd>' + esc(result.totalCalls) + '</dd></div><div><dt>Estimated cost</dt><dd>' + esc(cost) + '</dd></div></dl><p>Actual cost may vary.</p><p role="status" data-review-status></p>';
      openSheet('Review run', content, '<button type="button" data-action="back-setup">Back</button><button class="primary" type="button" data-action="start">Start run</button>');
    } catch { const node = sheetSlot.querySelector('[data-setup-status]'); if (node) node.textContent = 'Run preview could not finish. Try again.'; }
  }
  async function startRun() {
    if (!review || startPending || startUncertain || isActive()) return;
    const { request, result } = review; startPending = true;
    const button = sheetSlot.querySelector('[data-action="start"]'); if (button) button.disabled = true;
    try {
      const payload = await post('/api/eval-runs/start', { ...request, review: { selectedCaseIds: result.selectedCaseIds, targetCalls: result.targetCalls, judgeCalls: result.judgeCalls, totalCalls: result.totalCalls, cost: result.cost } });
      if (payload.status !== 'queued') {
        const message = 'Run was not started: ' + (payload.reason || 'review it again');
        const reviewStatus = sheetSlot.querySelector('[data-review-status]');
        if (reviewStatus) reviewStatus.textContent = message;
        status(message); review = null; return;
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
    finally { startPending = false; if (button) button.disabled = false; }
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    if (target.dataset.action === 'new-run') showSetup();
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
