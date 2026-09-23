import { isCancel, select } from '@clack/prompts';
import type { ModelRouteReviewNotice } from './model-route-review-result.js';

export type ModelRouteReviewChoice = 'retain' | 'replace' | 'later';

const ROLE_LABELS: Record<string, string> = {
  'implementation-planner': 'Implementation planner',
  'implementation-executor': 'Implementation executor',
  'architecture-reviewer': 'Architecture reviewer',
  'technical-lead-reviewer': 'Technical lead reviewer',
  'github-exporter': 'GitHub exporter',
  'notion-exporter': 'Notion exporter',
};

export function formatModelRouteReview(notice: ModelRouteReviewNotice): string {
  const { route, recommendation, reasons } = notice;
  return ['Model recommendation update', '', `${ROLE_LABELS[route.role]} · ${route.workloadClass}`,
    `Saved: ${route.model} / ${route.reasoningEffort}`,
    `New recommendation: ${recommendation.model} / ${recommendation.reasoningEffort}`,
    '', `Why: ${reasons.join(' ')}`].join('\n');
}

export async function askForModelRouteReview(_notice: ModelRouteReviewNotice): Promise<ModelRouteReviewChoice> {
  const choice = await select<ModelRouteReviewChoice>({ message: 'What would you like to do?', options: [
    { value: 'retain', label: 'Keep saved route' },
    { value: 'replace', label: 'Use new recommendation' },
    { value: 'later', label: 'Review later' },
  ] });
  return isCancel(choice) ? 'later' : choice;
}
