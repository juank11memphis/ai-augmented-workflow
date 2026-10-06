import { startCopy as safeStartCopy } from '../start-local-evals-workbench/public-issue.js';
import { WORKSPACE_RUN_START_CLIENT } from './workspace-run-start-client.js';

export const WORKSPACE_SETUP_CLIENT = String.raw`
  const root = document.querySelector('[data-workspace]');
  const discovery = JSON.parse(document.getElementById('sibu-workspace-state').textContent || '{}');
  if (!root) return;
  const suites = discovery.suites || [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let suite = suites[0] || null;
  let run = null, history = [], selectedRunId = null, latestKnownRunId = null, acceptedRunId = null, runtime = null;
  let runGeneration = 0, historyGeneration = 0, detailGeneration = 0, runtimeGeneration = 0;
  let strictRuntimeChoices = false;
  let runtimeState = 'loading', runtimeMessage = 'Loading compatible models…';
  let modelIssue = null;
  let setup = { scope: 'all', caseId: '', model: '', judgeModel: '' };
  let sheetReturn = null, startPending = false, startUncertain = false, startReference = null, startSuiteId = null, activePanel = null;
  let startIssueDetails = null;
  const startCopy = ${JSON.stringify(safeStartCopy)};
  const one = selector => document.querySelector(selector);
  const sheetSlot = one('[data-sheet-slot]');
  const setupRegion = one('[data-run-setup]');
  const selectedCaseIds = () => setup.scope === 'all' ? (suite?.testCases || []).map(item => item.id) : [setup.caseId];
  const needsJudge = () => selectedCaseIds().some(id => (runtime?.rubricCaseIds || []).includes(id));
  const isActive = () => Boolean(acceptedRunId || run && ['queued', 'running'].includes(run.state));
  const json = async (url, options) => (await fetch(url, options)).json();
  const post = (url, body) => json(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const discoveryCopy = {
    'missing-evals-folder': ['No eval suites found', 'Sibu could not find an evals folder.', 'Add an eval suite under evals/.'],
    'no-eval-suites': ['No eval suites found', 'Sibu found no usable eval suites.', 'Add an eval suite under evals/.'],
    'unreadable-eval-suites': ["Sibu couldn't read the eval suites", 'Suite definitions could not be used.', 'Check the local eval workspace and correct the suites.'],
    'discovery-failed': ['Eval suite discovery failed', 'Sibu could not finish reading suites. Cause unknown.', 'Check project access, then try again.'],
  };
  const connectionCopy = {
    noResponse: ['Connection to Sibu failed', 'The suite request received no response.', 'Check the connection and try reloading. A matching terminal event may not exist.'],
    invalidResponse: ['Sibu sent an unusable response', 'The suite request could not be read.', 'Check the connection and try reloading. A matching terminal event may not exist.'],
  };
  let copyableIssue = null;
  function safeDiscoveryIssue(payload) {
    const issue = payload?.issue;
    if (!issue || issue.stage !== 'discovery' || !['blocked', 'failed'].includes(issue.outcome) ||
      issue.category !== payload.reason || !Object.hasOwn(discoveryCopy, issue.category) ||
      typeof issue.reference !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(issue.reference)) return null;
    return 'Stage: discovery\nOutcome: ' + issue.outcome + '\nCategory: ' + issue.category + '\nReference: ' + issue.reference.toLowerCase();
  }
  function showDiscoveryNotice(copy, issueDetails = null) {
    const host = one('[data-discovery-notice]');
    if (!host) return;
    const [title, explanation, nextStep] = copy;
    if (!host.querySelector('h3')) host.innerHTML = '<h3 tabindex="-1"></h3><p data-discovery-guidance></p><span data-discovery-announcement role="status" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></span><p data-issue-details></p><button type="button" data-action="copy-issue">Copy issue details</button><p data-issue-copy-status role="status"></p>';
    const heading = host.querySelector('h3');
    const changed = heading.textContent !== title || host.querySelector('[data-discovery-guidance]').textContent !== explanation + ' ' + nextStep;
    copyableIssue = issueDetails;
    heading.textContent = title;
    host.querySelector('[data-discovery-guidance]').textContent = explanation + ' ' + nextStep;
    const details = host.querySelector('[data-issue-details]');
    details.textContent = issueDetails || '';
    details.hidden = !issueDetails;
    host.querySelector('[data-action="copy-issue"]').hidden = !issueDetails;
    host.hidden = false;
    if (changed) host.querySelector('[data-discovery-announcement]').textContent = title;
  }
  async function loadDiscovery() {
    try {
      const response = await fetch('/api/eval-suites');
      let payload;
      try { payload = await response.json(); } catch { showDiscoveryNotice(connectionCopy.invalidResponse); return; }
      if (!payload || !Array.isArray(payload.suites) || !['ready', 'blocked'].includes(payload.status) ||
        payload.status === 'blocked' && !Object.hasOwn(discoveryCopy, payload.reason)) {
        showDiscoveryNotice(connectionCopy.invalidResponse); return;
      }
      if (payload.status === 'blocked') showDiscoveryNotice(discoveryCopy[payload.reason], safeDiscoveryIssue(payload));
      else { const host = one('[data-discovery-notice]'); if (host) host.hidden = true; copyableIssue = null; }
    } catch { showDiscoveryNotice(connectionCopy.noResponse); }
  }
  const command = () => ({ suiteId: suite.id, scope: setup.scope === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: setup.caseId }, model: setup.model, judgeModel: needsJudge() ? setup.judgeModel || null : null });
  const modelCopy = {
    'suite-unavailable': 'Sibu could not open this eval suite. Share the issue details with the person who set it up.',
    'runner-unavailable': 'Sibu could not start this suite. Share the issue details with the person who set it up.',
    'runner-absent': 'A program needed by this suite was not found. Share the issue details with the person who set it up.',
    'runner-start-failed': 'A program needed by this suite could not start. Share the issue details with the person who set it up.',
    'runner-exited': 'The suite stopped before Sibu could check its models. Try again; if it keeps happening, share the issue details.',
    'runner-request-invalid': 'The runner reported that it could not use the model-check request. Update it to the current Sibu request contract, then try again.',
    'runner-protocol-invalid': 'Sibu could not understand the suite’s response. Share the issue details with the person who set it up.',
    'runner-invalid': 'The suite returned information Sibu could not use. Share the issue details with the person who set it up.',
    'runner-timeout': 'The suite took too long to respond. Try again; if it keeps happening, share the issue details.',
    'required-setting-rejected': 'This suite requests a setting that Sibu cannot accept. You do not need to set it. Share the issue details with the person who set up the suite.',
    'runner-request-too-large': 'Sibu could not check models because the request was too large. Share the issue details with the person who set up the suite.',
    'environment-undeclared': 'This suite needs a setting that its setup does not list. Ask the person who set up the suite to fix it.',
    'environment-missing': 'This suite needs a required setting. Add or export it, restart Sibu Evals, then retry.',
    'capability-unsupported': 'This suite needs a feature its runner does not support. Share the issue details with the person who set it up.',
    'model-unavailable': 'This suite has no models available to test. Share the issue details with the person who set it up.',
    'judge-unavailable': 'This suite has no judge model available for its checks. Share the issue details with the person who set it up.',
    'input-unsafe': 'Sibu could not safely check this suite. Try again; if it keeps happening, share the issue details.',
    'invalid-request': 'Sibu could not read the model check. Try again; if it keeps happening, share the issue details.',
    'unknown': 'Sibu could not check models. Try again; if it keeps happening, share the issue details.',
  };
  const safeSettingName = value => typeof value === 'string' && /^[A-Z_][A-Z0-9_]*$/.test(value) && value.length <= 128;
  const safeReference = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
  const safeRunId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
  function showStartNotice(title, guidance, details = null, action = null) {
    const notice = one('[data-start-notice]');
    if (!notice) return;
    const heading = notice.querySelector('[data-start-heading]');
    const changed = heading.textContent !== title || notice.querySelector('[data-start-guidance]').textContent !== guidance;
    heading.textContent = title;
    notice.querySelector('[data-start-guidance]').textContent = guidance;
    startIssueDetails = details;
    const detail = notice.querySelector('[data-start-details]');
    detail.textContent = details || ''; detail.hidden = !details;
    notice.querySelector('[data-action="copy-start-issue"]').hidden = !details;
    notice.querySelector('[data-action="retry-start"]').hidden = action !== 'retry';
    notice.querySelector('[data-action="open-history"]').hidden = action !== 'history';
    notice.querySelector('[data-start-copy-status]').textContent = '';
    notice.hidden = false;
    if (changed) notice.querySelector('[data-start-announcement]').textContent = title;
  }
  function blockedStartIssue(payload) {
    const issue = payload?.issue;
    const copy = issue && Object.hasOwn(startCopy, issue.category) ? startCopy[issue.category] : null;
    if (payload?.status !== 'blocked' || !copy || issue.stage !== 'run-start' || issue.outcome !== 'blocked' ||
      issue.category !== payload.reason || issue.recoveryAction !== copy.recoveryAction || !safeReference(issue.reference) ||
      !safeReference(payload.reference) || issue.reference.toLowerCase() !== payload.reference.toLowerCase()) return null;
    return { copy, details: 'Stage: run-start\nOutcome: blocked\nCategory: ' + issue.category + '\nReference: ' + issue.reference.toLowerCase() };
  }
  function modelNotice(payload, reason = payload?.reason) {
    const category = Object.hasOwn(modelCopy, reason) ? reason : 'unknown';
    const name = category === 'required-setting-rejected' ? payload?.rejectedSettingName
      : category === 'environment-undeclared' ? payload?.undeclaredEnvironmentName : payload?.missingEnvironmentName;
    let guidance = category === 'unknown' ? 'Cause unknown. ' + modelCopy[category] : modelCopy[category];
    if (category === 'required-setting-rejected' && name === 'SIBU_EVAL_MODE') guidance = 'Sibu sets SIBU_EVAL_MODE automatically. You do not need to set it. This suite lists it by mistake; share the issue details with the person who set up the suite.';
    else if (safeSettingName(name) && category === 'required-setting-rejected') guidance = 'This suite requests ' + name + ', which Sibu cannot accept. You do not need to set it. Share the issue details with the person who set up the suite.';
    if (safeSettingName(name) && category === 'environment-undeclared') guidance = 'This suite needs ' + name + ', but its setup does not list it. Ask the person who set up the suite to fix it.';
    if (safeSettingName(name) && category === 'environment-missing') guidance = name === 'OPENAI_API_KEY'
      ? 'This suite needs OPENAI_API_KEY. Add it to project-root .env, or .env.local if .env is missing or has no key. You can also export it in the starting terminal. Restart Sibu Evals, then retry.'
      : 'This suite needs ' + name + '. Set it in the starting terminal, restart Sibu Evals, then retry.';
    const issue = payload?.issue;
    const details = issue?.stage === 'model-check' && issue.category === category &&
      ['blocked', 'failed'].includes(issue.outcome) && safeReference(issue.reference)
      ? 'Stage: model-check\nOutcome: ' + issue.outcome + '\nCategory: ' + category + '\nReference: ' + issue.reference.toLowerCase() : null;
    return { guidance, details };
  }
  function setRuntimeState(state, message) {
    runtimeState = state; runtimeMessage = message;
    const announcement = one('[data-setup-status]');
    if (announcement && announcement.textContent !== message) announcement.textContent = message;
  }
  function status(message) { const node = one('[data-progress]'); if (node && node.textContent !== message) node.textContent = message; }
  function openSheet(title, content, actions) {
    if (!sheetReturn) sheetReturn = document.activeElement;
    sheetSlot.innerHTML = '<div class="sheet-overlay"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="sheet-header"><h2 id="sheet-title" tabindex="-1">' + esc(title) + '</h2><button type="button" data-action="close-sheet" aria-label="Close ' + esc(title) + '">×</button></div>' + content + '<div class="sheet-actions">' + actions + '</div></section></div>';
    const heading = sheetSlot.querySelector('#sheet-title');
    if (heading) heading.focus(); else sheetSlot.querySelector('button')?.focus();
  }
  function closeSheet() {
    const closingCase = Boolean(sheetSlot.querySelector('[data-action="close-detail"]'));
    detailGeneration++; resetRepair(); sheetSlot.textContent = '';
    if (closingCase && typeof closeCaseDetail === 'function') { closeCaseDetail(); sheetReturn = null; return; }
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
      + (runtimeState === 'blocked'
        ? '<div class="field" role="group" aria-labelledby="model-label" aria-describedby="model-readiness"><strong id="model-label">Model being tested</strong><div class="model-notice"><h3 tabindex="-1" data-model-notice-heading>Can\'t check models</h3><p id="model-readiness" data-model-readiness>' + esc(runtimeMessage) + '</p><div class="model-notice-actions"><button type="button" data-action="retry-model">Try again</button>' + (modelIssue?.details ? '<button type="button" data-action="copy-model-issue">Copy issue details</button>' : '') + '</div>' + (modelIssue?.details ? '<pre data-model-issue-details>' + esc(modelIssue.details) + '</pre>' : '') + '<p>Start run unavailable</p><p role="status" data-model-copy-status></p></div></div>'
        : '<label class="field">Model being tested<select data-field="model" aria-describedby="model-readiness"' + (runtimeState === 'ready' ? '' : ' disabled') + '><option value="">Choose model</option>' + models + '</select></label><p id="model-readiness" data-model-readiness>' + esc(runtimeMessage) + '</p>')
      + '<details><summary>Model support</summary><p>Tests can use models supported by this suite. Sibu\'s built-in analysis and repair help currently uses OpenAI. More providers are planned.</p></details>'
      + (needsJudge() ? '<label class="field">Judge model<select data-field="judge"><option value="">Choose Judge model</option>' + judges + '</select></label>' : '');
  }
  function showSetup() {
    if (!suite || isActive() || startPending || startUncertain) return;
    resetRepair();
    if (sheetSlot.querySelector('[role="dialog"]')) closeSheet();
    setupRegion.querySelector('[data-action="start"]')?.focus();
  }
  function refreshSetupControls() {
    const fields = setupRegion?.querySelector('[data-setup-fields]');
    if (!fields) return;
    const focused = document.activeElement;
    const selector = focused?.name === 'scope' ? 'input[name="scope"][value="' + setup.scope + '"]'
      : focused?.dataset?.field ? '[data-field="' + focused.dataset.field + '"]' : null;
    fields.innerHTML = setupMarkup();
    const startAction = setupRegion.querySelector('[data-action="start"]');
    if (startAction) startAction.disabled = Boolean(runtimeState !== 'ready' || !setup.model || needsJudge() && !setup.judgeModel);
    if (selector) fields.querySelector(selector)?.focus();
  }
  function readSetup() {
    const judge = setupRegion.querySelector('[data-field="judge"]');
    setup = { scope: setupRegion.querySelector('input[name="scope"]:checked')?.value || 'all', caseId: setupRegion.querySelector('[data-field="case"]')?.value || '', model: setupRegion.querySelector('[data-field="model"]')?.value || '', judgeModel: judge ? judge.value : setup.judgeModel };
    const startAction = setupRegion.querySelector('[data-action="start"]');
    if (startAction) startAction.disabled = Boolean(runtimeState !== 'ready' || !setup.model || needsJudge() && !setup.judgeModel);
  }
  async function loadRuntime(userRetry = false) {
    if (!suite) return;
    const current = suite.id, generation = ++runtimeGeneration, hadModel = Boolean(setup.model), hadJudge = Boolean(setup.judgeModel);
    runtime = null; modelIssue = null;
    setRuntimeState('loading', 'Loading compatible models…');
    refreshSetupControls();
    try {
      const payload = await post('/api/eval-suites/describe', { suiteId: current });
      if (suite?.id !== current || generation !== runtimeGeneration) return;
      if (payload.status !== 'ready') { modelIssue = modelNotice(payload); setRuntimeState('blocked', modelIssue.guidance); refreshSetupControls(); if (userRetry) setupRegion.querySelector('[data-model-notice-heading]')?.focus(); return; }
      if (!payload.models?.length) { modelIssue = modelNotice(payload, 'model-unavailable'); setRuntimeState('blocked', modelIssue.guidance); refreshSetupControls(); if (userRetry) setupRegion.querySelector('[data-model-notice-heading]')?.focus(); return; }
      runtime = payload;
      if (!(payload.models || []).includes(setup.model)) setup.model = strictRuntimeChoices || hadModel ? '' : payload.models[0];
      if (!(payload.judgeModels || []).includes(setup.judgeModel)) setup.judgeModel = strictRuntimeChoices || hadJudge ? '' : payload.judgeModels?.[0] || '';
      setRuntimeState('ready', (strictRuntimeChoices || hadModel || hadJudge) && (!setup.model || needsJudge() && !setup.judgeModel)
        ? 'Previous model choice is unavailable. Choose compatible models before starting.' : 'Compatible models ready.');
      if (strictRuntimeChoices && (!setup.model || needsJudge() && !setup.judgeModel)) status('Previous model choice is unavailable. Choose compatible models before starting.');
      strictRuntimeChoices = false;
      refreshSetupControls();
    } catch { if (suite?.id === current && generation === runtimeGeneration) { modelIssue = { guidance: 'Cause unknown. The model check received no response. Check the connection and try again. A matching terminal event may not exist.', details: null }; setRuntimeState('blocked', modelIssue.guidance); refreshSetupControls(); if (userRetry) setupRegion.querySelector('[data-model-notice-heading]')?.focus(); } }
  }
  ${WORKSPACE_RUN_START_CLIENT}
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    if (target.dataset.action === 'copy-issue' && copyableIssue) {
      const details = copyableIssue;
      const feedback = message => { const node = one('[data-issue-copy-status]'); if (node && copyableIssue === details) node.textContent = message; };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        Promise.resolve(navigator.clipboard.writeText(details)).then(() => feedback('Issue details copied.'),
          () => feedback('Copy failed. Select the issue details above instead.'));
      } catch { feedback('Copy failed. Select the issue details above instead.'); }
    }
    if (target.dataset.action === 'suite') selectSuite(target.dataset.suiteId);
    if (target.dataset.action === 'copy-model-issue') {
      const details = runtimeState === 'blocked' ? modelIssue?.details : null;
      const feedback = () => details && details === modelIssue?.details ? setupRegion.querySelector('[data-model-copy-status]') : null;
      try {
        if (!details || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        Promise.resolve(navigator.clipboard.writeText(details)).then(() => { const node = feedback(); if (node) node.textContent = 'Issue details copied.'; },
          () => { const node = feedback(); if (node) node.textContent = 'Copy failed. Select the issue details above instead.'; });
      } catch { const node = feedback(); if (node) node.textContent = 'Copy failed. Select the issue details above instead.'; }
    }
    if (target.dataset.action === 'copy-start-issue' && startIssueDetails) {
      const details = startIssueDetails;
      const feedback = message => { const node = one('[data-start-copy-status]'); if (node && details === startIssueDetails) node.textContent = message; };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        Promise.resolve(navigator.clipboard.writeText(details)).then(() => feedback('Issue details copied.'),
          () => feedback('Copy failed. Select the issue details above instead.'));
      } catch { feedback('Copy failed. Select the issue details above instead.'); }
    }
    if (target.dataset.action === 'open-history') { closeSheet(); renderHistory(); focusPanel(); void loadHistory(); }
    if (target.dataset.action === 'retry-start') { one('[data-start-notice]').hidden = true; showSetup(); }
    if (target.dataset.action === 'retry-model') void loadRuntime(true);
    if (target.dataset.action === 'copy-prompt') { navigator.clipboard?.writeText('Create production-ready Sibu evals for this project.').then(() => { const node = one('[data-copy-status]'); if (node) node.textContent = 'Prompt copied.'; }).catch(() => { const node = one('[data-copy-status]'); if (node) node.textContent = 'Copy failed. Select the prompt text instead.'; }); }
    if (target.dataset.action === 'close-sheet') closeSheet();
    if (target.dataset.action === 'start') void startRun();
  });
  document.addEventListener('keydown', event => { if (sheetSlot.querySelector('[role="dialog"]')) trapSheet(event); });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-action="suite-select"]')) selectSuite(event.target.value);
    if (event.target.matches('input[name="scope"]')) { readSetup(); refreshSetupControls(); }
    if (event.target.matches('[data-field]')) { readSetup(); if (event.target.matches('[data-field="case"]')) refreshSetupControls(); }
  });
`;
