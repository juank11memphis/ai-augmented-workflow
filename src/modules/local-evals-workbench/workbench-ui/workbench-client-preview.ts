export const WORKBENCH_CLIENT_PREVIEW_SECTION = {
  name: 'preview',
  source: String.raw`  let descriptionGeneration = 0;
  let runtimeReady = false;
  let rubricCaseIds = [];

  function previewStatus(message) { const node = root.querySelector('[data-preview-status]'); if (node) node.textContent = message; }
  function previewBlockMessage(reason) {
    return ({
      'suite-unavailable': 'This Eval Suite is unavailable. Refresh the workbench after checking its definition.',
      'runner-unavailable': 'The project runner could not be started. Check its declared file and local setup.',
      'runner-invalid': 'The project runner returned an invalid response.',
      'runner-request-invalid': 'The runner reported an invalid request. Update it to the current Sibu request contract.',
      'runner-timeout': 'The project runner did not respond in time.',
      'environment-missing': 'A declared runner environment variable is missing.',
      'environment-undeclared': 'The runner requires an environment name not declared by this suite.',
      'capability-unsupported': 'This runner does not support all checks in the Eval Suite.',
      'model-unavailable': 'Choose a compatible Model Under Evaluation.',
      'judge-unavailable': 'Choose a compatible Judge Model for rubric checks.',
      'case-unavailable': 'The selected Eval Test Case is unavailable.',
      'artifact-not-ignored': 'Add the root /evals/artifacts/ Git ignore rule before running.',
      'artifact-tracked': 'Eval artifacts are tracked by Git. Remove them from tracking before running.',
      'artifact-git-unavailable': 'Git could not verify the artifact area.',
      'artifact-root-unsafe': 'The artifact area is outside the safe project root.',
      'artifact-unsafe': 'The artifact area could not be verified as safe.',
      'input-unsafe': 'Selected suite inputs could not be safely read.',
      'schedule-failed': 'The run was queued but execution could not start. Check its saved status.',
    })[reason] || 'Run setup could not be verified.';
  }
  function selectionRequiresJudge(scope) {
    return scope.type === 'all' ? rubricCaseIds.length > 0 : rubricCaseIds.includes(scope.testCaseId);
  }
  function syncJudgeVisibility() {
    const field = root.querySelector('[data-preview-judge]');
    if (field) field.hidden = !selectionRequiresJudge(selectedScope());
  }
  function currentRunCommand(scope) {
    const selected = scope || selectedScope();
    return { suiteId: state.selectedSuiteId, scope: selected, model: control('model')?.value || '',
      judgeModel: selectionRequiresJudge(selected) ? control('judge')?.value || null : null,
    };
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
  }`,
} as const;
