export const WORKSPACE_RUN_PREVIEW_CLIENT = String.raw`
  let previewGeneration = 0, previewToken = null;
  function previewMessage(message) {
    const node = one('[data-run-preview-status]');
    if (node) node.textContent = message;
  }
  function previewRows(selections, outcomes = []) {
    const list = one('[data-run-preview-list]');
    if (!list) return;
    list.innerHTML = selections.map(item => {
      const name = suite?.testCases.find(testCase => testCase.id === item.caseId)?.name || item.caseId;
      const expectedOutcome = outcomes.find(outcome => outcome.caseId === item.caseId)?.type;
      return '<li><strong>' + esc(name) + '</strong><span>Model ' + esc(item.testedModel) + '</span>'
        + (expectedOutcome === 'operational-error' ? '<span>Expected: operational error</span>' : '')
        + (item.judgeModel ? '<span>Judge model ' + esc(item.judgeModel) + '</span>' : '') + '</li>';
    }).join('');
  }
  async function previewRun() {
    const generation = ++previewGeneration;
    previewToken = null;
    previewRows([]);
    if (!suite || runtimeState !== 'ready') return null;
    const request = command();
    if (request.runOnly && (!request.runOnly.testedModel || needsJudge() && !request.runOnly.judgeModel)) {
      previewMessage('Choose models for this run.');
      return null;
    }
    previewMessage('Checking model choices…');
    try {
      const response = await post('/api/eval-runs/preview', request);
      if (generation !== previewGeneration || suite?.id !== request.suiteId) return null;
      if (response?.status === 'ready' && Array.isArray(response.caseSelections)
        && response.caseSelections.length === selectedCaseIds().length) {
        previewToken = response.previewToken;
        previewRows(response.caseSelections, response.expectedOutcomes);
        previewMessage('Models for this run');
        return response;
      }
      const role = response?.role === 'judge' ? 'Judge model' : 'Model';
      const message = response?.reason === 'missing-suite-default' ? role + ' is not set. Save a Suite model before starting.'
        : response?.reason === 'saved-model-unavailable' ? role + ' is unavailable. Save a replacement before starting.'
        : 'Run choices could not be checked. Try again.';
      previewMessage(message);
      return response;
    } catch {
      if (generation === previewGeneration) previewMessage('Run choices could not be checked. Try again.');
      return null;
    }
  }
`;
