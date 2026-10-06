/** Browser-side presentation only; every saved value crosses the shared esc boundary. */
export const WORKSPACE_CASE_DETAIL_CLIENT = String.raw`
  function renderCaseDetail({ suiteName, runId, caseId, caseName, attempt, attempts, evidence, selectedCheck, latest }) {
    const failed = evidence.assertions.filter(check => check.outcome === 'failed');
    const attemptChoices = '<label class="field">Attempt<select data-action="attempt-select" data-case-id="' + esc(caseId) + '">'
      + attempts.map(item => '<option value="' + esc(item.number) + '"' + (item.number === attempt ? ' selected' : '')
        + '>Attempt ' + esc(item.number) + ' — ' + esc(item.outcome) + '</option>').join('') + '</select></label>';
    const failedChoices = failed.length ? '<label class="field">Failed check ' + (failed.findIndex(item => item.id === selectedCheck?.id) + 1)
      + ' of ' + failed.length + '<select data-action="assertion-select" data-case-id="' + esc(caseId)
      + '" data-attempt="' + esc(attempt) + '">'
      + failed.map(item => '<option value="' + esc(item.id) + '"' + (item.id === selectedCheck?.id ? ' selected' : '')
        + '>' + esc(item.id) + '</option>').join('') + '</select></label>' : '';
    const allChecks = evidence.assertions.map(item => '<li><strong>' + esc(item.id) + '</strong> — ' + esc(item.outcome)
      + (item.score == null ? '' : ' · Score ' + esc(item.score) + (item.threshold == null ? '' : ' · Threshold ' + esc(item.threshold)))
      + '<p>Actual: ' + esc(item.actual || 'Not reported.') + '</p><p>Expected: ' + esc(item.expected || 'Not reported.') + '</p>'
      + (item.diagnostics.length ? '<ul>' + item.diagnostics.map(message => '<li>' + esc(message) + '</li>').join('') + '</ul>' : '') + '</li>').join('');
    const trace = evidence.turns.map(item => '<p>' + esc(item.role) + ': ' + esc(item.content) + '</p>').join('')
      + evidence.tools.map(item => '<p>Tool ' + esc(item.name) + ': ' + esc(item.outcome || 'result') + ' · ' + esc(item.arguments) + ' · ' + esc(item.result) + '</p>').join('');
    const actual = selectedCheck?.actual || evidence.output || 'No actual behavior reported.';
    const expected = selectedCheck?.expected || 'No expected behavior reported.';
    return '<div class="section-heading"><button type="button" data-action="close-detail" class="detail-back">‹ Results · ' + esc(suiteName)
      + '</button><button type="button" data-action="close-detail" class="detail-close">Close</button></div>'
      + '<h2 tabindex="-1">' + esc(caseName) + ' · ' + esc(evidence.outcome) + '</h2>'
      + '<p class="detail-identity">Run ' + esc(runId) + ' · Case ' + esc(caseId) + '</p>'
      + (latest ? '' : '<p class="readonly">Historical run · read-only</p>')
      + attemptChoices + failedChoices
      + (selectedCheck ? '<p class="detail-check-status">Selected check: ' + esc(selectedCheck.id) + ' · ' + esc(selectedCheck.outcome) + '</p>'
        : '<p class="detail-check-status">No failed check in this attempt.</p>')
      + '<div class="detail-evidence"><section class="detail-section" aria-label="Actual result"><h3>What happened</h3><p>' + esc(actual) + '</p></section>'
      + '<section class="detail-section" aria-label="Expected result"><h3>Expected</h3><p>' + esc(expected) + '</p></section></div>'
      + (selectedCheck?.score == null && selectedCheck?.threshold == null ? '' : '<p class="detail-score">'
        + (selectedCheck.score == null ? 'Score unavailable' : 'Score ' + esc(selectedCheck.score)) + ' · '
        + (selectedCheck.threshold == null ? 'Threshold unavailable' : 'Threshold ' + esc(selectedCheck.threshold)) + '</p>')
      + '<div class="detail-secondary"><details class="detail-section"><summary>All checks (' + evidence.assertions.length + ')</summary>'
      + (allChecks ? '<ul>' + allChecks + '</ul>' : '<p>No checks reported.</p>') + '</details>'
      + '<details class="detail-section"><summary>Diagnostics and trace</summary>'
      + '<h3>Selected check diagnostics</h3>' + (selectedCheck?.diagnostics?.length ? selectedCheck.diagnostics.map(item => '<p>' + esc(item) + '</p>').join('') : '<p>No selected diagnostics.</p>')
      + '<h3>Attempt diagnostics</h3>' + (evidence.diagnostics.length ? evidence.diagnostics.map(item => '<p>' + esc(item) + '</p>').join('') : '<p>No attempt diagnostics.</p>')
      + '<h3>Conversation turns and tool trace</h3>' + (trace || '<p>No trace reported.</p>') + '</details>'
      + '<details class="detail-section"><summary>Bounded raw response</summary>'
      + (evidence.truncated ? '<p>Saved response was truncated.</p>' : '')
      + '<pre>' + esc(evidence.output || 'No raw response was retained for this attempt.') + '</pre></details></div>'
      + (latest && selectedCheck ? '<section data-repair-host aria-label="Guided repair">' + repairMarkup() + '</section>' : '');
  }
`;
