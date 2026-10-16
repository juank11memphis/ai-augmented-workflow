export const WORKSPACE_CASE_MODELS_CLIENT = String.raw`
  let caseModelsDraft = null, caseModelsSaving = false;
  const activeCaseId = () => caseModelsDraft?.caseId || setup.caseId;
  const selectedCase = () => suite?.testCases.find(item => item.id === activeCaseId());
  const selectedCaseHasJudge = () => Boolean(runtime?.rubricCaseIds?.includes(activeCaseId()));
  const savedCaseModels = () => savedSuiteModels?.cases?.find(item => item.caseId === activeCaseId());
  const caseModelValue = (role, item = savedCaseModels()) => item?.[role === 'tested' ? 'testedModel' : 'judgeModel'] || '';
  const suiteModelValue = role => savedSuiteModels?.[role === 'tested' ? 'defaultTestedModel' : 'defaultJudgeModel'] || '';
  function caseModelSummary() {
    if (setup.scope !== 'one' || !selectedCase()) return '';
    const row = (role, label) => {
      const override = caseModelValue(role);
      return '<p>' + label + ' <span data-case-' + role + '>' + esc(override || suiteModelValue(role) || 'Not set')
        + '</span> · <span data-case-' + role + '-source>' + (override ? 'Override' : 'Inherited from suite') + '</span></p>';
    };
    return '<section data-selected-case-models aria-label="Selected test-case models"><h3>' + esc(selectedCase().name) + '</h3>'
      + row('tested', 'Model') + (selectedCaseHasJudge() ? row('judge', 'Judge model') : '')
      + '<button type="button" data-action="case-models">Models</button><p role="status" data-case-model-status></p></section>';
  }
  function caseChoiceMarkup(role, label) {
    const value = caseModelsDraft[role];
    const inherited = suiteModelValue(role);
    const choices = role === 'tested' ? runtime?.models || [] : runtime?.judgeModels || [];
    const unavailable = value && !choices.includes(value);
    const options = choices.map(id => '<option value="' + esc(id) + '"' + (id === value ? ' selected' : '') + '>' + esc(id) + '</option>').join('');
    const inherit = '<label><input type="radio" name="case-' + role + '-choice" value="inherit"' + (!value ? ' checked' : '') + '> Inherit ' + esc(inherited || 'Not set') + '</label>';
    const override = '<label><input type="radio" name="case-' + role + '-choice" value="override"' + (value ? ' checked' : '')
      + '> ' + (unavailable ? 'Replace' : 'Override') + '</label><select aria-label="' + label + ' override" data-case-role="' + role + '"><option value="">Choose model</option>'
      + (unavailable ? '<option value="' + esc(value) + '" selected>' + esc(value) + ' · Unavailable</option>' : '') + options + '</select>';
    return '<fieldset><legend>' + label + '</legend>' + (unavailable ? '<p role="status">' + esc(value) + ' is unavailable. Replace or Inherit.</p>' : '')
      + inherit + override + '<button type="button" data-action="reset-case-' + role + '">Reset override</button></fieldset>';
  }
  function renderCaseModelsDialog(message = '') {
    if (!caseModelsDraft || !selectedCase()) return;
    openSheet('Test-case models', '<p>' + esc(selectedCase().name) + '</p>' + caseChoiceMarkup('tested', 'Model')
      + (selectedCaseHasJudge() ? caseChoiceMarkup('judge', 'Judge model') : '')
      + '<p role="status" data-case-dialog-status>' + esc(message) + '</p>',
      '<button type="button" data-action="cancel-case-models">Cancel</button><button type="button" data-action="save-case-models">Save</button>');
  }
  async function openCaseModels(focusRole = 'tested', caseId = setup.caseId) {
    if (!suite || !suite.testCases.some(item => item.id === caseId) || caseModelsSaving) return;
    if (!savedSuiteModels) await loadSavedSuiteModels();
    if (!savedSuiteModels || runtimeState !== 'ready') {
      const message = one('[data-case-model-status]'); if (message) message.textContent = 'Test-case models unavailable. Check compatible models, then try again.';
      return;
    }
    const item = savedSuiteModels.cases.find(value => value.caseId === caseId);
    caseModelsDraft = { tested: item?.testedModel || '', judge: item?.judgeModel || '', caseId };
    renderCaseModelsDialog();
    one('input[name="case-' + (focusRole === 'judge' && selectedCaseHasJudge() ? 'judge' : 'tested') + '-choice"]:checked')?.focus();
  }
  async function saveCaseModels() {
    if (!caseModelsDraft || !savedSuiteModels || !suite || caseModelsSaving) return;
    const id = suite.id, caseId = caseModelsDraft.caseId, generation = savedSuiteGeneration;
    const draft = { ...caseModelsDraft };
    const changes = ['tested', ...(selectedCaseHasJudge() ? ['judge'] : [])].filter(role => draft[role] !== caseModelValue(role));
    if (changes.some(role => draft[role] && !(role === 'tested' ? runtime.models : runtime.judgeModels).includes(draft[role]))) {
      one('[data-case-dialog-status]').textContent = 'Choose an available replacement or Inherit before saving.'; return;
    }
    caseModelsSaving = true;
    one('[data-action="save-case-models"]').disabled = true;
    try {
      for (const role of changes) {
        const value = draft[role];
        const result = await post('/api/eval-suites/saved-choice', { suiteId: id, caseId, role,
          action: value ? 'set' : 'reset', ...(value ? { modelId: value } : {}), expectedToken: savedSuiteModels.token });
        if (generation !== savedSuiteGeneration || suite?.id !== id) return;
        if (result?.status !== 'saved') {
          one('[data-case-dialog-status]').textContent = result?.status === 'conflict'
            ? 'Suite changed elsewhere. Close and reopen Models to review current choices.' : 'Could not save this choice. Review it and try again.';
          return;
        }
        savedSuiteModels = { ...savedSuiteModels, token: result.token, cases: savedSuiteModels.cases.map(item => item.caseId === caseId
          ? { ...item, [role === 'tested' ? 'testedModel' : 'judgeModel']: result.modelId } : item) };
      }
      caseModelsDraft = null;
      closeSheet(); refreshSetupControls();
      if (setup.scope === 'one') one('[data-action="case-models"]')?.focus();
      const message = one('[data-case-model-status]'); if (message) message.textContent = changes.length ? 'Test-case models saved. Start run when ready.' : 'Test-case models unchanged.';
      void previewRun();
    } catch { one('[data-case-dialog-status]').textContent = 'Could not save this choice. Check the connection and try again.'; }
    finally { caseModelsSaving = false; const save = one('[data-action="save-case-models"]'); if (save) save.disabled = false; }
  }
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'case-models') void openCaseModels();
    if (action === 'cancel-case-models') { caseModelsDraft = null; closeSheet(); }
    if (action === 'save-case-models') void saveCaseModels();
    if (action === 'reset-case-tested' || action === 'reset-case-judge') {
      if (!caseModelsDraft) return;
      const role = action === 'reset-case-tested' ? 'tested' : 'judge';
      caseModelsDraft[role] = ''; renderCaseModelsDialog();
      one('input[name="case-' + role + '-choice"][value="inherit"]')?.focus();
    }
    if (action === 'close-sheet' && caseModelsDraft) caseModelsDraft = null;
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && caseModelsDraft) caseModelsDraft = null; });
  document.addEventListener('change', event => {
    const role = event.target.dataset?.caseRole;
    if (caseModelsDraft && (role === 'tested' || role === 'judge')) {
      caseModelsDraft[role] = event.target.value;
      const radio = one('input[name="case-' + role + '-choice"][value="override"]'); if (radio) radio.checked = true;
    }
    const match = /^case-(tested|judge)-choice$/.exec(event.target.name || '');
    if (caseModelsDraft && match) caseModelsDraft[match[1]] = event.target.value === 'inherit'
      ? '' : one('[data-case-role="' + match[1] + '"]')?.value || '';
  });
`;
