export type ResolveModelRouteCommand = Readonly<{
  type: 'models:resolve';
  agentEnvironment: string;
  role: string;
  workloadClass: string;
}>;
