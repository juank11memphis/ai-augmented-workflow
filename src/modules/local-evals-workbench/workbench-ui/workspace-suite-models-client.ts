export const WORKSPACE_SUITE_MODELS_CLIENT = String.raw`
  let savedSuiteModels = null, savedSuiteGeneration = 0, suiteModelsSaving = false;
  let suiteModelsDraft = null;
  const suiteModelsUrl = id => '/api/eval-suites/saved-choice?suiteId=' + encodeURIComponent(id);
  const suiteHasJudge = () => Boolean(runtime?.rubricCaseIds?.length);
  function renderSuiteModelSummary() {
    const host = one('[data-suite-models]');
    if (!host) return;
    host.hidden = !suite;
    one('[data-suite-tested]').textContent = savedSuiteModels?.defaultTestedModel || 'Not set';
    const judgeRow = one('[data-suite-judge-row]');
    judgeRow.hidden = !suiteHasJudge();
    one('[data-suite-judge]').textContent = savedSuiteModels?.defaultJudgeModel || 'Not set';
  }
  function suiteModelStatus(message) {
    const node = one('[data-suite-model-status]');
    if (node) node.textContent = message;
  }
  async function loadSavedSuiteModels() {
    if (!suite) return;
    const id = suite.id, generation = ++savedSuiteGeneration;
    savedSuiteModels = null;
    renderSuiteModelSummary();
    try {
      const result = await json(suiteModelsUrl(id));
      if (generation !== savedSuiteGeneration || suite?.id !== id) return;
      if (result?.status !== 'ready' || !/^[a-f0-9]{64}$/.test(result.token)) throw new Error('Unavailable snapshot');
      savedSuiteModels = result;
      renderSuiteModelSummary();
    } catch {
      if (generation === savedSuiteGeneration && suite?.id === id) suiteModelStatus('Saved models could not be read. Try Models again.');
    }
  }
  function choiceMarkup(role, label, value, choices) {
    const available = choices.includes(value);
    const unavailable = value && !available ? '<option value="' + esc(value) + '" selected>' + esc(value) + ' · Unavailable</option>' : '';
    const options = choices.map(id => '<option value="' + esc(id) + '"' + (id === value ? ' selected' : '') + '>' + esc(id) + '</option>').join('');
    return '<div class="field"><label for="suite-' + role + '">' + label + '</label>'
      + (unavailable ? '<p role="status">' + esc(value) + ' is unavailable. Choose a replacement.</p>' : '')
      + '<select id="suite-' + role + '" data-suite-role="' + role + '"><option value=""' + (!value ? ' selected' : '') + '>Not set</option>'
      + unavailable + options + '</select><button type="button" data-action="reset-suite-' + role + '">Reset default</button></div>';
  }
  function renderSuiteModelsDialog(message = '') {
    if (!suiteModelsDraft || !suite) return;
    const content = '<p>' + esc(suite.name) + '</p>'
      + choiceMarkup('tested', 'Model', suiteModelsDraft.tested, runtime?.models || [])
      + (suiteHasJudge() ? choiceMarkup('judge', 'Judge model', suiteModelsDraft.judge, runtime?.judgeModels || []) : '')
      + '<p role="status" data-suite-dialog-status>' + esc(message) + '</p>';
    openSheet('Suite models', content, '<button type="button" data-action="cancel-suite-models">Cancel</button><button type="button" data-action="save-suite-models">Save</button>');
  }
  async function openSuiteModels() {
    if (!suite || suiteModelsSaving) return;
    if (!savedSuiteModels) await loadSavedSuiteModels();
    if (!savedSuiteModels || runtimeState !== 'ready') {
      suiteModelStatus('Suite models unavailable. Check compatible models, then try again.');
      return;
    }
    suiteModelsDraft = { tested: savedSuiteModels.defaultTestedModel || '', judge: savedSuiteModels.defaultJudgeModel || '' };
    renderSuiteModelsDialog();
  }
  async function saveSuiteModels() {
    if (!suiteModelsDraft || !savedSuiteModels || !suite || suiteModelsSaving) return;
    const id = suite.id, generation = savedSuiteGeneration;
    const draft = { ...suiteModelsDraft };
    const changes = ['tested', ...(suiteHasJudge() ? ['judge'] : [])].filter(role =>
      draft[role] !== (savedSuiteModels[role === 'tested' ? 'defaultTestedModel' : 'defaultJudgeModel'] || ''));
    if (changes.some(role => draft[role] && !(role === 'tested' ? runtime.models : runtime.judgeModels).includes(draft[role]))) {
      one('[data-suite-dialog-status]').textContent = 'Choose an available model before saving.';
      return;
    }
    suiteModelsSaving = true;
    one('[data-action="save-suite-models"]').disabled = true;
    try {
      for (const role of changes) {
        const value = draft[role];
        const result = await post('/api/eval-suites/saved-choice', { suiteId: id, role,
          action: value ? 'set' : 'reset', ...(value ? { modelId: value } : {}), expectedToken: savedSuiteModels.token });
        if (generation !== savedSuiteGeneration || suite?.id !== id) return;
        if (result?.status !== 'saved') {
          one('[data-suite-dialog-status]').textContent = result?.status === 'conflict'
            ? 'Suite changed elsewhere. Close and reopen Models to review current choices.'
            : 'Could not save this choice. Review it and try again.';
          return;
        }
        savedSuiteModels = { ...savedSuiteModels, token: result.token,
          [role === 'tested' ? 'defaultTestedModel' : 'defaultJudgeModel']: result.modelId };
        renderSuiteModelSummary();
      }
      suiteModelsDraft = null;
      closeSheet();
      suiteModelStatus(changes.length ? 'Suite models saved. Start run when ready.' : 'Suite models unchanged.');
    } catch {
      one('[data-suite-dialog-status]').textContent = 'Could not save this choice. Check the connection and try again.';
    } finally {
      suiteModelsSaving = false;
      const save = one('[data-action="save-suite-models"]'); if (save) save.disabled = false;
    }
  }
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'suite-models') void openSuiteModels();
    if (action === 'cancel-suite-models') { suiteModelsDraft = null; closeSheet(); }
    if (action === 'save-suite-models') void saveSuiteModels();
    if (action === 'reset-suite-tested' || action === 'reset-suite-judge') {
      if (!suiteModelsDraft) return;
      const role = action === 'reset-suite-tested' ? 'tested' : 'judge';
      suiteModelsDraft[role] = '';
      sheetReturn = one('[data-action="suite-models"]');
      renderSuiteModelsDialog();
      one('[data-suite-role="' + role + '"]')?.focus();
    }
  });
  document.addEventListener('change', event => {
    const role = event.target.dataset?.suiteRole;
    if (suiteModelsDraft && (role === 'tested' || role === 'judge')) suiteModelsDraft[role] = event.target.value;
  });
`;
