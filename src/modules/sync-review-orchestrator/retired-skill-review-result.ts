import type { RetiredSkillReviewChoice } from './retired-skill-review-command.js';
import type { RetiredSkillFileSnapshot } from './retired-skill-review-ports.js';

export type RetiredSkillEffect = Readonly<{ path: string; reason: string }>;

export type RetiredSkillReviewResult =
  | { status: 'not-retired'; skillId: string }
  | {
    status: 'preview';
    skillId: string;
    stateFingerprint: string;
    observedFiles: Record<string, RetiredSkillFileSnapshot>;
    explanation: string;
    selected: boolean;
    choices: readonly RetiredSkillReviewChoice[];
    remove: RetiredSkillEffect[];
    keepAsOwn: RetiredSkillEffect[];
    removeFromSibuGuidance: RetiredSkillEffect[];
    reviewYourself: RetiredSkillEffect[];
    uncertain: RetiredSkillEffect[];
    canCleanUp: boolean;
  };
