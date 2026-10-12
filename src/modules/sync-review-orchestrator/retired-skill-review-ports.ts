import type { SibuState } from '../../shared/types.js';
import type { SkillIdentity } from '../template-catalog/retirements.js';
import type { RetiredSkillReviewChoice } from './retired-skill-review-command.js';
import type { RetiredSkillReviewResult } from './retired-skill-review-result.js';

export type RetiredSkillFileSnapshot =
  | { status: 'missing' | 'unsafe' }
  | { status: 'present'; sha256: string; referencesSkill: boolean };

export type RetiredSkillReference = Readonly<{ path: string; description: string }>;

export type RetiredSkillReviewPorts = Readonly<{
  catalog: { resolveSkill(skillId: string): SkillIdentity };
  state: { read(): Readonly<SibuState> };
  files: {
    inspect(path: string, skillId: string): RetiredSkillFileSnapshot;
    userReferences(skillId: string): readonly RetiredSkillReference[];
  };
  interaction: { choose(preview: Extract<RetiredSkillReviewResult, { status: 'preview' }>): Promise<RetiredSkillReviewChoice> };
}>;
