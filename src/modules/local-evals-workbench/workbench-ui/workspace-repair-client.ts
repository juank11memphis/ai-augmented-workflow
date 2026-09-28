export const WORKSPACE_REPAIR_CLIENT = String.raw`
  let selectedFailure = null;
  let repairStage = 'idle', repairAnalysis = null, repairAnalysisId = null, repairProposal = null, repairApplied = null;
  let repairMessage = '', repairPending = false, repairGeneration = 0, repairAffectedFiles = [];
  const selectionKey = selection => selection ? [selection.suiteId, selection.runId, selection.testCaseId, selection.attempt, selection.assertionId].join('|') : '';
  function resetRepair() {
    repairGeneration++; selectedFailure = null; repairStage = 'idle'; repairAnalysis = null; repairAnalysisId = null;
    repairProposal = null; repairApplied = null; repairMessage = ''; repairPending = false; repairAffectedFiles = [];
  }
  function repairMarkup() {
    if (!selectedFailure || !latestRun()) return '';
    const pending = repairPending ? ' disabled' : '';
    const notice = '<p role="status" aria-live="polite">' + esc(repairMessage) + '</p>';
    if (repairStage === 'idle' || repairStage === 'loading') return '<h3 tabindex="-1">Fix one failure</h3><p>Selected failed check: ' + esc(selectedFailure.assertionId) + '</p><button type="button" data-action="analyze-failure"' + pending + '>Analyze failure</button>' + notice;
    if (repairStage === 'unavailable') return '<h3 tabindex="-1">Analysis unavailable</h3><p>Configure an OpenAI API key in the server environment, then check again. Local evidence remains available above.</p><button type="button" data-action="analyze-failure">Check again</button>' + notice;
    if (repairStage === 'retryable-error') return '<h3 tabindex="-1">Analysis could not finish</h3><p>Local evidence remains available above.</p><button type="button" data-action="analyze-failure">Retry analysis</button>' + notice;
    if (repairStage === 'analysis') {
      const analysis = repairAnalysis;
      const cause = analysis?.likelyCause || 'unclear_needs_human_judgment';
      const canDraft = cause !== 'model_nondeterminism' && cause !== 'unclear_needs_human_judgment';
      return '<h3 tabindex="-1">AI analysis</h3><p>' + esc(analysis?.exactFailureExplanation || '') + '</p><p>Likely cause: ' + esc(cause.replaceAll('_', ' ')) + '</p><p>Evidence: ' + esc(analysis?.evidenceSummary || '') + '</p><p>Uncertainty: ' + esc(analysis?.uncertainty || '') + '</p>'
        + (canDraft ? '<button type="button" data-action="draft-repair"' + pending + '>Draft repair</button>' : '<p>Review this uncertainty before choosing a repair target.</p>') + notice;
    }
    if (repairStage === 'proposal' || repairStage === 'apply-blocked' || repairStage === 'apply-uncertain') {
      const proposal = repairProposal;
      const change = proposal?.proposedChange;
      const canApply = repairStage === 'proposal';
      return '<h3 tabindex="-1">Proposed repair</h3><p>1 file: ' + esc(proposal?.affectedProjectFiles?.[0] || '') + '</p><p>' + esc(proposal?.changeSummary || '') + '</p>'
        + '<section class="detail-section" aria-label="Exact proposed change"><h4>' + esc(change?.kind === 'unified-diff' ? 'Proposed diff' : 'Proposed replacement') + '</h4><pre>' + esc((change?.representation || '').split('\n').slice(0, 5).join('\n')) + '</pre><details><summary>' + (change?.kind === 'unified-diff' ? 'Show full diff' : 'Show full replacement') + '</summary><pre>' + esc(change?.representation || '') + '</pre></details></section>'
        + '<h4>Rationale</h4><p>' + esc(proposal?.rationale || '') + '</p><h4>Expected impact</h4><p>' + esc(proposal?.expectedEvalImpact || '') + '</p>'
        + (canApply ? '<button class="primary" type="button" data-action="approve-repair"' + pending + '>Approve and apply</button>' : '<button type="button" data-action="draft-repair"' + pending + '>Draft a fresh repair</button>')
        + '<button type="button" data-action="reject-repair"' + pending + '>Not now</button>' + notice
        + (repairAffectedFiles.length ? '<section aria-label="Paths to inspect"><h4>Paths to inspect — application did not complete</h4><ul>'
          + repairAffectedFiles.map(file => '<li>' + esc(file.path) + '</li>').join('') + '</ul></section>' : '');
    }
    return '<h3 tabindex="-1">Repair applied</h3><p>The result is not verified until you rerun the eval.</p><ul>'
      + (repairApplied?.changedFiles || []).map(file => '<li>' + esc(file.path) + ' — ' + esc(file.summary || '') + '</li>').join('') + '</ul>'
      + '<button class="primary" type="button" data-action="rerun-case">Rerun this case</button><button type="button" data-action="rerun-suite">Rerun all cases</button>' + notice;
  }
  function renderRepair() {
    const activeAction = document.activeElement?.dataset?.action;
    const hosts = [...document.querySelectorAll('[data-repair-host]')];
    hosts.forEach(node => { node.innerHTML = repairMarkup(); });
    if (activeAction) {
      const activeHost = hosts.find(node => node.closest?.('[role="dialog"]')) || hosts[0];
      const next = activeHost?.querySelector?.('[data-action="' + activeAction + '"]') || activeHost?.querySelector?.('h3');
      next?.focus?.();
    }
  }
  async function requestRepair(kind) {
    if (!selectedFailure || repairPending || !latestRun()) return;
    const current = { ...selectedFailure }, key = selectionKey(current), generation = ++repairGeneration;
    repairPending = true; repairMessage = kind === 'analysis' ? 'Analyzing the selected check…' : kind === 'proposal' ? 'Drafting one-file repair…' : 'Checking approval and file state…';
    if (kind === 'analysis') repairStage = 'loading';
    renderRepair();
    try {
      let result;
      if (kind === 'analysis') result = await post('/api/failure-analysis', current);
      else if (kind === 'proposal') {
        if (!['analysis', 'apply-blocked', 'apply-uncertain'].includes(repairStage) || !repairAnalysis) return;
        const cause = repairAnalysis.likelyCause;
        const direction = ['prompt_issue', 'eval_assertion_issue', 'fixture_input_issue'].includes(cause) ? cause : null;
        if (!direction) { repairMessage = 'A named repair direction is unavailable for this analysis.'; return; }
        result = await post('/api/repair-proposals', { ...current, analysisId: repairAnalysisId, repairDirection: { type: direction } });
      } else {
        if (repairStage !== 'proposal' || !repairProposal?.proposalId) return;
        result = await post('/api/repair-proposals/apply', { suiteId: current.suiteId, runId: current.runId,
          testCaseId: current.testCaseId, attempt: current.attempt, assertionId: current.assertionId,
          proposalId: repairProposal.proposalId, approvalMarker: 'approve-concrete-repair-proposal' });
      }
      if (generation !== repairGeneration || selectionKey(selectedFailure) !== key || !latestRun()) return;
      if (kind === 'analysis' && result.status === 'analysis-ready') { repairAnalysis = result.analysis; repairAnalysisId = result.analysisId; repairStage = 'analysis'; repairMessage = ''; }
      else if (kind === 'analysis' && result.status === 'analysis-unavailable') { repairStage = 'unavailable'; repairMessage = result.message || 'Analysis unavailable.'; }
      else if (kind === 'analysis' && result.status === 'error') { repairStage = 'retryable-error'; repairMessage = result.message || 'Analysis could not finish.'; }
      else if (kind === 'analysis') { repairStage = 'retryable-error'; repairMessage = result.message || 'Selected analysis is no longer available. Review the evidence and try again.'; }
      else if (kind === 'proposal' && result.status === 'proposal-ready') { repairProposal = result.proposal; repairStage = 'proposal'; repairMessage = ''; }
      else if (kind === 'apply' && result.status === 'applied') { repairApplied = result; repairStage = 'applied'; repairMessage = 'Source run unchanged. Rerun to verify.'; }
      else if (kind === 'apply') { repairStage = result.status === 'error' ? 'apply-uncertain' : 'apply-blocked'; repairAffectedFiles = Array.isArray(result.changedFiles) ? result.changedFiles : []; repairMessage = result.message || 'The proposal could not be applied. Draft a fresh one.'; }
      else repairMessage = result.message || result.reason || 'This step is unavailable. Review the selected evidence and try again.';
    } catch {
      if (generation === repairGeneration && selectionKey(selectedFailure) === key) {
        if (kind === 'analysis') repairStage = 'retryable-error';
        if (kind === 'apply') repairStage = 'apply-uncertain';
        repairMessage = 'The repair service could not finish. No new approval was sent automatically.';
      }
    } finally {
      if (generation === repairGeneration && selectionKey(selectedFailure) === key) { repairPending = false; renderRepair(); }
    }
  }
  async function rerunAfterRepair(scope) {
    if (!repairApplied || !selectedFailure || !latestRun() || repairPending) return;
    const action = scope === 'case' ? repairApplied.rerunRecommendation?.primaryAction : repairApplied.rerunRecommendation?.alternateActions?.find(item => item.scope === 'suite');
    if (!action || action.suiteId !== suite?.id) return;
    setup = { scope: scope === 'case' ? 'one' : 'all', caseId: selectedFailure.testCaseId,
      model: action.evalRunModelId, judgeModel: run.judgeModel || '', repeats: run.repeats || 1 };
    resetRepair();
    const generation = repairGeneration, suiteId = suite.id;
    strictRuntimeChoices = true;
    await loadRuntime();
    if (generation !== repairGeneration || suite?.id !== suiteId) return;
    showSetup();
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    if (target.dataset.action === 'analyze-failure') void requestRepair('analysis');
    if (target.dataset.action === 'draft-repair') void requestRepair('proposal');
    if (target.dataset.action === 'approve-repair') void requestRepair('apply');
    if (target.dataset.action === 'reject-repair') { repairGeneration++; repairProposal = null; repairStage = 'analysis'; repairMessage = 'Proposal set aside. The selected evidence remains available.'; renderRepair(); }
    if (target.dataset.action === 'rerun-case') void rerunAfterRepair('case');
    if (target.dataset.action === 'rerun-suite') void rerunAfterRepair('suite');
  });
`;
