/** Browser-side presentation only; every saved value crosses the shared esc boundary. */
export const WORKSPACE_CASE_DETAIL_CLIENT = String.raw`
  function renderCaseDetail({ suiteName, caseId, caseName, attempt, attempts, evidence, selectedCheck, latest, reviewArtifactPath }) {
    const failed = evidence.assertions.filter(check => check.outcome === 'failed');
    const attemptChoices = '<label class="field">Attempt<select data-action="attempt-select" data-case-id="' + esc(caseId) + '">'
      + attempts.map(item => '<option value="' + esc(item.number) + '"' + (item.number === attempt ? ' selected' : '')
        + '>Attempt ' + esc(item.number) + ' — ' + esc(item.outcome) + '</option>').join('') + '</select></label>';
    const failedChoices = failed.length ? '<label class="field">Failed check ' + (failed.findIndex(item => item.id === selectedCheck?.id) + 1)
      + ' of ' + failed.length + '<select data-action="assertion-select" data-case-id="' + esc(caseId)
      + '" data-attempt="' + esc(attempt) + '">'
      + failed.map(item => '<option value="' + esc(item.id) + '"' + (item.id === selectedCheck?.id ? ' selected' : '')
        + '>' + esc(item.id) + '</option>').join('') + '</select></label>' : '';
    return '<div class="section-heading"><button type="button" data-action="close-detail" class="detail-back">‹ Results · ' + esc(suiteName)
      + '</button><button type="button" data-action="close-detail" class="detail-close">Close</button></div>'
      + '<h2 tabindex="-1">' + esc(caseName) + ' · ' + esc(evidence.outcome) + '</h2>'
      + (latest ? '' : '<p class="readonly">Historical run · read-only</p>')
      + attemptChoices + failedChoices
      + (selectedCheck ? '<p class="detail-check-status">Selected check: ' + esc(selectedCheck.id) + ' · ' + esc(selectedCheck.outcome) + '</p>'
        : '<p class="detail-check-status">No failed check in this attempt.</p>')
      + (selectedCheck?.score == null && selectedCheck?.threshold == null ? '' : '<p class="detail-score">'
        + (selectedCheck.score == null ? 'Score unavailable' : 'Score ' + esc(selectedCheck.score)) + ' · '
        + (selectedCheck.threshold == null ? 'Threshold unavailable' : 'Threshold ' + esc(selectedCheck.threshold)) + '</p>')
      + (reviewArtifactPath ? '<section class="detail-section" aria-label="Review with a repo-aware LLM"><h3>Review with your LLM</h3>'
        + '<p>Ask an LLM with access to this repo to review this saved case artifact and its referenced project files. Treat current files as potentially changed since the run.</p>'
        + '<p><strong>Artifact path:</strong> <code>' + esc(reviewArtifactPath) + '</code></p>'
        + (evidence.truncated ? '<p>Saved output was truncated; the artifact cannot show the full response.</p>' : '')
        + (evidence.review?.suitePath ? '' : '<p>Suite file path unavailable; locate the suite by its ID.</p>')
        + (evidence.review?.targetPath ? '' : '<p>Target file path unavailable.</p>')
        + (evidence.review?.runnerPath ? '' : '<p>Runner file path unavailable.</p>')
        + (evidence.review?.omittedInputPathCount > 0 ? '<p>' + esc(evidence.review.omittedInputPathCount) + ' input file paths omitted from the artifact.</p>' : '')
        + '</section>' : '<p>Review handoff unavailable for this older run; saved evidence remains inspectable.</p>');
  }
`;
