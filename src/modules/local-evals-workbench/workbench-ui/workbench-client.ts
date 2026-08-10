export const WORKBENCH_CLIENT_SCRIPT = `(() => {
  const root = document.querySelector('[data-workbench-root]');
  const stateNode = document.getElementById('sibu-workbench-state');
  if (!root || !stateNode) return;
  let state = JSON.parse(stateNode.textContent || '{}');
  function control(name) { return root.querySelector('[data-control="' + name + '"]'); }
  function bind(name) { return root.querySelector('[data-bind="' + name + '"]'); }
  function selectedSuite() { return (state.discovery.suites || []).find((suite) => suite.id === state.selectedSuiteId) || (state.discovery.suites || [])[0]; }
  function renderReady() {
    const suite = selectedSuite();
    if (!suite) return;
    state = { ...state, selectedSuiteId: suite.id, runScope: state.runScope || { type: 'all' } };
    const models = suite.modelOptions || [];
    if (!models.some((model) => model.id === state.selectedEvalRunModel)) state.selectedEvalRunModel = models[0]?.id || 'gpt-5-mini';
    setText('suite-name', suite.name);
    setText('suite-description', suite.description);
    setText('status-label', state.discovery.status === 'blocked' ? 'Blocked' : 'Ready');
    setText('status-message', state.discovery.status === 'blocked' ? state.discovery.message : suite.readyTestCaseCount + ' test case' + (suite.readyTestCaseCount === 1 ? '' : 's') + ' ready.');
    setText('progress-label', '0/' + suite.readyTestCaseCount + ' complete');
    setText('pass-rate', '—');
    setText('avg-latency', '—');
    setText('total-cost', '$0.0000');
    setProgress(0);
    renderModelOptions(models);
    renderRunButton(false);
  }
  function renderModelOptions(models) {
    const model = control('model');
    if (!model) return;
    model.textContent = '';
    for (const option of models) model.add(new Option(option.label, option.id, option.id === state.selectedEvalRunModel, option.id === state.selectedEvalRunModel));
  }
  function renderRunButton(disabled) {
    const run = control('run');
    if (!run) return;
    run.textContent = disabled ? 'Running...' : state.runScope?.type === 'test_case' ? 'Run 1 test case' : 'Run all ' + (selectedSuite()?.readyTestCaseCount || 0) + ' test cases';
    setDisabled(disabled);
  }
  function renderRunning() {
    renderRunButton(true);
    setText('status-label', 'Running...');
    setText('status-message', 'Running local evals. Controls are disabled until this run finishes.');
    setText('progress-label', '0/' + (selectedSuite()?.readyTestCaseCount || 0) + ' complete');
    setProgress(0);
  }
  function renderRunResult(payload) {
    const matrix = payload && (payload.matrix || (payload.status === 'completed' && payload.matrix));
    const status = payload?.status === 'completed' ? matrix?.status : payload?.status;
    setText('status-label', statusLabel(status));
    setText('status-message', payload?.message || statusMessage(status));
    if (matrix?.aggregates) {
      const total = matrix.aggregates.total || 0;
      const passed = matrix.aggregates.passed || 0;
      setText('pass-rate', total > 0 ? Math.round((passed / total) * 100) + '%' : '0%');
      setText('progress-label', total + '/' + total + ' complete');
      setProgress(total > 0 ? 100 : 0);
      setText('avg-latency', averageLatency(matrix));
      setText('total-cost', totalCost(matrix));
    }
    setDisabled(false);
    renderRunButton(false);
  }
  function statusLabel(status) { return ({ passed: 'Passed', failed: 'Failed', blocked: 'Blocked', error: 'Could not run' })[status] || 'Could not run'; }
  function statusMessage(status) { return ({ passed: 'All completed eval results passed.', failed: 'One or more eval results failed.', blocked: 'Add local config, then run the eval again.', error: 'The eval did not finish.' })[status] || 'The eval did not finish.'; }
  function averageLatency(matrix) {
    const values = (matrix.rows || []).flatMap((row) => row.cells || []).map((cell) => cell.durationMs).filter((value) => typeof value === 'number');
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) + ' ms' : '—';
  }
  function totalCost(matrix) {
    const total = (matrix.rows || []).flatMap((row) => row.cells || []).flatMap((cell) => cell.metrics || []).filter((metric) => ['cost', 'total_cost', 'usd_cost'].includes(metric.name) || metric.unit === 'usd').reduce((sum, metric) => sum + metric.value, 0);
    return '$' + total.toFixed(4);
  }
  function selectedScope() {
    const checked = root.querySelector('input[name="runScope"]:checked');
    if (checked && checked.value === 'test_case') return { type: 'test_case', testCaseId: state.runScope?.testCaseId || '' };
    return { type: 'all' };
  }
  function setText(name, value) { for (const node of root.querySelectorAll('[data-bind=\"' + name + '\"]')) node.textContent = value; }
  function setProgress(percent) { for (const progress of root.querySelectorAll('[data-bind=\"progress\"]')) progress.value = percent; }
  function setDisabled(value) { for (const element of root.querySelectorAll('select,input,button')) { if (value) element.setAttribute('disabled', ''); else element.removeAttribute('disabled'); } }
  control('suite')?.addEventListener('change', (event) => { state = { ...state, selectedSuiteId: event.target.value, runScope: { type: 'all' } }; renderReady(); });
  control('model')?.addEventListener('change', (event) => { state = { ...state, selectedEvalRunModel: event.target.value }; });
  root.querySelectorAll('input[name="runScope"]').forEach((input) => input.addEventListener('change', () => { state = { ...state, runScope: selectedScope() }; renderRunButton(false); }));
  control('run')?.addEventListener('click', async () => {
    renderRunning();
    try {
      const response = await fetch('/api/eval-runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suiteId: state.selectedSuiteId, evalRunModel: state.selectedEvalRunModel, scope: selectedScope() }) });
      renderRunResult(await response.json());
    } catch {
      renderRunResult({ status: 'error', message: 'The eval could not finish. Try again after checking local setup.' });
    }
  });
})();`;
