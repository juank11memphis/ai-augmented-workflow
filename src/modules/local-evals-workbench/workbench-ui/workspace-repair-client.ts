export const WORKSPACE_REPAIR_CLIENT = String.raw`
  let selectedFailure = null;
  let repairStage = 'idle', repairAnalysis = null, repairAnalysisId = null, repairProposal = null, repairApplied = null;
  let repairMessage = '', repairPending = false, repairGeneration = 0;
  const selectionKey = selection => selection ? [selection.suiteId, selection.runId, selection.testCaseId, selection.attempt, selection.assertionId].join('|') : '';
  function resetRepair() {
    repairGeneration++; selectedFailure = null; repairStage = 'idle'; repairAnalysis = null; repairAnalysisId = null;
    repairProposal = null; repairApplied = null; repairMessage = ''; repairPending = false;
  }
  function repairMarkup() {
    if (!selectedFailure || !latestRun()) return '';
    const pending = repairPending ? ' disabled' : '';
    const notice = '<p role="status" aria-live="polite">' + esc(repairMessage) + '</p>';
    if (repairStage === 'idle') return '<h3 tabindex="-1">Fix one failure</h3><p>Selected failed check: ' + esc(selectedFailure.assertionId) + '</p><button type="button" data-action="analyze-failure"' + pending + '>Analyze failure</button>' + notice;
    if (repairStage === 'analysis') {
      const analysis = repairAnalysis;
      const cause = analysis?.likelyCause || 'unclear_needs_human_judgment';
      const canDraft = cause !== 'model_nondeterminism' && cause !== 'unclear_needs_human_judgment';
      return '<h3 tabindex="-1">AI analysis</h3><p>' + esc(analysis?.exactFailureExplanation || '') + '</p><p>Likely cause: ' + esc(cause.replaceAll('_', ' ')) + '</p><p>Evidence: ' + esc(analysis?.evidenceSummary || '') + '</p><p>Uncertainty: ' + esc(analysis?.uncertainty || '') + '</p>'
        + (canDraft ? '<button type="button" data-action="draft-repair"' + pending + '>Draft repair</button>' : '<p>Review this uncertainty before choosing a repair target.</p>') + notice;
    }
    if (repairStage === 'proposal') {
      const proposal = repairProposal;
      const change = proposal?.proposedChange;
      return '<h3 tabindex="-1">Proposed repair</h3><p>1 file: ' + esc(proposal?.affectedProjectFiles?.[0] || '') + '</p><p>' + esc(proposal?.changeSummary || '') + '</p>'
        + '<section class="detail-section" aria-label="Exact proposed change"><h4>' + esc(change?.kind === 'unified-diff' ? 'Proposed diff' : 'Proposed replacement') + '</h4><pre>' + esc(change?.representation || '') + '</pre></section>'
        + '<h4>Rationale</h4><p>' + esc(proposal?.rationale || '') + '</p><h4>Expected impact</h4><p>' + esc(proposal?.expectedEvalImpact || '') + '</p>'
        + '<button class="primary" type="button" data-action="approve-repair"' + pending + '>Approve and apply</button><button type="button" data-action="reject-repair"' + pending + '>Not now</button>' + notice;
    }
    return '<h3 tabindex="-1">Repair applied, not verified</h3><p>' + esc(repairApplied?.message || 'Rerun the eval before judging this repair.') + '</p>'
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
    renderRepair();
    try {
      let result;
      if (kind === 'analysis') result = await post('/api/failure-analysis', current);
      else if (kind === 'proposal') {
        if (repairStage !== 'analysis' || !repairAnalysis) return;
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
      else if (kind === 'proposal' && result.status === 'proposal-ready') { repairProposal = result.proposal; repairStage = 'proposal'; repairMessage = ''; }
      else if (kind === 'apply' && result.status === 'applied') { repairApplied = result; repairStage = 'applied'; repairMessage = 'Source run unchanged. Rerun to verify.'; }
      else repairMessage = result.message || result.reason || 'This step is unavailable. Review the selected evidence and try again.';
    } catch {
      if (generation === repairGeneration && selectionKey(selectedFailure) === key) repairMessage = 'The repair service could not finish. No new approval was sent automatically.';
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
    await loadRuntime();
    showSetup();
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    if (target.dataset.action === 'analyze-failure') void requestRepair('analysis');
    if (target.dataset.action === 'draft-repair') void requestRepair('proposal');
    if (target.dataset.action === 'approve-repair') void requestRepair('apply');
    if (target.dataset.action === 'reject-repair') { resetRepair(); renderRepair(); }
    if (target.dataset.action === 'rerun-case') void rerunAfterRepair('case');
    if (target.dataset.action === 'rerun-suite') void rerunAfterRepair('suite');
  });
`;
