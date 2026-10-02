import { startCopy as safeStartCopy } from '../start-local-evals-workbench/public-issue.js';

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
  let modelIssue = null;
  let previewIssueDetails = null;
  let setup = { scope: 'all', caseId: '', model: '', judgeModel: '', repeats: 1 };
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
  const command = () => ({ suiteId: suite.id, scope: setup.scope === 'all' ? { type: 'all' } : { type: 'test_case', testCaseId: setup.caseId }, model: setup.model, judgeModel: needsJudge() ? setup.judgeModel || null : null, repeats: Number(setup.repeats) });
  const modelCopy = {
    'suite-unavailable': 'This suite could not be used. Check its definition, then retry.',
    'runner-unavailable': 'The runner could not be used. Check its command, then retry.',
    'runner-absent': 'The runner was not found. Install or correct its command, then retry.',
    'runner-start-failed': 'The runner could not start. Check its command and permissions, then retry.',
    'runner-exited': 'The runner ended before describing models. Check it, then retry.',
    'runner-protocol-invalid': 'The runner response did not follow the expected protocol. Check compatibility, then retry.',
    'runner-invalid': 'The runner returned an unusable description. Check its output, then retry.',
    'runner-timeout': 'Runner did not answer in time. Check that it can start, then retry.',
    'required-setting-rejected': 'This suite asks for a setting Sibu will not pass to a runner. Remove it from required settings, then retry.',
    'runner-request-too-large': 'Sibu could not send the model check because it was too large. Copy issue details and report the problem.',
    'environment-undeclared': 'The runner needs a setting not declared by this suite. Declare it, then retry.',
    'environment-missing': 'This suite needs a required setting. Add or export it, restart Sibu Evals, then retry.',
    'capability-unsupported': 'The runner does not support a capability this suite needs. Review suite and runner support, then retry.',
    'model-unavailable': 'The runner returned no compatible models. Review model support, then retry.',
    'judge-unavailable': 'The runner returned no compatible Judge models. Review Judge support, then retry.',
    'input-unsafe': 'Older model-check input was rejected without a precise cause. Review runner setup and request size, then retry.',
    'invalid-request': 'Sibu could not read this model-check request. Correct it, then retry.',
    'unknown': 'Cause unknown. Sibu could not complete the model check. Try again; if it repeats, copy the issue details.',
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
    notice.querySelector('[data-action="review-start-again"]').hidden = action !== 'retry';
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
  const previewStages = { selection: 'selection', description: 'runner description', 'artifact-readiness': 'artifact readiness', 'resolved-inputs': 'suite inputs', estimation: 'cost estimation' };
  const previewGuidance = {
    'suite-unavailable': 'Check the suite definition, then preview again.',
    'runner-unavailable': 'Check the runner command, then preview again.',
    'runner-absent': 'Install or correct the runner command, then preview again.',
    'runner-start-failed': 'Check the runner command and permissions, then preview again.',
    'runner-exited': 'Check the runner operation, then preview again.',
    'runner-protocol-invalid': 'Check runner compatibility, then preview again.',
    'runner-invalid': 'Check the runner output format, then preview again.',
    'runner-timeout': 'Check that the runner is working, then preview again.',
    'environment-missing': 'Add or export the required setting, restart Sibu Evals, then preview again.',
    'required-setting-rejected': 'Fix the suite required settings, then preview again.',
    'runner-request-too-large': 'Copy issue details and report the problem.',
    'environment-undeclared': 'Declare the required setting in the suite, then preview again.',
    'capability-unsupported': 'Review suite and runner support, then preview again.',
    'model-unavailable': 'Choose a compatible model, then preview again.',
    'judge-unavailable': 'Choose a compatible judge model, then preview again.',
    'case-unavailable': 'Review the suite cases, then preview again.',
    'repeats-invalid': 'Correct the repeat count, then preview again.',
    'artifact-unsafe': 'Correct the artifact location, then preview again.',
    'artifact-not-ignored': 'Ignore the artifact location, then preview again.',
    'artifact-tracked': 'Move artifacts away from tracked files, then preview again.',
    'artifact-git-unavailable': 'Check Git access, then preview again.',
    'artifact-root-unsafe': 'Correct the artifact root, then preview again.',
    'estimate-invalid': 'Check the runner estimate response, then preview again.',
    'input-unsafe': 'Review runner setup and request size, then preview again.',
    'invalid-request': 'Correct the preview request, then preview again.',
  };
  const previewCause = {
    'suite-unavailable': 'The selected suite is unavailable', 'runner-unavailable': 'The runner is unavailable',
    'runner-absent': 'The runner was not found', 'runner-start-failed': 'The runner could not start',
    'runner-exited': 'The runner exited', 'runner-protocol-invalid': 'The runner protocol was invalid',
    'runner-invalid': 'The runner response was unusable', 'runner-timeout': 'The runner timed out',
    'environment-missing': 'A required setting is missing', 'required-setting-rejected': 'A required setting was rejected',
    'runner-request-too-large': 'The runner request was too large', 'environment-undeclared': 'A runner setting is undeclared',
    'capability-unsupported': 'A selected capability is unsupported', 'model-unavailable': 'The model is unavailable',
    'judge-unavailable': 'The Judge model is unavailable', 'case-unavailable': 'A selected case is unavailable',
    'repeats-invalid': 'The repeat count is invalid', 'artifact-unsafe': 'The artifact location is unsafe',
    'artifact-not-ignored': 'The artifact location is not ignored', 'artifact-tracked': 'The artifact location contains tracked files',
    'artifact-git-unavailable': 'Artifact safety could not be checked', 'artifact-root-unsafe': 'The artifact root is unsafe',
    'estimate-invalid': 'The runner estimate was unusable', 'input-unsafe': 'Older preview input was rejected without a precise cause',
    'invalid-request': 'The preview request was invalid',
  };
  function clearPreviewNotice() {
    previewIssueDetails = null;
    const notice = one('[data-preview-notice]');
    if (notice) notice.hidden = true;
  }
  function showPreviewNotice(title, guidance, details = null) {
    const notice = one('[data-preview-notice]');
    if (!notice) return;
    previewIssueDetails = details;
    notice.querySelector('[data-preview-heading]').textContent = title;
    notice.querySelector('[data-preview-guidance]').textContent = guidance;
    const detailNode = notice.querySelector('[data-preview-details]');
    detailNode.textContent = details || '';
    detailNode.hidden = !details;
    notice.querySelector('[data-action="copy-preview-issue"]').hidden = !details;
    notice.querySelector('[data-preview-copy-status]').textContent = '';
    notice.hidden = false;
    one('[data-setup-status]').textContent = title;
    notice.querySelector('[data-preview-heading]').focus();
  }
  function previewFailure(result) {
    const issue = result?.issue;
    const blocked = result?.status === 'blocked';
    const failed = result?.status === 'error';
    const valid = issue?.stage === 'preview' && issue.outcome === (blocked ? 'blocked' : 'failed') &&
      (blocked || failed) && safeReference(issue.reference) &&
      (issue.observedStage === undefined || Object.hasOwn(previewStages, issue.observedStage)) &&
      (result.stage === undefined || result.stage === issue.observedStage);
    const category = valid && blocked && issue.category === result.reason && Object.hasOwn(previewGuidance, issue.category)
      ? issue.category : valid && failed && issue.category === 'unknown' ? 'unknown' : null;
    const stage = valid && issue.observedStage ? previewStages[issue.observedStage] : 'preview';
    const details = category ? 'Stage: preview\nOutcome: ' + issue.outcome + '\nCategory: ' + category + '\nReference: ' + issue.reference.toLowerCase() : null;
    if (category && category !== 'unknown') showPreviewNotice('Preview blocked', 'Blocked during ' + stage + ': ' + previewCause[category] + '. ' + previewGuidance[category], details);
    else showPreviewNotice('Preview could not finish', 'Cause unknown during ' + stage + '. Preview again; if it repeats, check local diagnostics.', details);
  }
  function modelNotice(payload, reason = payload?.reason) {
    const category = Object.hasOwn(modelCopy, reason) ? reason : 'unknown';
    const name = category === 'required-setting-rejected' ? payload?.rejectedSettingName : payload?.missingEnvironmentName;
    let guidance = modelCopy[category];
    if (safeSettingName(name) && category === 'required-setting-rejected') guidance = 'This suite asks for ' + name + ', which Sibu will not pass to a runner. Remove it from required settings, then retry.';
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
      + (runtimeState === 'blocked'
        ? '<div class="field" role="group" aria-labelledby="model-label" aria-describedby="model-readiness"><strong id="model-label">Model being tested</strong><div class="model-notice"><h3 tabindex="-1" data-model-notice-heading>Can\'t check models</h3><p id="model-readiness" data-model-readiness>' + esc(runtimeMessage) + '</p><div class="model-notice-actions"><button type="button" data-action="retry-model">Try again</button>' + (modelIssue?.details ? '<button type="button" data-action="copy-model-issue">Copy issue details</button>' : '') + '</div>' + (modelIssue?.details ? '<pre data-model-issue-details>' + esc(modelIssue.details) + '</pre>' : '') + '<p role="status" data-model-copy-status></p></div></div>'
        : '<label class="field">Model being tested<select data-field="model" aria-describedby="model-readiness"' + (runtimeState === 'ready' ? '' : ' disabled') + '><option value="">Choose model</option>' + models + '</select></label><p id="model-readiness" data-model-readiness>' + esc(runtimeMessage) + '</p>')
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
    clearPreviewNotice();
    const reviewAction = setupRegion.querySelector('[data-action="review"]');
    if (reviewAction) reviewAction.disabled = Boolean(runtimeState !== 'ready' || !setup.model || needsJudge() && !setup.judgeModel);
  }
  async function loadRuntime(userRetry = false) {
    if (!suite) return;
    const current = suite.id, generation = ++runtimeGeneration, hadModel = Boolean(setup.model), hadJudge = Boolean(setup.judgeModel);
    runtime = null; review = null; modelIssue = null; previewGeneration++; clearPreviewNotice();
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
        ? 'Previous model choice is unavailable. Choose compatible models before review.' : 'Compatible models ready.');
      if (strictRuntimeChoices && (!setup.model || needsJudge() && !setup.judgeModel)) status('Previous model choice is unavailable. Choose compatible models before review.');
      strictRuntimeChoices = false;
      refreshSetupControls();
    } catch { if (suite?.id === current && generation === runtimeGeneration) { modelIssue = { guidance: 'The model check received no response. Check the connection and try again. A matching terminal event may not exist.', details: null }; setRuntimeState('blocked', modelIssue.guidance); refreshSetupControls(); if (userRetry) setupRegion.querySelector('[data-model-notice-heading]')?.focus(); } }
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
      if (result.status !== 'ready') { previewFailure(result); return; }
      review = { request, result };
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
    if (target.dataset.action === 'copy-preview-issue' && previewIssueDetails) {
      const details = previewIssueDetails;
      const feedback = message => { const node = one('[data-preview-copy-status]'); if (node && details === previewIssueDetails) node.textContent = message; };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        Promise.resolve(navigator.clipboard.writeText(details)).then(() => feedback('Issue details copied.'),
          () => feedback('Copy failed. Select the issue details above instead.'));
      } catch { feedback('Copy failed. Select the issue details above instead.'); }
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
    if (target.dataset.action === 'review-start-again') { one('[data-start-notice]').hidden = true; showSetup(); }
    if (target.dataset.action === 'retry-model') void loadRuntime(true);
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
