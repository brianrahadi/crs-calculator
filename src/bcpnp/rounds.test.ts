import { describe, expect, it } from 'vitest';
import { categoryStatus, HIGH_WAGE_DRAWS, POOL, POOL_TOTAL, registrationsAbove, SCORE_ROUNDS, summaries } from './rounds';
import { defaultBcProfile } from './types';

const sortedNewestFirst = (dates: string[]) => expect([...dates].sort().reverse()).toEqual(dates);

describe('BC PNP rounds snapshot', () => {
  it('lists wage rounds newest first with unique dates', () => {
    const dates = HIGH_WAGE_DRAWS.map((d) => d.date);
    sortedNewestFirst(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('lists score rounds newest first, one per category per day', () => {
    sortedNewestFirst(SCORE_ROUNDS.map((r) => r.date));
    const keys = SCORE_ROUNDS.map((r) => `${r.date}:${r.category}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('summarises each category from its newest round', () => {
    const hei = summaries().find((s) => s.category === 'hei')!;
    expect(hei.latest).toEqual(SCORE_ROUNDS.find((r) => r.category === 'hei'));
    expect(hei.low).toBeLessThanOrEqual(hei.latest.minScore);
    expect(hei.high).toBeGreaterThanOrEqual(hei.latest.minScore);
  });
});

describe('registration pool', () => {
  it('has contiguous bands', () => {
    for (let i = 1; i < POOL.bands.length; i++) expect(POOL.bands[i].to).toBe(POOL.bands[i - 1].from - 1);
    expect(POOL.bands.at(-1)!.from).toBe(0);
  });

  it('counts registrations above a score', () => {
    expect(registrationsAbove(200)).toBe(0);
    expect(registrationsAbove(-1)).toBe(POOL_TOTAL);
    expect(registrationsAbove(139)).toBe(9 + 23); // top of the 130–139 band
    expect(registrationsAbove(130)).toBe(9 + 23 + Math.round((171 * 9) / 10));
  });
});

describe('categoryStatus', () => {
  it('opens points-based high-impact rounds to TEER 0–3 offers', () => {
    expect(categoryStatus('hei', defaultBcProfile())).toBe('eligible');
    expect(categoryStatus('hei', { ...defaultBcProfile(), skilledOffer: false })).toBe('ineligible');
  });

  it('matches sector rounds to the job offer', () => {
    const nurse = { ...defaultBcProfile(), sector: 'health' as const, area: 3 as const };
    expect(categoryStatus('health', nurse)).toBe('eligible');
    expect(categoryStatus('childcare', nurse)).toBe('ineligible');
    expect(categoryStatus('ruralHealth', nurse)).toBe('check');
    expect(categoryStatus('ruralHealth', { ...nurse, area: 1 })).toBe('ineligible');
  });
});
