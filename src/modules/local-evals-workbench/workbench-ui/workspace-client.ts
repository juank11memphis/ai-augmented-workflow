import { WORKSPACE_SETUP_CLIENT } from './workspace-setup-client.js';
import { WORKSPACE_RESULTS_CLIENT } from './workspace-results-client.js';
import { WORKSPACE_CASE_DETAIL_CLIENT } from './workspace-case-detail.js';
import { WORKSPACE_SUITE_MODELS_CLIENT } from './workspace-suite-models-client.js';
import { WORKSPACE_CASE_MODELS_CLIENT } from './workspace-case-models-client.js';

export const WORKSPACE_CLIENT_SCRIPT = ['(() => {', WORKSPACE_SETUP_CLIENT, WORKSPACE_SUITE_MODELS_CLIENT, WORKSPACE_CASE_MODELS_CLIENT, WORKSPACE_CASE_DETAIL_CLIENT, WORKSPACE_RESULTS_CLIENT, '})();'].join('\n');
