export const WORKSPACE_REPAIR_CLIENT = String.raw`
  let selectedFailure = null;
  let repairStage = 'idle', repairAnalysis = null, repairAnalysisId = null, repairProposal = null, repairApplied = null;
  let repairMessage = '', repairPending = false, repairGeneration = 0, repairAffectedFiles = [], analysisIssueDetails = null;
  let repairIssueCopy = null, proposalIssueCopy = null, proposalIssueDetails = null, proposalAnnouncement = '', applyIssueDetails = null;
  const analysisGuidance = {
    'missing-openai-api-key': ['Analysis unavailable', 'Analysis needs a local OpenAI API key.', 'Check local assistance setup, then try analysis again.'],
    'invalid-scope': ['Analysis selection invalid', 'This selection cannot be analyzed.', 'Select one failed assertion in a saved result.'],
    'missing-artifact': ['Analysis evidence unavailable', 'Saved run evidence could not be found.', 'Check the selected result and its saved evidence.'],
    'missing-cell': ['Analysis result unavailable', 'The selected result could not be found.', 'Select a result with saved evidence.'],
    'missing-assertion': ['Analysis assertion unavailable', 'The selected assertion could not be found.', 'Select a saved failed assertion.'],
    'non-failed-assertion': ['Analysis needs a failure', 'The selected assertion did not fail.', 'Select a failed assertion.'],
    'provider-authorization': ['Analysis authorization failed', 'The analysis provider rejected authorization.', 'Check local provider credentials and access, then try again.'],
    'provider-rate-limit': ['Analysis rate limited', 'The analysis provider limited this request.', 'Wait before trying analysis again.'],
    'provider-timeout': ['Analysis timed out', 'The analysis provider did not respond in time.', 'Try analysis again later.'],
    'provider-unavailable': ['Analysis service unavailable', 'The analysis provider could not be reached or was unavailable.', 'Check service availability, then try again.'],
    'invalid-llm-response': ['Analysis response invalid', 'The provider response could not be used safely.', 'Try again. If it repeats, report the issue.'],
    'llm-failure': ['Analysis failed', 'The provider cause is unknown.', 'Try again. If it repeats, report the issue.'],
    'invalid-request': ['Analysis request invalid', 'Sibu could not read this analysis request.', 'Select a saved failed assertion and try again.'],
    unknown: ['Analysis failed', 'Cause unknown.', 'Try again. If it repeats, report the issue.'],
  };
  function safeAnalysisIssue(result) {
    const issue = result?.issue;
    const category = issue?.category;
    const blocked = ['missing-openai-api-key', 'invalid-scope', 'missing-artifact', 'missing-cell', 'missing-assertion', 'non-failed-assertion', 'invalid-request'];
    const failed = ['provider-authorization', 'provider-rate-limit', 'provider-timeout', 'provider-unavailable', 'invalid-llm-response', 'llm-failure', 'unknown'];
    if (!issue || issue.stage !== 'analysis' || !Object.hasOwn(analysisGuidance, category) ||
      issue.category !== result.reason ||
      !((['analysis-unavailable', 'blocked'].includes(result.status) && issue.outcome === 'blocked' && blocked.includes(category)) ||
        (result.status === 'error' && issue.outcome === 'failed' && failed.includes(category))) ||
      typeof issue.reference !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(issue.reference)) return null;
    return { copy: analysisGuidance[category], details: 'Stage: analysis\nOutcome: ' + issue.outcome + '\nCategory: ' + category + '\nReference: ' + issue.reference.toLowerCase() };
  }
  const proposalGuidance = {
    'missing-openai-api-key': ['Repair proposal unavailable', 'Drafting needs a local OpenAI API key.', 'Check local assistance setup, then try drafting again.', 'draft'],
    'invalid-scope': ['Proposal selection invalid', 'The selected failure is outside this proposal scope.', 'Select one failed assertion in a saved result.', 'none'],
    'unclear-direction': ['Repair direction unclear', 'The repair direction is not specific enough to draft safely.', 'Review the selected analysis, then try drafting again.', 'draft'],
    'stale-analysis': ['Analysis no longer matches', 'The selected analysis does not match this failure and repair direction.', 'Analyze this failure again before drafting.', 'analysis'],
    'missing-artifact': ['Proposal evidence unavailable', 'The saved run evidence could not be found.', 'Check the selected result and its saved evidence.', 'none'],
    'missing-cell': ['Proposal result unavailable', 'The selected result cell could not be found.', 'Select a result with saved evidence.', 'none'],
    'missing-assertion': ['Proposal assertion unavailable', 'The selected assertion could not be found.', 'Select a saved failed assertion.', 'none'],
    'non-failed-assertion': ['Proposal needs a failure', 'The selected assertion did not fail.', 'Select a failed assertion.', 'none'],
    'unsafe-target-files': ['Repair target unsafe', 'The proposed target could not be verified as safe.', 'Check the named project file before drafting again.', 'draft'],
    'vague-proposal': ['Proposal rejected', 'The draft did not specify a safe concrete file change.', 'Review the repair direction and draft again.', 'draft'],
    'provider-authorization': ['Proposal authorization failed', 'The provider rejected authorization.', 'Check local provider credentials and access before trying again.', 'draft'],
    'provider-rate-limit': ['Proposal rate limited', 'The provider limited this request.', 'Wait before drafting again.', 'draft'],
    'provider-timeout': ['Proposal timed out', 'The provider did not respond in time.', 'Try drafting again later.', 'draft'],
    'provider-unavailable': ['Proposal service unavailable', 'The provider could not be reached or was unavailable.', 'Check service availability, then try again.', 'draft'],
    'invalid-llm-response': ['Proposal response invalid', 'The provider response could not be used safely.', 'Try again. If it repeats, report this issue.', 'draft'],
    'llm-failure': ['Proposal failed', 'Drafting could not finish. The provider cause is unknown.', 'Try again. If it repeats, report this issue.', 'draft'],
    'unknown-cause': ['Proposal failed', 'Drafting could not finish. Cause unknown.', 'Check the selected result and try again.', 'draft'],
    'invalid-request': ['Proposal request invalid', 'Sibu could not read this proposal request.', 'Correct the selection and try again.', 'none'],
  };
  const proposalUnavailable = ['missing-openai-api-key'];
  const proposalBlocked = ['invalid-scope', 'unclear-direction', 'stale-analysis', 'missing-artifact', 'missing-cell', 'missing-assertion', 'non-failed-assertion', 'unsafe-target-files', 'invalid-request'];
  const proposalRejected = ['vague-proposal', 'unsafe-target-files'];
  const proposalFailed = ['provider-authorization', 'provider-rate-limit', 'provider-timeout', 'provider-unavailable', 'invalid-llm-response', 'llm-failure', 'unknown-cause'];
  function safeProposalIssue(result) {
    const issue = result?.issue, category = issue?.category;
    const valid = issue?.stage === 'proposal' && issue.category === result.reason && Object.hasOwn(proposalGuidance, category)
      && ((issue.outcome === 'blocked' && ((result.status === 'proposal-unavailable' && proposalUnavailable.includes(category))
        || (result.status === 'blocked' && proposalBlocked.includes(category)) || (result.status === 'proposal-rejected' && proposalRejected.includes(category))))
        || (issue.outcome === 'failed' && proposalFailed.includes(category) && result.status === 'error'))
      && typeof issue.reference === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(issue.reference);
    if (!valid) return null;
    return { copy: proposalGuidance[category], details: 'Stage: proposal\nOutcome: ' + issue.outcome + '\nCategory: ' + category + '\nReference: ' + issue.reference.toLowerCase() };
  }
  function safeApplyIssue(result) {
    const issue = result?.issue, category = issue?.category;
    const blocked = ['invalid-request', 'missing-approval', 'stale-proposal', 'wrong-project-root', 'unsafe-target', 'unsafe-workflow-readiness'];
    const uncertain = ['mutation-failure', 'unexpected-port-failure'];
    if (!issue || issue.stage !== 'repair-apply' || issue.category !== result.reason ||
      !((result.status === 'blocked' && issue.outcome === 'blocked' && blocked.includes(category)) ||
        (result.status === 'error' && issue.outcome === 'uncertain' && uncertain.includes(category))) ||
      typeof issue.reference !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(issue.reference)) return null;
    return 'Stage: repair-apply\nOutcome: ' + issue.outcome + '\nCategory: ' + category + '\nReference: ' + issue.reference.toLowerCase();
  }
  function applyOutcome(result) {
    if (result?.status === 'applied' && Array.isArray(result.changedFiles) && result.rerunRecommendation?.primaryAction) return 'applied';
    if (result?.status === 'blocked' && result.changedFileCount === 0 && Array.isArray(result.changedFiles) && !result.changedFiles.length &&
      safeApplyIssue(result)) return 'blocked';
    return 'uncertain';
  }
  const applyBlockedGuidance = {
    'invalid-request': 'Sibu could not read the approval request.',
    'missing-approval': 'Approval for this concrete proposal was missing.',
    'stale-proposal': 'This proposal no longer matches the selected failure.',
    'wrong-project-root': 'The proposal belongs to a different project.',
    'unsafe-target': 'The proposed project file could not be verified as safe.',
    'unsafe-workflow-readiness': 'The project was not ready for a safe repair.',
  };
  function filesToInspect(result) {
    const target = repairProposal?.affectedProjectFiles?.[0];
    if (typeof target !== 'string' || !target || target.length > 240) return [];
    const paths = [target, ...(Array.isArray(result?.inspectionPaths) ? result.inspectionPaths : []),
      ...(Array.isArray(result?.changedFiles) ? result.changedFiles.map(file => file?.path) : [])];
    return [...new Set(paths.filter(path => typeof path === 'string' && path.length <= 240 &&
      (path === target || path.startsWith(target + '.sibu-') && !/[\\/\r\n]/.test(path.slice(target.length)))))];
  }
  const selectionKey = selection => selection ? JSON.stringify([selection.suiteId, selection.runId, selection.testCaseId, selection.attempt, selection.assertionId]) : '';
  function currentFailureSelected() {
    if (!selectedFailure || !latestRun()) return false;
    if (typeof detailSelection !== 'undefined') {
      if (!detailSelection || selectionKey(selectedFailure) !== selectionKey({ ...detailSelection, testCaseId: detailSelection.caseId })) return false;
    }
    if (typeof selectedRunId !== 'undefined' && selectedFailure.runId !== selectedRunId) return false;
    if (typeof suite !== 'undefined' && selectedFailure.suiteId !== suite?.id) return false;
    return true;
  }
  function resetRepair() {
    repairGeneration++; selectedFailure = null; repairStage = 'idle'; repairAnalysis = null; repairAnalysisId = null;
    repairProposal = null; repairApplied = null; repairMessage = ''; repairPending = false; repairAffectedFiles = []; analysisIssueDetails = null; repairIssueCopy = null;
    proposalIssueCopy = null; proposalIssueDetails = null; proposalAnnouncement = ''; applyIssueDetails = null;
  }
  function repairMarkup() {
    if (!currentFailureSelected()) return '';
    const pending = repairPending ? ' disabled' : '';
    const notice = '<p role="status" aria-live="polite">' + esc(repairMessage) + '</p>';
    if (repairStage === 'idle' || repairStage === 'loading') return '<h3 tabindex="-1">Fix one failure</h3><p>Selected failed check: ' + esc(selectedFailure.assertionId) + '</p><button type="button" data-action="analyze-failure"' + pending + '>Analyze failure</button>' + notice;
    if (repairStage === 'unavailable' || repairStage === 'retryable-error') {
      const [title, explanation, nextStep] = repairIssueCopy;
      return '<div class="model-notice" data-analysis-notice><h3 tabindex="-1">' + esc(title) + '</h3><p>' + esc(explanation + ' ' + nextStep) + ' Your eval result is still here.</p>'
        + '<button type="button" data-action="analyze-failure">Try analysis again</button>'
        + (analysisIssueDetails ? '<pre data-analysis-issue-details>' + esc(analysisIssueDetails) + '</pre><button type="button" data-action="copy-analysis-issue">Copy issue details</button><p data-analysis-copy-status></p>' : '')
        + notice + '</div>';
    }
    if (repairStage === 'analysis' || repairStage === 'proposal-error') {
      const analysis = repairAnalysis;
      const cause = analysis?.likelyCause || 'unclear_needs_human_judgment';
      const canDraft = cause !== 'model_nondeterminism' && cause !== 'unclear_needs_human_judgment';
      const analysisHtml = '<h3 tabindex="-1">AI analysis</h3><p>' + esc(analysis?.exactFailureExplanation || '') + '</p><p>Likely cause: ' + esc(cause.replaceAll('_', ' ')) + '</p><p>Evidence: ' + esc(analysis?.evidenceSummary || '') + '</p><p>Uncertainty: ' + esc(analysis?.uncertainty || '') + '</p>';
      if (repairStage === 'proposal-error') {
        const [title, explanation, nextStep, action] = proposalIssueCopy;
        return analysisHtml + '<section class="model-notice detail-section" data-proposal-notice aria-label="Repair Proposal"><h3 tabindex="-1" data-proposal-heading>' + esc(title) + '</h3><p>' + esc(explanation + ' ' + nextStep) + '</p>'
          + '<span class="live" role="status" data-proposal-announcement>' + esc(proposalAnnouncement) + '</span>'
          + (action === 'analysis' ? '<button type="button" data-action="analyze-failure">Try analysis again</button>' : action === 'draft' && canDraft ? '<button type="button" data-action="draft-repair"' + pending + '>Try drafting again</button>' : '')
          + (proposalIssueDetails ? '<pre data-proposal-issue-details>' + esc(proposalIssueDetails) + '</pre><button type="button" data-action="copy-proposal-issue">Copy issue details</button><p data-proposal-copy-status></p>' : '') + '</section>';
      }
      return analysisHtml + (canDraft ? '<button type="button" data-action="draft-repair"' + pending + '>Draft repair</button>' : '<p>Review this uncertainty before choosing a repair target.</p>') + notice;
    }
    if (repairStage === 'proposal' || repairStage === 'apply-blocked' || repairStage === 'apply-uncertain') {
      const proposal = repairProposal;
      const change = proposal?.proposedChange;
      const canApply = repairStage === 'proposal';
      return '<h3 tabindex="-1">Proposed repair</h3><p>1 file: ' + esc(proposal?.affectedProjectFiles?.[0] || '') + '</p><p>' + esc(proposal?.changeSummary || '') + '</p>'
        + '<section class="detail-section" aria-label="Exact proposed change"><h4>' + esc(change?.kind === 'unified-diff' ? 'Proposed diff' : 'Proposed replacement') + '</h4><pre>' + esc((change?.representation || '').split('\n').slice(0, 5).join('\n')) + '</pre><details><summary>' + (change?.kind === 'unified-diff' ? 'Show full diff' : 'Show full replacement') + '</summary><pre>' + esc(change?.representation || '') + '</pre></details></section>'
        + '<h4>Rationale</h4><p>' + esc(proposal?.rationale || '') + '</p><h4>Expected impact</h4><p>' + esc(proposal?.expectedEvalImpact || '') + '</p>'
        + (canApply ? '<button class="primary" type="button" data-action="approve-repair"' + pending + '>Approve and apply</button><button type="button" data-action="reject-repair"' + pending + '>Not now</button>' + notice : '')
        + (canApply ? '' : '<section class="model-notice detail-section" data-apply-notice aria-label="Repair Proposal"><h4 tabindex="-1" data-apply-heading>'
          + (repairStage === 'apply-blocked' ? 'Repair blocked' : 'Repair outcome not confirmed') + '</h4><p>' + esc(repairMessage) + '</p>'
          + '<span class="live" role="status" data-apply-announcement>' + esc(repairMessage ? repairStage === 'apply-blocked' ? 'Repair blocked' : 'Repair outcome not confirmed' : '') + '</span>'
          + (repairStage === 'apply-uncertain' ? '<p>Inspect the named files before drafting or applying another fix. No automatic retry.</p><button type="button" data-action="view-repair-files">View files to inspect</button>' : '')
          + '</section>')
        + (applyIssueDetails ? '<pre data-apply-issue-details>' + esc(applyIssueDetails) + '</pre><button type="button" data-action="copy-apply-issue">Copy issue details</button><p data-apply-copy-status></p>' : '')
        + (repairAffectedFiles.length ? '<section data-repair-files aria-label="Files to inspect"><h4 tabindex="-1" data-repair-files-heading>Files to inspect</h4><ul>'
          + repairAffectedFiles.map(path => '<li>' + esc(path) + '</li>').join('') + '</ul></section>' : '');
    }
    return '<h3 tabindex="-1">Repair applied</h3><p>The result is not verified until you rerun the eval.</p><ul>'
      + (repairApplied?.changedFiles || []).map(file => '<li>' + esc(file.path) + ' — ' + esc(file.summary || '') + '</li>').join('') + '</ul>'
      + '<button class="primary" type="button" data-action="rerun-case">Rerun this case</button><button type="button" data-action="rerun-suite">Rerun all cases</button>' + notice;
  }
  function renderRepair() {
    const activeAction = document.activeElement?.dataset?.action;
    const hosts = [...document.querySelectorAll('[data-repair-host]')];
    const activeHost = hosts.find(node => node.closest?.('[role="dialog"]')) || hosts[0];
    hosts.forEach(node => {
      node.innerHTML = repairMarkup();
      if (node !== activeHost) {
        node.querySelector?.('[data-proposal-announcement]')?.replaceChildren?.();
        node.querySelector?.('[data-apply-announcement]')?.replaceChildren?.();
      }
    });
    const shouldFocusNotice = proposalAnnouncement && activeAction === 'draft-repair' && !activeHost?.querySelector?.('[data-action="draft-repair"]');
    const shouldFocusApply = activeAction === 'approve-repair' && repairStage !== 'proposal' && !repairPending;
    proposalAnnouncement = '';
    if (activeAction) {
      const next = shouldFocusApply ? activeHost?.querySelector?.('[data-apply-heading]') : shouldFocusNotice ? activeHost?.querySelector?.('[data-proposal-heading]')
        : activeHost?.querySelector?.('[data-action="' + activeAction + '"]') || activeHost?.querySelector?.('h3');
      next?.focus?.();
    }
  }
  async function requestRepair(kind) {
    if (!currentFailureSelected() || repairPending) return;
    const current = { ...selectedFailure }, key = selectionKey(current), generation = ++repairGeneration;
    repairPending = true; repairMessage = kind === 'analysis' ? 'Analyzing the selected check…' : kind === 'proposal' ? 'Drafting one-file repair…' : 'Checking approval and file state…';
    if (kind === 'analysis') { repairStage = 'loading'; analysisIssueDetails = null; repairIssueCopy = null; }
    if (kind === 'apply') applyIssueDetails = null;
    renderRepair();
    try {
      let result;
      if (kind === 'analysis') result = await post('/api/failure-analysis', current);
      else if (kind === 'proposal') {
        if (!['analysis', 'proposal-error', 'apply-blocked', 'apply-uncertain'].includes(repairStage) || !repairAnalysis) return;
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
      if (generation !== repairGeneration || selectionKey(selectedFailure) !== key || !currentFailureSelected()) return;
      if (kind === 'analysis' && result.status === 'analysis-ready') { repairAnalysis = result.analysis; repairAnalysisId = result.analysisId; repairStage = 'analysis'; repairMessage = ''; }
      else if (kind === 'analysis') {
        const safe = safeAnalysisIssue(result);
        repairIssueCopy = safe?.copy || analysisGuidance.unknown;
        analysisIssueDetails = safe?.details || null;
        repairStage = result.status === 'analysis-unavailable' ? 'unavailable' : 'retryable-error';
        repairMessage = repairIssueCopy[0];
      }
      else if (kind === 'proposal' && result.status === 'proposal-ready') { repairProposal = result.proposal; proposalIssueCopy = null; proposalIssueDetails = null; repairStage = 'proposal'; repairMessage = ''; }
      else if (kind === 'proposal') {
        const safe = safeProposalIssue(result);
        proposalIssueCopy = safe?.copy || proposalGuidance['unknown-cause'];
        proposalIssueDetails = safe?.details || null;
        repairProposal = null; repairStage = 'proposal-error'; repairMessage = '';
        proposalAnnouncement = proposalIssueCopy[0];
      }
      else if (kind === 'apply' && applyOutcome(result) === 'applied') { repairApplied = result; repairStage = 'applied'; repairMessage = 'Source run unchanged. Rerun to verify.'; }
      else if (kind === 'apply') {
        repairStage = applyOutcome(result) === 'blocked' ? 'apply-blocked' : 'apply-uncertain';
        applyIssueDetails = repairStage === 'apply-blocked' || result?.status === 'error' ? safeApplyIssue(result) : null;
        repairAffectedFiles = repairStage === 'apply-uncertain' ? filesToInspect(result) : [];
        repairMessage = repairStage === 'apply-blocked' ? applyBlockedGuidance[result.reason] + ' No project files changed. Review the proposal and selected result before drafting another fix.'
          : 'Sibu could not confirm whether the approved change was applied.';
      }
      else repairMessage = result.message || result.reason || 'This step is unavailable. Review the selected evidence and try again.';
    } catch {
      if (generation === repairGeneration && selectionKey(selectedFailure) === key && currentFailureSelected()) {
        if (kind === 'analysis') {
          repairStage = 'retryable-error'; repairIssueCopy = ['Analysis unavailable', "Sibu couldn't reach the analysis service.", 'Check the connection, then try analysis again. A matching terminal event may not exist.'];
          repairMessage = 'Analysis connection failed';
        }
        if (kind === 'apply') { repairStage = 'apply-uncertain'; repairAffectedFiles = filesToInspect(null); }
        if (kind === 'proposal') {
          repairProposal = null; repairStage = 'proposal-error'; proposalIssueDetails = null;
          proposalIssueCopy = ['Proposal connection failed', 'Sibu could not confirm whether drafting finished.', 'Check the connection before trying again. A matching terminal event may not exist.', 'draft'];
          proposalAnnouncement = proposalIssueCopy[0]; repairMessage = '';
        }
        if (kind === 'apply') repairMessage = 'Sibu could not confirm whether the approved change was applied. The connection failed; a matching terminal event may not exist.';
      }
    } finally {
      if (generation === repairGeneration && selectionKey(selectedFailure) === key && currentFailureSelected()) { repairPending = false; renderRepair(); }
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
    if (target.dataset.action === 'copy-apply-issue' && applyIssueDetails) {
      const details = applyIssueDetails, generation = repairGeneration, key = selectionKey(selectedFailure);
      const feedback = message => { if (generation === repairGeneration && key === selectionKey(selectedFailure)) {
        document.querySelector('[data-repair-host] [data-apply-copy-status]')?.replaceChildren?.(message);
      } };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        void Promise.resolve(navigator.clipboard.writeText(details)).then(() => feedback('Issue details copied.'),
          () => feedback('Copy unavailable. Select the issue details above.'));
      } catch { feedback('Copy unavailable. Select the issue details above.'); }
    }
    if (target.dataset.action === 'view-repair-files' && repairStage === 'apply-uncertain') {
      const hosts = [...document.querySelectorAll('[data-repair-host]')];
      const host = hosts.find(node => node.closest?.('[role="dialog"]')) || hosts[0];
      host?.querySelector?.('[data-repair-files-heading]')?.focus?.();
    }
    if (target.dataset.action === 'copy-proposal-issue' && proposalIssueDetails) {
      const details = proposalIssueDetails, generation = repairGeneration, key = selectionKey(selectedFailure);
      const feedback = message => { if (generation === repairGeneration && key === selectionKey(selectedFailure)) {
        document.querySelector('[data-repair-host] [data-proposal-copy-status]')?.replaceChildren?.(message);
      } };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        void Promise.resolve(navigator.clipboard.writeText(details)).then(() => feedback('Issue details copied.'),
          () => feedback('Copy unavailable. Select the issue details above.'));
      } catch { feedback('Copy unavailable. Select the issue details above.'); }
    }
    if (target.dataset.action === 'copy-analysis-issue' && analysisIssueDetails) {
      const details = analysisIssueDetails, generation = repairGeneration, key = selectionKey(selectedFailure);
      const feedback = message => { if (generation === repairGeneration && key === selectionKey(selectedFailure)) {
        document.querySelector('[data-repair-host] [data-analysis-copy-status]')?.replaceChildren?.(message);
      } };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        void Promise.resolve(navigator.clipboard.writeText(details)).then(() => feedback('Issue details copied.'),
          () => feedback('Copy unavailable. Select the issue details above.'));
      } catch { feedback('Copy unavailable. Select the issue details above.'); }
    }
    if (target.dataset.action === 'analyze-failure') void requestRepair('analysis');
    if (target.dataset.action === 'draft-repair') void requestRepair('proposal');
    if (target.dataset.action === 'approve-repair') void requestRepair('apply');
    if (target.dataset.action === 'reject-repair') { repairGeneration++; repairProposal = null; repairStage = 'analysis'; repairMessage = 'Proposal set aside. The selected evidence remains available.'; renderRepair(); }
    if (target.dataset.action === 'rerun-case') void rerunAfterRepair('case');
    if (target.dataset.action === 'rerun-suite') void rerunAfterRepair('suite');
  });
`;
