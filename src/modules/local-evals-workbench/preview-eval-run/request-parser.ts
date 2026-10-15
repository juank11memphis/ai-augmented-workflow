import type { PreviewEvalRunCommand } from './command.js';
import { parseRunSelectionRequest } from '../run-selection-request-parser.js';

export function parsePreviewRequest(value: unknown): PreviewEvalRunCommand | undefined {
  return parseRunSelectionRequest(value, false);
}
