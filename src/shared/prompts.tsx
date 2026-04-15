import { cancel, isCancel, multiselect, select, text } from '@clack/prompts';
import gradient from 'gradient-string';
import { Box, Text, render, useApp } from 'ink';
import React, { useEffect } from 'react';

import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_LANGUAGE_SKILLS, SUPPORTED_AGENTS } from './catalog.js';
import type { ArchitectureSkillId, EkkoState, LanguageSkillId, SelectableArchitectureSkill, SelectableLanguageSkill, SupportedAgent } from './types.js';

export async function renderIntro(): Promise<void> {
  console.log(gradient(['#39ff14', '#00e5ff', '#9b5de5']).multiline('⧖  E K K O  ⧖'));

  const app = render(<IntroPanel />);
  await app.waitUntilExit();
}

function IntroPanel(): React.ReactElement {
  const { exit } = useApp();

  useEffect(() => {
    const timer = setTimeout(exit, 650);
    return () => clearTimeout(timer);
  }, [exit]);

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
      <Text color="cyanBright">Loop engine online</Text>
      <Text color="greenBright">Build. Test. Rewind. Improve.</Text>
    </Box>
  );
}

export async function askForSupportedAgents(): Promise<SupportedAgent[]> {
  const selectedAgentIds = await multiselect({
    message: 'Select the agents this project should support.',
    required: true,
    options: SUPPORTED_AGENTS.map((agent) => ({
      value: agent.id,
      label: agent.name,
      hint: agent.description,
    })),
  });

  if (isCancel(selectedAgentIds)) {
    cancel('Initialization cancelled.');
    process.exit(0);
  }

  return SUPPORTED_AGENTS.filter((agent) => selectedAgentIds.includes(agent.id));
}

export async function askForLanguageSkills(): Promise<SelectableLanguageSkill[]> {
  const selectedLanguageSkillIds = await multiselect({
    message: 'Select the languages this project should support.',
    required: false,
    options: SELECTABLE_LANGUAGE_SKILLS.map((skill) => ({
      value: skill.id,
      label: skill.name,
      hint: skill.description,
    })),
  });

  if (isCancel(selectedLanguageSkillIds)) {
    cancel('Initialization cancelled.');
    process.exit(0);
  }

  return SELECTABLE_LANGUAGE_SKILLS.filter((skill) => selectedLanguageSkillIds.includes(skill.id));
}

export async function askForArchitectureSkill(): Promise<SelectableArchitectureSkill | undefined> {
  const selectedArchitectureSkillId = await select<ArchitectureSkillId | 'none'>({
    message: 'Select an architecture style for this project.',
    options: [
      { value: 'none', label: 'None', hint: 'Do not install opinionated architecture guidance.' },
      ...SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => ({
        value: skill.id,
        label: skill.name,
        hint: skill.description,
      })),
    ],
  });

  if (isCancel(selectedArchitectureSkillId)) {
    cancel('Initialization cancelled.');
    process.exit(0);
  }

  if (selectedArchitectureSkillId === 'none') {
    return undefined;
  }

  return SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === selectedArchitectureSkillId);
}

export async function askForNewLanguageSkills(state: EkkoState): Promise<{ state: EkkoState; changedState: boolean }> {
  const selectedLanguageSkillIds = new Set(state.selectedLanguageSkills ?? []);
  const unselectedLanguageSkills = SELECTABLE_LANGUAGE_SKILLS.filter((skill) => !selectedLanguageSkillIds.has(skill.id));

  if (unselectedLanguageSkills.length === 0) {
    return { state, changedState: false };
  }

  const selectedNewLanguageSkillIds = await multiselect<LanguageSkillId>({
    message: 'Select any new languages this project should support.',
    required: false,
    options: unselectedLanguageSkills.map((skill) => ({
      value: skill.id,
      label: skill.name,
      hint: skill.description,
    })),
  });

  if (isCancel(selectedNewLanguageSkillIds)) {
    cancel('Sync cancelled.');
    process.exit(0);
  }

  for (const selectedSkillId of selectedNewLanguageSkillIds) {
    selectedLanguageSkillIds.add(selectedSkillId);
  }

  if (selectedNewLanguageSkillIds.length === 0) {
    return { state, changedState: false };
  }

  return {
    state: {
      ...state,
      selectedLanguageSkills: [...selectedLanguageSkillIds],
      updatedAt: new Date().toISOString(),
    },
    changedState: true,
  };
}

export async function askForNewArchitectureSkill(state: EkkoState): Promise<{ state: EkkoState; changedState: boolean }> {
  if (state.selectedArchitectureSkill) {
    return { state, changedState: false };
  }

  const selectedArchitectureSkillId = await select<ArchitectureSkillId | 'none'>({
    message: 'Select an architecture style for this project.',
    options: [
      { value: 'none', label: 'None', hint: 'Do not install opinionated architecture guidance.' },
      ...SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => ({
        value: skill.id,
        label: skill.name,
        hint: skill.description,
      })),
    ],
  });

  if (isCancel(selectedArchitectureSkillId)) {
    cancel('Sync cancelled.');
    process.exit(0);
  }

  return {
    state:
      selectedArchitectureSkillId === 'none'
        ? state
        : {
            ...state,
            selectedArchitectureSkill: selectedArchitectureSkillId,
            updatedAt: new Date().toISOString(),
          },
    changedState: selectedArchitectureSkillId !== 'none',
  };
}

export async function askForProjectOverview(): Promise<string> {
  const overview = await text({
    message: 'Tell me what this project is about.',
    placeholder: 'A local-first notes app for software teams.',
    validate(value) {
      if (!value?.trim()) {
        return 'Please enter a short project overview so I can create AGENTS.md.';
      }

      return undefined;
    },
  });

  if (isCancel(overview)) {
    cancel('Initialization cancelled.');
    process.exit(0);
  }

  return overview;
}
