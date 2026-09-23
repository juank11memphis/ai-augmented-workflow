import type { RouteKey } from '../model-route-contract.js';

export type ResetModelRoutesCommand = Readonly<{
  type: 'models:reset';
  scope: 'one' | 'all';
  key?: RouteKey;
  confirmed: boolean;
  catalogVersion: string;
  stateBasis: string;
}>;
