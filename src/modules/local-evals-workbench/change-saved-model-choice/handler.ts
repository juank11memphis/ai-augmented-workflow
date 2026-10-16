import type { ChangeSavedModelChoiceCommand } from './command.js';
import type { ChangeSavedModelChoicePorts } from './ports.js';
import type { ChangeSavedModelChoiceResult } from './result.js';

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;
const SUITE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const TOKEN = /^[a-f0-9]{64}$/;

export async function changeSavedModelChoice(command: ChangeSavedModelChoiceCommand, ports: ChangeSavedModelChoicePorts): Promise<ChangeSavedModelChoiceResult> {
  const blocked = (reason: Extract<ChangeSavedModelChoiceResult, { status: 'blocked' }>['reason']): ChangeSavedModelChoiceResult => {
    report('suite_choice_blocked', reason);
    return { status: 'blocked', reason };
  };
  const report = (event: 'suite_choice_saved' | 'suite_choice_blocked', reason?: string): void => {
    try { if (SUITE_ID.test(command.suiteId)) ports.log?.({ event, suiteId: command.suiteId, role: command.role, ...(reason ? { reason } : {}) }); } catch { /* Logging is noncritical. */ }
  };
  if (!SUITE_ID.test(command.suiteId) || !TOKEN.test(command.expectedToken) || !['tested', 'judge'].includes(command.role)
    || !['set', 'reset'].includes(command.action) || (command.action === 'set' && (!command.modelId || !MODEL_ID.test(command.modelId)))
    || (command.action === 'reset' && command.modelId !== undefined)) return blocked('invalid-request');
  try {
    const snapshot = await ports.files.read(command.suiteId);
    if ('status' in snapshot) return blocked(snapshot.reason);
    if (snapshot.token !== command.expectedToken) { report('suite_choice_blocked', 'suite-changed'); return { status: 'conflict', reason: 'suite-changed' }; }
    if (command.action === 'set') {
      const described = await ports.runner.describe(snapshot.suite);
      if (described.status === 'blocked') return blocked('runner-unavailable');
      const available = command.role === 'tested' ? described.value.models : described.value.judgeModels;
      if (!available.includes(command.modelId!)) return blocked('model-unavailable');
    }
    const result = await ports.files.save(command.suiteId, command.role, command.action === 'set' ? command.modelId! : null, command.expectedToken);
    report(result.status === 'saved' ? 'suite_choice_saved' : 'suite_choice_blocked', result.status === 'saved' ? undefined : result.reason);
    return result;
  } catch { return blocked('write-failed'); }
}
