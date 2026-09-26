import { WORKBENCH_CLIENT_EVENTS_SECTION } from './workbench-client-events.js';
import { WORKBENCH_CLIENT_FOUNDATION_SECTION } from './workbench-client-foundation.js';
import { WORKBENCH_CLIENT_RENDERING_SECTION } from './workbench-client-rendering.js';
import { buildWorkbenchClientScript } from './workbench-client-script.js';
import { WORKBENCH_CLIENT_PREVIEW_SECTION } from './workbench-client-preview.js';
import { WORKBENCH_CLIENT_RUN_SECTION } from './workbench-client-run.js';

export const WORKBENCH_CLIENT_SCRIPT = buildWorkbenchClientScript([
  WORKBENCH_CLIENT_RENDERING_SECTION,
  WORKBENCH_CLIENT_FOUNDATION_SECTION,
  WORKBENCH_CLIENT_PREVIEW_SECTION,
  WORKBENCH_CLIENT_RUN_SECTION,
  WORKBENCH_CLIENT_EVENTS_SECTION,
]);
