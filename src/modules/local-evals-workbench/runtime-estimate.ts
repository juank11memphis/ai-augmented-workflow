export type ConsumptionEstimate = {
  readonly targetCalls: number;
  readonly judgeCalls: number;
  readonly totalCalls: number;
  readonly cost: { readonly status: 'available'; readonly amount: number; readonly currency: string }
    | { readonly status: 'unavailable'; readonly reason: string };
};
