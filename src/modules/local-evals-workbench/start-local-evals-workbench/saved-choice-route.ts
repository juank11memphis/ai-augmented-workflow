import { changeSavedModelChoice, type ChangeSavedModelChoiceCommand, type ChangeSavedModelChoicePorts } from '../change-saved-model-choice/index.js';

type Body = { readonly status: 'ok'; readonly payload: unknown } | { readonly status: 'invalid'; readonly message: string };
type Response = { writeHead(status: number, headers: Record<string, string>): void; end(body: string): void };

export async function handleSavedChoiceRoute(
  method: string | undefined, response: Response, dependencies: ChangeSavedModelChoicePorts | undefined,
  readBody: () => Promise<Body>, reference: string, suiteId: string | null,
): Promise<void> {
  const write = (status: number, payload: unknown): void => {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-sibu-request-reference': reference });
    response.end(JSON.stringify(payload));
  };
  if (method !== 'POST' && method !== 'GET') { write(405, { status: 'blocked', reason: 'method-not-allowed' }); return; }
  if (!dependencies) { write(503, { status: 'blocked', reason: 'runner-unavailable' }); return; }
  if (method === 'GET') {
    if (!suiteId) { write(400, { status: 'blocked', reason: 'invalid-request' }); return; }
    const snapshot = await dependencies.files.read(suiteId);
    if ('status' in snapshot) { write(422, snapshot); return; }
    write(200, { status: 'ready', suiteId, token: snapshot.token,
      defaultTestedModel: snapshot.suite.defaultTestedModel ?? null, defaultJudgeModel: snapshot.suite.defaultJudgeModel ?? null,
      cases: snapshot.suite.testCases.map(testCase => ({ caseId: testCase.id,
        testedModel: testCase.testedModel ?? null, judgeModel: testCase.judgeModel ?? null })) });
    return;
  }
  const body = await readBody();
  const command = body.status === 'ok' ? parseSavedChoiceRequest(body.payload) : undefined;
  if (!command) { write(400, { status: 'blocked', reason: 'invalid-request' }); return; }
  const result = await changeSavedModelChoice(command, dependencies);
  write(result.status === 'saved' ? 200 : result.status === 'conflict' ? 409 : result.reason === 'invalid-request' ? 400 : 422, result);
}

function parseSavedChoiceRequest(payload: unknown): ChangeSavedModelChoiceCommand | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const value = payload as Record<string, unknown>;
  if (Object.keys(value).some(key => !['suiteId', 'caseId', 'role', 'action', 'modelId', 'expectedToken'].includes(key))) return undefined;
  if (typeof value.suiteId !== 'string' || typeof value.expectedToken !== 'string'
    || (value.role !== 'tested' && value.role !== 'judge') || (value.action !== 'set' && value.action !== 'reset')
    || (value.modelId !== undefined && typeof value.modelId !== 'string')
    || (value.caseId !== undefined && typeof value.caseId !== 'string')) return undefined;
  return { suiteId: value.suiteId, expectedToken: value.expectedToken, role: value.role, action: value.action,
    ...(typeof value.caseId === 'string' ? { caseId: value.caseId } : {}),
    ...(typeof value.modelId === 'string' ? { modelId: value.modelId } : {}) };
}
