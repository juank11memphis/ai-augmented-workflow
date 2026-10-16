import type { StartEvalRunCommand } from './command.js';
import { parseRunSelectionRequest } from '../run-selection-request-parser.js';

export function parseStartRequest(value: unknown): StartEvalRunCommand | undefined {
  return parseRunSelectionRequest(value, true);
}
