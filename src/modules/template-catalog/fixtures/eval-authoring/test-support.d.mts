import type { TestContext } from 'node:test';
import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../../../local-evals-workbench/index.js';
export type Event = { protocolVersion: number; requestId: string; sequence: number; type: string; runId: string | null; caseId: string | null; attempt: number | null; data: Record<string, unknown> };
type Command = { protocolVersion: number; requestId: string; operation: string; runId?: string; model?: string; judgeModel?: string | null; testCases?: readonly NormalizedEvalTestCase[] };
type FixturePorts = { createTarget: unknown; judge: unknown; custom: unknown };
type TestPorts = { counts: { target: number; model: number; judge: number; production: number }; observations: { models: string[]; judges: string[]; historyLengths: number[] }; ports: FixturePorts };
export const fixtureRoot: string;
export function fixtureModules(): Promise<{
  handleRequest(command: unknown, ports: FixturePorts, options?: { evalMode: string }): Promise<{ status: string; events: Event[] }>;
  safeEvidence(value: unknown): unknown;
  createTestPorts(options?: { score?: number; bypassMocks?: boolean; unsafeOutput?: boolean }): TestPorts;
}>;
export function suite(): Promise<NormalizedEvalSuite>;
export function command(testCases: readonly NormalizedEvalTestCase[], operation?: string): Command;
export function project(t: TestContext): Promise<string>;
export function invoke(root: string, request: unknown, evalMode?: string): Promise<{ code: number | null; events: Event[]; stdout: string; stderr: string }>;
