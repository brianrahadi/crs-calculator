import { describe, expect, it } from 'vitest';
import snapshot from '../../public/data/draws.json';
import { candidatesAbove, categorize, summarize } from './aggregator';
import type { Draw } from './aggregator';

describe('categorize', () => {
  it('maps IRCC round names to categories', () => {
    expect(categorize('Canadian Experience Class')).toBe('cec');
    expect(categorize('French-Language proficiency 2026-Version 2')).toBe('french');
    expect(categorize('Healthcare and Social Services Occupations, 2026-Version 3')).toBe('healthcare');
    expect(categorize('Physicians with Canadian Work Experience, 2026-Version 1')).toBe('physicians');
    expect(categorize('Trade occupations (Version 2)')).toBe('trades');
    expect(categorize('No Program Specified')).toBe('general');
  });

  it('leaves no snapshot round uncategorized', () => {
    const names = new Set((snapshot.rounds as Record<string, string>[]).map((r) => r.drawName));
    const unknown = [...names].filter((n) => categorize(n) === 'other');
    expect(unknown).toEqual([]);
  });
});

describe('candidatesAbove', () => {
  const draw = {
    distribution: [
      { label: '501–600', from: 501, to: 600, count: 100 },
      { label: '491–500', from: 491, to: 500, count: 10 },
      { label: '0–490', from: 0, to: 490, count: 1000 },
    ],
  } as Draw;
  it('counts higher buckets plus the share of the current bucket above the score', () => {
    expect(candidatesAbove(draw, 600)).toBe(0);
    expect(candidatesAbove(draw, 500)).toBe(100);
    expect(candidatesAbove(draw, 495)).toBe(105);
    expect(candidatesAbove(draw, 490)).toBe(110);
  });
});

describe('summarize', () => {
  it('puts the newest draw first per category', () => {
    const draws = [
      { category: 'cec', date: '2026-09-15', crs: 519 },
      { category: 'cec', date: '2026-09-01', crs: 521 },
    ] as Draw[];
    const [cec] = summarize(draws);
    expect(cec.latest.crs).toBe(519);
  });
});
