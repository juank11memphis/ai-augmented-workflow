export const WORKBENCH_CLIENT_PREVIEW_SECTION = {
  name: 'preview',
  source: String.raw`  let previewGeneration = 0;
  let descriptionGeneration = 0;
  let reviewedPreview = null;
  let confirmingPreview = false;
  let runtimeReady = false;
  let rubricCaseIds = [];

  function previewStatus(message) { const node = root.querySelector('[data-preview-status]'); if (node) node.textContent = message; }
  function previewBlockMessage(reason) {
    return ({
      'suite-unavailable': 'This Eval Suite is unavailable. Refresh the workbench after checking its definition.',
      'runner-unavailable': 'The project runner could not be started. Check its declared file and local setup.',
      'runner-invalid': 'The project runner returned an invalid response.',
      'runner-timeout': 'The project runner did not respond in time.',
      'environment-missing': 'A declared runner environment variable is missing.',
      'environment-undeclared': 'The runner requires an environment name not declared by this suite.',
      'capability-unsupported': 'This runner does not support all checks in the Eval Suite.',
      'model-unavailable': 'Choose a compatible Model Under Evaluation.',
      'judge-unavailable': 'Choose a compatible Judge Model for rubric checks.',
      'case-unavailable': 'The selected Eval Test Case is unavailable.',
      'repeats-invalid': 'Choose a whole repeat count from 1 to 20.',
      'artifact-not-ignored': 'Add the root /evals/artifacts/ Git ignore rule before running.',
      'artifact-tracked': 'Eval artifacts are tracked by Git. Remove them from tracking before running.',
      'artifact-git-unavailable': 'Git could not verify the artifact area.',
      'artifact-root-unsafe': 'The artifact area is outside the safe project root.',
      'artifact-unsafe': 'The artifact area could not be verified as safe.',
      'estimate-invalid': 'The project runner returned an invalid estimate.',
      'input-unsafe': 'Selected suite inputs could not be safely read.',
    })[reason] || 'Run setup could not be verified.';
  }
  function invalidateReview() {
    previewGeneration++;
    reviewedPreview = null;
    confirmingPreview = false;
    const slot = root.querySelector('[data-preview-dialog-slot]');
    if (slot) slot.textContent = '';
    renderRunButton(false);
  }
  function selectionRequiresJudge(scope) {
    return scope.type === 'all' ? rubricCaseIds.length > 0 : rubricCaseIds.includes(scope.testCaseId);
  }
  function syncJudgeVisibility() {
    const field = root.querySelector('[data-preview-judge]');
    if (field) field.hidden = !selectionRequiresJudge(selectedScope());
  }
  function currentPreviewCommand(scope) {
    const repeatInput = control('repeats')?.value;
    const selected = scope || selectedScope();
    return { suiteId: state.selectedSuiteId, scope: selected, model: control('model')?.value || '',
      judgeModel: selectionRequiresJudge(selected) ? control('judge')?.value || null : null,
      repeats: repeatInput === undefined ? 1 : Number(repeatInput) };
  }
  async function loadRuntimeDescription() {
    const generation = ++descriptionGeneration;
    const suiteId = state.selectedSuiteId;
    runtimeReady = false;
    renderRunButton(false);
    previewStatus('Loading compatible models...');
    try {
      const response = await fetch('/api/eval-suites/describe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suiteId }) });
      const description = await response.json();
      if (generation !== descriptionGeneration || suiteId !== state.selectedSuiteId) return;
      if (description.status !== 'ready') { previewStatus(previewBlockMessage(description.reason)); return; }
      const model = control('model');
      model.textContent = '';
      for (const id of description.models || []) model.add(new Option(id, id));
      if ((description.models || []).includes(state.selectedEvalRunModel)) model.value = state.selectedEvalRunModel;
      else state.selectedEvalRunModel = model.value;
      const judgeField = root.querySelector('[data-preview-judge]');
      rubricCaseIds = description.rubricCaseIds || [];
      syncJudgeVisibility();
      const judge = control('judge');
      judge.textContent = '';
      if (description.rubricRequired) {
        judge.add(new Option('Select Judge model', ''));
        for (const id of description.judgeModels || []) judge.add(new Option(id, id));
      }
      runtimeReady = true;
      renderRunButton(false);
      previewStatus(selectionRequiresJudge(selectedScope()) ? 'Choose a compatible Model and Judge model.' : 'Choose a compatible Model.');
    } catch { if (generation === descriptionGeneration) previewStatus('Compatible models could not be loaded.'); }
  }
  async function openRunPreview(scope) {
    if (!runtimeReady) { previewStatus('Compatible models are not ready.'); return; }
    invalidateReview();
    const generation = previewGeneration;
    const command = currentPreviewCommand(scope);
    if (!command.model) { previewStatus('Choose a compatible Model before reviewing.'); return; }
    renderRunButton(true);
    previewStatus('Checking run setup and estimate...');
    try {
      const response = await fetch('/api/eval-runs/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command) });
      const result = await response.json();
      if (generation !== previewGeneration) return;
      renderRunButton(false);
      if (result.status !== 'ready') { previewStatus(previewBlockMessage(result.reason)); return; }
      reviewedPreview = { command, result, key: JSON.stringify(command) };
      previewStatus('Review calls and cost before starting.');
      renderPreviewReview(result);
    } catch {
      if (generation !== previewGeneration) return;
      renderRunButton(false);
      previewStatus('Run preview could not finish. Try again.');
    }
  }
  function renderPreviewReview(result) {
    const slot = root.querySelector('[data-preview-dialog-slot]');
    if (!slot) return;
    const caseLabel = result.selectedCaseIds.length + ' test case' + (result.selectedCaseIds.length === 1 ? '' : 's') + ': ' + result.selectedCaseIds.join(', ');
    const cost = result.cost.status === 'available'
      ? h(result.cost.currency + ' ' + String(result.cost.amount)) + ' estimated'
      : 'Cost unavailable: ' + h(result.cost.reason);
    slot.innerHTML = '<div class="cell-dialog-overlay" data-preview-overlay><section class="cell-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title"><h2 id="preview-title">Review run</h2><dl class="summary"><div><dt>Scope</dt><dd>' + h(caseLabel) + '</dd></div><div><dt>Repeats</dt><dd>' + h(result.repeats) + '</dd></div><div><dt>Model Under Evaluation</dt><dd>' + h(result.model) + '</dd></div>' + (result.judgeModel ? '<div><dt>Judge Model</dt><dd>' + h(result.judgeModel) + '</dd></div>' : '') + '<div><dt>Target calls</dt><dd>' + h(result.targetCalls) + '</dd></div><div><dt>Judge calls</dt><dd>' + h(result.judgeCalls) + '</dd></div><div><dt>Total calls</dt><dd>' + h(result.totalCalls) + '</dd></div><div><dt>Estimated cost</dt><dd>' + cost + '</dd></div></dl><p>Actual cost may vary.</p><div class="preview-actions"><button type="button" data-control="preview-back">Back</button><button type="button" data-control="preview-start">Start run</button></div></section></div>';
    control('preview-back')?.focus();
  }
  function closeReview() {
    invalidateReview();
    control('run')?.focus();
  }
  function trapReviewFocus(event) {
    const dialog = root.querySelector('[data-preview-overlay] .cell-dialog');
    if (!dialog) return;
    const elements = [...dialog.querySelectorAll('button:not([disabled])')];
    if (!elements.length) return;
    if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? elements.at(-1) : elements[0]).focus(); return; }
    if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus(); }
  }
  async function confirmReviewedRun() {
    if (!reviewedPreview || confirmingPreview || reviewedPreview.key !== JSON.stringify(currentPreviewCommand(reviewedPreview.command.scope))) return;
    confirmingPreview = true;
    control('preview-start').disabled = true;
    const reviewed = reviewedPreview;
    const generation = previewGeneration;
    if (typeof window.sibuStartReviewedRun === 'function') {
      try { await window.sibuStartReviewedRun(reviewed.command, reviewed.result); }
      catch { previewStatus('Starting the run failed.'); }
    } else previewStatus('Run execution is unavailable in this version. Your reviewed setup was not started.');
    if (generation === previewGeneration) closeReview();
  }`,
} as const;
