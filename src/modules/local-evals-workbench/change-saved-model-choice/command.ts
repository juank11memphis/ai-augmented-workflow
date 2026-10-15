export type ChangeSavedModelChoiceCommand = {
  readonly suiteId: string;
  readonly role: 'tested' | 'judge';
  readonly action: 'set' | 'reset';
  readonly modelId?: string;
  readonly expectedToken: string;
};
