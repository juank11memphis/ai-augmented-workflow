export type SetModelRouteCommand = Readonly<{
  type: 'models:set';
  agentEnvironment: string;
  role: string;
  workloadClass: string;
  model: string;
  reasoningEffort: string;
  catalogVersion: string;
  stateBasis: string;
}>;
