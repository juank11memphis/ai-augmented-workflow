import { isDeepStrictEqual } from 'node:util';

// Fixture-only command/result contract; no Sibu runtime execution implementation.
// Command: protocolVersion, requestId, operation, optional runId, model,
// judgeModel, repeats, normalized inline testCases. Result: ordered events/status.
// Ports: createTarget(mockDispatch), judge({model,rubric,output}), custom({name,output}).
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,79}$/;
const capabilities = ['single-turn', 'multi-turn', 'tool-mocks', 'custom', 'rubric'];
const models = ['fake/target'];
const judgeModels = ['fake/judge'];

export function safeEvidence(value, depth = 0) {
  if (depth > 12) throw new Error('unsafe-evidence');
  if (typeof value === 'string') {
    if (value.length > 2048 || /sk-|secret-canary|Bearer\s|https?:\/\//i.test(value)) throw new Error('unsafe-evidence');
    return value;
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error('unsafe-evidence');
    return value.map((entry) => safeEvidence(entry, depth + 1));
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('unsafe-evidence');
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key,
    /token|password|credential|api.?key/i.test(key) ? '[REDACTED]' : safeEvidence(entry, depth + 1)]));
}

function validate(command, evalMode) {
  if (evalMode !== '1' || !command || command.protocolVersion !== 1 || !identifier.test(command.requestId ?? '')) throw new Error('invalid-request');
  safeEvidence(command.requestId);
  if (command.operation === 'describe') return;
  if (!['estimate', 'execute'].includes(command.operation) || !models.includes(command.model)) throw new Error('invalid-request');
  if (!Number.isInteger(command.repeats) || command.repeats < 1 || command.repeats > 5) throw new Error('invalid-request');
  if (!Array.isArray(command.testCases) || command.testCases.length === 0 || command.testCases.length > 10) throw new Error('invalid-request');
  if (command.operation === 'execute' && !identifier.test(command.runId ?? '')) throw new Error('invalid-request');
  if (command.operation === 'execute') safeEvidence(command.runId);
  const ids = new Set();
  for (const item of command.testCases) {
    if (!identifier.test(item.id ?? '') || ids.has(item.id)) throw new Error('invalid-request');
    ids.add(item.id);
    if (!Array.isArray(item.turns) || item.turns.length === 0 || item.turns.length > 10) throw new Error('invalid-request');
    for (const turn of item.turns) {
      if (!['system', 'user', 'assistant', 'tool'].includes(turn.role) || turn.content?.type !== 'inline' || typeof turn.content.text !== 'string') throw new Error('invalid-request');
    }
    if (!Array.isArray(item.toolMocks) || !Array.isArray(item.assertions) || !Array.isArray(item.graders) || item.assertions.length + item.graders.length === 0) throw new Error('invalid-request');
    for (const grader of item.graders) {
      if (!identifier.test(grader.id ?? '') || !['custom', 'rubric'].includes(grader.type)) throw new Error('invalid-request');
      if (grader.type === 'rubric' && (grader.rubric?.type !== 'inline' || typeof grader.rubric.text !== 'string' || !Number.isFinite(grader.threshold) || grader.threshold < 0 || grader.threshold > 1 || !judgeModels.includes(command.judgeModel))) throw new Error('invalid-request');
    }
  }
  if (command.judgeModel !== null && !judgeModels.includes(command.judgeModel)) throw new Error('invalid-request');
  safeEvidence(command.testCases);
}

export async function handleRequest(command, ports, { evalMode = '1' } = {}) {
  const events = [];
  let identity = { runId: null, caseId: null, attempt: null };
  let requestId = 'invalid-request';
  function emit(type, data) {
    const safe = safeEvidence(data);
    events.push({ protocolVersion: 1, requestId, sequence: events.length, type, ...identity, data: safe });
  }
  try {
    validate(command, evalMode);
    requestId = command.requestId;
  } catch {
    emit('run-diagnostic', { code: 'invalid-request', message: 'Invalid runner request.' });
    return { status: 'error', events };
  }
  if (command.operation === 'describe') {
    emit('description', { runnerId: 'synthetic-support', capabilities, models, judgeModels, requiredEnvironment: [], costEstimation: false });
    return { status: 'completed', events };
  }
  if (command.operation === 'estimate') {
    const targetCalls = command.testCases.reduce((sum, item) => sum + item.turns.length, 0) * command.repeats;
    const judgeCalls = command.testCases.reduce((sum, item) => sum + item.graders.filter((grader) => grader.type === 'rubric').length, 0) * command.repeats;
    emit('estimate', { targetCalls, judgeCalls, totalCalls: targetCalls + judgeCalls, cost: { status: 'unavailable', reason: 'Synthetic fixture has no provider pricing.' } });
    return { status: 'completed', events };
  }
  identity.runId = command.runId;
  emit('run-started', { model: command.model, judgeModel: command.judgeModel });
  try {
    for (const item of command.testCases) {
      for (let attempt = 1; attempt <= command.repeats; attempt += 1) {
        identity = { runId: command.runId, caseId: item.id, attempt };
        emit('case-attempt-started', {});
        let cursor = 0;
        const dispatch = async (tool, args) => {
          const mock = item.toolMocks[cursor];
          if (!mock || mock.tool !== tool || !isDeepStrictEqual(mock.input, args)) {
            emit('tool-interaction-recorded', { position: cursor, tool, arguments: args, outcome: { type: 'rejected', code: 'tool-mismatch' } });
            throw new Error('tool-mismatch');
          }
          emit('tool-interaction-recorded', { position: cursor++, tool, arguments: args, outcome: mock.outcome });
          return mock.outcome;
        };
        // Replacement happens before framework initialization/capture.
        const target = ports.createTarget(dispatch);
        const history = [];
        let output = '';
        for (const [turnIndex, turn] of item.turns.entries()) {
          output = await target.turn(history, turn, command.model);
          emit('conversation-turn-completed', { turnIndex, role: 'assistant', output });
        }
        for (const grader of item.graders) {
          const base = { id: grader.id, diagnostics: [], artifactReferences: [] };
          if (grader.type === 'custom') {
            emit('custom-assertion-completed', { ...base, ...await ports.custom({ name: grader.name, output }) });
          } else {
            const judgment = await ports.judge({ model: command.judgeModel, rubric: grader.rubric.text, output });
            if (!Number.isFinite(judgment.score) || judgment.score < 0 || judgment.score > 1) throw new Error('unsafe-judgment');
            emit('rubric-judgment-completed', { ...base, ...judgment, judgeModel: command.judgeModel, threshold: grader.threshold, passed: judgment.score >= grader.threshold });
          }
        }
        emit('case-attempt-completed', { status: 'completed' });
      }
    }
  } catch {
    emit('run-diagnostic', { code: 'execution-failed', message: 'Runner attempt failed safely.' });
    emit('case-attempt-completed', { status: 'error' });
    identity = { runId: command.runId, caseId: null, attempt: null };
    emit('run-completed', { status: 'error' });
    return { status: 'error', events };
  }
  identity = { runId: command.runId, caseId: null, attempt: null };
  emit('run-completed', { status: 'completed' });
  return { status: 'completed', events };
}
