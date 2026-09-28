import { minLevelIn } from '../crs/calculate';
import type { Profile } from '../crs/types';
import type { CategoryId, CategorySummary, Draw } from './aggregator';

export type Status = 'eligible' | 'occupation' | 'ineligible';
const RANK: Record<Status, number> = { eligible: 0, occupation: 1, ineligible: 2 };
const PRIORITY: CategoryId[] = ['general', 'cec', 'french', 'fsw', 'fst', 'healthcare', 'stem', 'trades', 'education', 'transport', 'agriculture', 'senior', 'physicians', 'military'];

/** What we can tell from the profile; occupation-based categories can't be checked here. */
export function eligibility(category: CategoryId, p: Profile): Status {
  if (category === 'general' || category === 'fsw') return 'eligible';
  if (category === 'cec') return p.canadianWork >= 1 ? 'eligible' : 'ineligible';
  if (category === 'french') return minLevelIn(p, 'fr') >= 7 ? 'eligible' : 'ineligible';
  if (category === 'pnp') return p.provincialNomination ? 'eligible' : 'ineligible';
  if (category === 'senior' || category === 'physicians') return p.canadianWork >= 1 ? 'occupation' : 'ineligible';
  return 'occupation';
}

/** Recently active draw types, the ones the candidate can enter first. */
export function rankSummaries(summaries: CategorySummary[], p: Profile) {
  return summaries
    .filter((s) => s.count12 > 0 && s.category !== 'pnp')
    .map((s) => ({ s, status: eligibility(s.category, p) }))
    .sort((a, b) => RANK[a.status] - RANK[b.status] || PRIORITY.indexOf(a.s.category) - PRIORITY.indexOf(b.s.category));
}

/** The most relevant recent cutoff to benchmark a profile against. */
export function benchmarkDraw(summaries: CategorySummary[], p: Profile): Draw | undefined {
  const recent = summaries.filter((s) => s.count12 > 0);
  const wanted: CategoryId[] = p.canadianWork >= 1 ? ['cec', 'general'] : ['general', 'cec'];
  for (const cat of wanted) {
    const s = recent.find((x) => x.category === cat);
    if (s) return s.latest;
  }
  return recent.find((s) => s.category !== 'pnp')?.latest;
}
