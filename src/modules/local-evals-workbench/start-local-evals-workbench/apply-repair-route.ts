import { applyApprovedEvalRepair, parseApplyApprovedEvalRepairRequest } from '../apply-approved-eval-repair/index.js';
import type { ApplyApprovedEvalRepairDependencies } from '../apply-approved-eval-repair/index.js';
import type { ApplyApprovedRepairLogEvent } from '../apply-approved-eval-repair/ports.js';
import type { LocalEvalsWorkbenchLoggerPort } from './ports.js';
import { applyRepairIssue, invalidApplyRepairIssue } from './public-issue.js';

type Body = { readonly status: 'ok'; readonly payload: unknown } | { readonly status: 'invalid'; readonly message: string };
type Response = { writeHead(status: number, headers: Record<string, string>): void; end(body: string): void };

export async function handleApplyRepairRoute<Request>(request: Request,
  response: Response, projectRoot: string, dependencies: ApplyApprovedEvalRepairDependencies, reference: string,
  logger: LocalEvalsWorkbenchLoggerPort, readBody: (request: Request) => Promise<Body>): Promise<void> {
  const body = await readBody(request);
  const parsed = body.status === 'ok' ? parseApplyApprovedEvalRepairRequest(projectRoot, body.payload) : undefined;
  if (!parsed || parsed.status === 'invalid') {
    const issue = invalidApplyRepairIssue(reference);
    emit(logger, { outcome: 'blocked', reason: 'invalid-request', reference, changedFileCount: 0 });
    write(response, 400, { status: 'blocked', reason: 'invalid-request', message: body.status === 'invalid' ? body.message : parsed?.message, issue, reference }, reference);
    return;
  }
  const result = await applyApprovedEvalRepair(parsed.command, { ...dependencies, logger: {
    info: event => emitHandler(logger, event, reference),
    warn: event => emitHandler(logger, event, reference),
    error: event => emitHandler(logger, event, reference),
  } });
  const issue = result.status === 'applied' ? undefined : applyRepairIssue(result, reference);
  write(response, result.status === 'applied' ? 200 : result.status === 'blocked' ? 422 : 500,
    issue ? { ...result, issue, reference } : { ...result, reference }, reference);
}

export function emitApplyResponseFailure(logger: LocalEvalsWorkbenchLoggerPort, reference: string): void {
  try { logger.warn({ event: 'local_evals_workbench_apply_response_failed', stage: 'repair-apply', outcome: 'uncertain',
    reason: 'response-write-failed', reference }); } catch { /* The diagnostic sink is noncritical. */ }
}

function emitHandler(logger: LocalEvalsWorkbenchLoggerPort, event: ApplyApprovedRepairLogEvent, reference: string): void {
  if (event.event === 'approved_repair_requested') {
    emit(logger, { outcome: 'started', reference }); return;
  }
  if (event.event === 'approved_repair_applied') {
    emit(logger, { outcome: 'applied', reference, changedFileCount: event.changedFileCount }); return;
  }
  if (event.event === 'approved_repair_blocked') {
    emit(logger, { outcome: 'blocked', reason: event.reason, reference, changedFileCount: 0 }); return;
  }
  emit(logger, { outcome: 'uncertain', reason: event.reason, reference, changedFileCount: event.changedFileCount });
}

function emit(logger: LocalEvalsWorkbenchLoggerPort, detail: { outcome: 'started' | 'applied' | 'blocked' | 'uncertain'; reason?: string; reference: string; changedFileCount?: number }): void {
  try { logger[detail.outcome === 'uncertain' ? 'error' : detail.outcome === 'blocked' ? 'warn' : 'info']({
    event: 'local_evals_workbench_apply_event', stage: 'repair-apply', ...detail });
  } catch { /* The diagnostic sink is noncritical. */ }
}

function write(response: Response, status: number, payload: unknown, reference: string): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-sibu-request-reference': reference });
  response.end(JSON.stringify(payload));
}
