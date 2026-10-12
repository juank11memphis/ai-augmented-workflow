export type RetiredSkillReviewChoice = 'keep' | 'clean-up' | 'cancel';

export type RetiredSkillReviewCommand = Readonly<{
  type: 'preview-retired-skill';
  skillId: string;
}>;
