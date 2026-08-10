import path from 'node:path';

import { readStateForDoctor, STATE_RELATIVE_PATH } from '../../workflow-state-ledger/index.js';
import type { WorkflowStateReaderPort, WorkflowStateStatus } from './ports.js';

export class SibuWorkflowStateReader implements WorkflowStateReaderPort {
  readWorkflowState(projectRoot: string): WorkflowStateStatus {
    const statePath = path.join(projectRoot, STATE_RELATIVE_PATH);
    const result = readStateForDoctor(statePath);

    if (result.ok) {
      return { status: 'valid' };
    }

    if (result.message.includes('is missing')) {
      return { status: 'missing', message: result.message };
    }

    return { status: 'invalid', message: result.message };
  }
}
