import { log } from '@clack/prompts';

import type { UseSkillCommand } from './command.js';

export async function handleUseSkill(command: UseSkillCommand): Promise<void> {
  log.info(`Skill selection for \`${command.skillName}\` is not implemented yet.`);
}
