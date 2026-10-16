export type ChangeSavedModelChoiceResult =
  | { readonly status: 'saved'; readonly suiteId: string; readonly caseId?: string; readonly role: 'tested' | 'judge'; readonly modelId: string | null; readonly token: string }
  | { readonly status: 'conflict'; readonly reason: 'suite-changed'; readonly suiteId?: string; readonly caseId?: string; readonly role?: 'tested' | 'judge' }
  | { readonly status: 'blocked'; readonly reason: 'invalid-request' | 'case-unavailable' | 'suite-unavailable' | 'suite-invalid' | 'path-unsafe' | 'model-unavailable' | 'runner-unavailable' | 'write-failed'; readonly suiteId?: string; readonly caseId?: string; readonly role?: 'tested' | 'judge' };
