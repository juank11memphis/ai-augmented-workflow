import { log } from '@clack/prompts';

import { getProjectContext } from '../../shared/paths.js';
import { getWorkflowMutationReadiness } from '../../shared/workflow-mutation-readiness.js';
import type { UseSkillCommand } from './command.js';

export async function handleUseSkill(command: UseSkillCommand): Promise<void> {
  const { rootPath, statePath } = getProjectContext();
  const readiness = getWorkflowMutationReadiness({ rootPath, statePath });

  if (!readiness.ok) {
    log.error(readiness.message);
    log.info(readiness.hint);

    for (const preview of readiness.actionablePreviews?.slice(0, 3) ?? []) {
      log.info(`${preview.relativePath}: ${preview.status}`);
    }

    process.exitCode = 1;
    return;
  }

  log.info(`Skill selection for \`${command.skillName}\` is not implemented yet.`);
}
