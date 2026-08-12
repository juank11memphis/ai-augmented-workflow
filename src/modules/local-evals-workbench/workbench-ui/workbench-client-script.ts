export type WorkbenchClientScriptSection = {
  readonly name: string;
  readonly source: string;
};

const WORKBENCH_CLIENT_SETUP = String.raw`  const root = document.querySelector('[data-workbench-root]');
  const stateNode = document.getElementById('sibu-workbench-state');
  if (!root || !stateNode) return;
  let state = JSON.parse(stateNode.textContent || '{}');
  let latestRun = null;
  let filters = { failuresOnly: false, searchQuery: '', visibleVariantIds: [] };
  let selectedCell = null;
  let activeAssertionId = null;
  let focusRestoreKey = null;
  let analysisState = { status: 'idle' };
  let proposalState = { status: 'idle' };

  const control = (name) => root.querySelector('[data-control="' + name + '"]');
  const bind = (name) => root.querySelectorAll('[data-bind="' + name + '"]');
  const selectedSuite = () => (state.discovery.suites || []).find((suite) => suite.id === state.selectedSuiteId) || (state.discovery.suites || [])[0];
  const matrix = () => latestRun?.matrix && latestRun.matrix.suiteId === state.selectedSuiteId ? latestRun.matrix : null;
  const h = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const keyFor = (selection, mode) => selection.testCaseId + ':' + selection.modelId + ':' + mode;`;

export function buildWorkbenchClientScript(sections: readonly WorkbenchClientScriptSection[]): string {
  return [
    '(() => {',
    WORKBENCH_CLIENT_SETUP,
    ...sections.map((section) => section.source),
    '})();',
  ].join('\n\n');
}
