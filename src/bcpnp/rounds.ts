/**
 * BC PNP Skills Immigration invitation rounds and registration pool.
 *
 * WelcomeBC publishes these as an HTML page only (no CORS-friendly feed like IRCC's), so this is a
 * hand-maintained snapshot. After each round: add it to the top of SCORE_ROUNDS (and HIGH_WAGE_DRAWS
 * for wage-based rounds), refresh POOL from the same page, and bump CHECKED_AT.
 */
import type { BcProfile, BcSector } from './types';

export const BCPNP_INVITATIONS_PAGE =
  'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply';

/** When the snapshot below was last checked against WelcomeBC (YYYY-MM-DD). */
export const CHECKED_AT = '2026-10-13';

export type BcCategory = 'hei' | 'childcare' | 'health' | 'veterinary' | 'education' | 'construction' | 'ruralHealth';

export const BC_CATEGORIES: Record<BcCategory, { label: string; hint: string }> = {
  hei: { label: 'Innovate: High economic impact', hint: 'Points-based. Open to job offers in NOC TEER 0–3 occupations.' },
  childcare: { label: 'Care: Childcare', hint: 'Early childhood educators (NOC 42202) only.' },
  health: { label: 'Care: Health', hint: 'Job offers in priority health care occupations.' },
  veterinary: { label: 'Care: Veterinary care', hint: 'Priority veterinary occupations, incl. vet technicians with a valid designation.' },
  education: { label: 'Care: Education', hint: 'Job offers in priority education occupations.' },
  construction: { label: 'Build: Construction trades', hint: 'Priority construction occupations, incl. SkilledTradesBC apprentices.' },
  ruralHealth: { label: 'Rural/remote health support', hint: 'Temporary initiative for health workers in rural and remote communities.' },
};

export interface ScoreRound {
  date: string; // YYYY-MM-DD
  category: BcCategory;
  minScore: number;
  /** null when WelcomeBC reports "<5". */
  invitations: number | null;
}

/** Score-based rounds, newest first. */
export const SCORE_ROUNDS: ScoreRound[] = [
  { date: '2026-10-08', category: 'childcare', minScore: 99, invitations: 86 },
  { date: '2026-10-08', category: 'health', minScore: 76, invitations: 82 },
  { date: '2026-10-08', category: 'veterinary', minScore: 86, invitations: null },
  { date: '2026-10-08', category: 'construction', minScore: 94, invitations: 115 },
  { date: '2026-09-24', category: 'hei', minScore: 131, invitations: 288 },
  { date: '2026-09-17', category: 'ruralHealth', minScore: 60, invitations: 33 },
  { date: '2026-09-10', category: 'childcare', minScore: 99, invitations: 182 },
  { date: '2026-09-10', category: 'health', minScore: 76, invitations: 143 },
  { date: '2026-09-10', category: 'veterinary', minScore: 90, invitations: null },
  { date: '2026-09-10', category: 'construction', minScore: 94, invitations: 104 },
  { date: '2026-08-20', category: 'hei', minScore: 132, invitations: 265 },
  { date: '2026-08-06', category: 'childcare', minScore: 102, invitations: 183 },
  { date: '2026-08-06', category: 'health', minScore: 84, invitations: 124 },
  { date: '2026-08-06', category: 'education', minScore: 68, invitations: null },
  { date: '2026-08-06', category: 'veterinary', minScore: 72, invitations: 6 },
  { date: '2026-08-06', category: 'construction', minScore: 88, invitations: 187 },
  { date: '2026-07-23', category: 'ruralHealth', minScore: 50, invitations: 60 },
  { date: '2026-07-16', category: 'hei', minScore: 132, invitations: 346 },
  { date: '2026-07-09', category: 'childcare', minScore: 108, invitations: 91 },
  { date: '2026-07-09', category: 'health', minScore: 96, invitations: 116 },
  { date: '2026-07-09', category: 'veterinary', minScore: 88, invitations: null },
  { date: '2026-07-09', category: 'construction', minScore: 97, invitations: 136 },
  { date: '2026-06-18', category: 'hei', minScore: 136, invitations: 149 },
  { date: '2026-06-02', category: 'childcare', minScore: 111, invitations: 91 },
  { date: '2026-06-02', category: 'health', minScore: 100, invitations: 117 },
  { date: '2026-06-02', category: 'veterinary', minScore: 92, invitations: 6 },
  { date: '2026-06-02', category: 'construction', minScore: 101, invitations: 128 },
  { date: '2026-05-14', category: 'hei', minScore: 135, invitations: 212 },
  { date: '2026-05-06', category: 'childcare', minScore: 115, invitations: 86 },
  { date: '2026-05-06', category: 'health', minScore: 108, invitations: 117 },
  { date: '2026-05-06', category: 'veterinary', minScore: 100, invitations: 9 },
  { date: '2026-05-06', category: 'construction', minScore: 108, invitations: 121 },
  { date: '2026-04-22', category: 'hei', minScore: 138, invitations: 232 },
  { date: '2026-02-11', category: 'hei', minScore: 135, invitations: 265 },
  { date: '2026-02-04', category: 'hei', minScore: 138, invitations: 223 },
];

/**
 * "Innovate: High economic impact" wage-based rounds. These have no minimum score: candidates need a
 * job offer in a NOC TEER 0–3 occupation paying at least the hourly wage and annual salary shown.
 */
export interface HighWageDraw {
  date: string; // YYYY-MM-DD
  minHourly: number; // CAD per hour
  minSalary: number; // CAD per year
  invitations: number; // wage-based invitations only
}

export const HIGH_WAGE_DRAWS: HighWageDraw[] = [
  { date: '2026-09-24', minHourly: 52, minSalary: 105_000, invitations: 426 },
  { date: '2026-08-20', minHourly: 55, minSalary: 110_000, invitations: 337 },
  { date: '2026-07-16', minHourly: 58, minSalary: 115_000, invitations: 223 },
  { date: '2026-06-18', minHourly: 62, minSalary: 125_000, invitations: 130 },
  { date: '2026-05-14', minHourly: 59, minSalary: 120_000, invitations: 225 },
  { date: '2026-04-22', minHourly: 62, minSalary: 125_000, invitations: 252 },
  { date: '2026-02-11', minHourly: 62, minSalary: 125_000, invitations: 195 },
  { date: '2026-02-04', minHourly: 70, minSalary: 145_000, invitations: 206 },
];

/** Skills Immigration registration pool by score band. */
export const POOL = {
  asOf: '2026-10-06',
  bands: [
    { from: 150, to: 200, count: 9 },
    { from: 140, to: 149, count: 23 },
    { from: 130, to: 139, count: 171 },
    { from: 120, to: 129, count: 854 },
    { from: 110, to: 119, count: 1189 },
    { from: 100, to: 109, count: 1426 },
    { from: 90, to: 99, count: 1444 },
    { from: 80, to: 89, count: 1281 },
    { from: 70, to: 79, count: 718 },
    { from: 60, to: 69, count: 364 },
    { from: 0, to: 59, count: 216 },
  ],
};
export const POOL_TOTAL = POOL.bands.reduce((n, b) => n + b.count, 0);

/** Registrations scoring above `score`, interpolating linearly within its band. */
export function registrationsAbove(score: number) {
  let above = 0;
  for (const b of POOL.bands) {
    if (score < b.from) above += b.count;
    else if (score <= b.to) above += Math.round((b.count * (b.to - score)) / (b.to - b.from + 1));
  }
  return above;
}

export interface CategorySummary {
  category: BcCategory;
  latest: ScoreRound;
  rounds: ScoreRound[];
  low: number;
  high: number;
}

/** Latest round and cutoff range for each category, most recently drawn first. */
export function summaries(rounds = SCORE_ROUNDS): CategorySummary[] {
  const by = new Map<BcCategory, ScoreRound[]>();
  for (const r of rounds) by.set(r.category, [...(by.get(r.category) ?? []), r]);
  return [...by.entries()].map(([category, list]) => ({
    category,
    latest: list[0],
    rounds: list,
    low: Math.min(...list.map((r) => r.minScore)),
    high: Math.max(...list.map((r) => r.minScore)),
  }));
}

export type BcStatus = 'eligible' | 'check' | 'ineligible';

const SECTOR_CATEGORY: Partial<Record<BcSector, BcCategory>> = {
  health: 'health',
  childcare: 'childcare',
  veterinary: 'veterinary',
  education: 'education',
  construction: 'construction',
};

/** Whether this profile's job offer can be picked in a category's rounds. */
export function categoryStatus(category: BcCategory, p: BcProfile): BcStatus {
  if (category === 'hei') return p.skilledOffer ? 'eligible' : 'ineligible';
  if (category === 'ruralHealth') return p.sector === 'health' && p.area !== 1 ? 'check' : 'ineligible';
  return SECTOR_CATEGORY[p.sector] === category ? 'eligible' : 'ineligible';
}

/** Annual salary at full-time hours, to compare with the wage rounds' salary floor. */
export const annualSalary = (hourly: number, hoursPerWeek = 40) => Math.round(hourly * hoursPerWeek * 52);
