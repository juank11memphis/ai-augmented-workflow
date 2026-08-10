export type StartLocalEvalsWorkbenchResult =
  | LocalEvalsWorkbenchStartedResult
  | LocalEvalsWorkbenchBlockedResult
  | LocalEvalsWorkbenchStartFailedResult;

export type LocalEvalsWorkbenchStartedResult = {
  readonly status: 'started';
  readonly url: string;
  readonly host: LocalWorkbenchHost;
  readonly port: number;
  readonly guidance: string;
};

export type LocalEvalsWorkbenchBlockedResult = {
  readonly status: 'blocked';
  readonly reason: LocalEvalsWorkbenchBlockReason;
  readonly message: string;
  readonly guidance: readonly string[];
};

export type LocalEvalsWorkbenchStartFailedResult = {
  readonly status: 'failed';
  readonly reason: 'server-start-failed';
  readonly message: string;
  readonly guidance: readonly string[];
};

export type LocalWorkbenchHost = '127.0.0.1' | 'localhost';

export type LocalEvalsWorkbenchBlockReason = 'missing-workflow-state' | 'invalid-workflow-state';
