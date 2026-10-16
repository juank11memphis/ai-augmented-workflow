export type ChangeSavedModelChoiceResult =
  | { readonly status: 'saved'; readonly suiteId: string; readonly role: 'tested' | 'judge'; readonly modelId: string | null; readonly token: string }
  | { readonly status: 'conflict'; readonly reason: 'suite-changed' }
  | { readonly status: 'blocked'; readonly reason: 'invalid-request' | 'suite-unavailable' | 'suite-invalid' | 'path-unsafe' | 'model-unavailable' | 'runner-unavailable' | 'write-failed' };
