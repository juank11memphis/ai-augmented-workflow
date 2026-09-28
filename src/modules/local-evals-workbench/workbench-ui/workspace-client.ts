import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_REPAIR_CLIENT } from './workspace-repair-client.js';

export const WORKSPACE_CLIENT_SCRIPT = ['(() => {', WORKSPACE_SETUP_CLIENT, WORKSPACE_RESULTS_CLIENT, WORKSPACE_REPAIR_CLIENT, '})();'].join('\n');
