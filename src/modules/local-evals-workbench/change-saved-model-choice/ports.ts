import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import type { RunnerDescriptorPort } from '../runtime-ports.js';
import type { ChangeSavedModelChoiceResult } from './result.js';

export type SuiteChoiceSnapshot = { readonly suite: NormalizedEvalSuite; readonly token: string };
export interface SavedSuiteFilePort {
  read(suiteId: string): Promise<SuiteChoiceSnapshot | Extract<ChangeSavedModelChoiceResult, { status: 'blocked' }>>;
  save(suiteId: string, role: 'tested' | 'judge', modelId: string | null, expectedToken: string): Promise<ChangeSavedModelChoiceResult>;
}
export type ChangeSavedModelChoicePorts = {
  readonly files: SavedSuiteFilePort;
  readonly runner: RunnerDescriptorPort;
  readonly log?: (event: { readonly event: 'suite_choice_saved' | 'suite_choice_blocked'; readonly suiteId: string; readonly reason?: string; readonly role: 'tested' | 'judge' }) => void;
};
