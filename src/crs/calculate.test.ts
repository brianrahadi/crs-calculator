import { describe, expect, it } from 'vitest';
import { calculate, CRS_MAX } from './calculate';
import { compareRules } from './compare';
import { toClb } from './language';
import type { LanguageResult, Profile } from './types';
import { defaultProfile } from './types';

const clb = (level: number, lang: 'en' | 'fr' = 'en'): LanguageResult => ({
  test: 'clb',
  clbLanguage: lang,
  scores: { reading: `${level}`, writing: `${level}`, listening: `${level}`, speaking: `${level}` },
});

const profile = (over: Partial<Profile>): Profile => ({ ...defaultProfile(), ...over });

describe('calculate', () => {
  it('scores a single master\'s holder with CLB 9 and 3 years foreign work', () => {
    const r = calculate(profile({ age: 29, education: 'masters', firstLanguage: clb(9), foreignWork: 3 }));
    // 110 age + 135 edu + 124 lang = 369 core, 100 transferability
    expect(r.total).toBe(469);
    expect(r.withSpouse).toBe(false);
  });

  it('scores a married applicant with an accompanying spouse', () => {
    const r = calculate(profile({
      married: true,
      age: 30,
      education: 'bachelors',
      firstLanguage: clb(10),
      canadianWork: 1,
      spouseEducation: 'bachelors',
      spouseHasLanguage: true,
      spouseLanguage: clb(7),
    }));
    // core 95+112+128+35 = 370, spouse 8+12 = 20, transfer 25+13 = 38
    expect(r.total).toBe(428);
    expect(r.withSpouse).toBe(true);
  });

  it('treats a Canadian-citizen spouse as single', () => {
    const r = calculate(profile({ married: true, spouseIsCanadian: true, age: 25 }));
    expect(r.withSpouse).toBe(false);
    expect(r.total).toBe(110);
  });

  it('caps transferability at 100 and additional at 600', () => {
    const r = calculate(profile({
      age: 27, education: 'doctoral', firstLanguage: clb(10), canadianWork: 3, foreignWork: 3,
      tradeCertificate: true, provincialNomination: true, sibling: true, canadianStudy: 'threePlus',
    }));
    const t = r.sections.find((s) => s.id === 'transferability')!;
    const a = r.sections.find((s) => s.id === 'additional')!;
    expect(t.points).toBe(100);
    expect(a.points).toBe(600);
  });

  it('awards 50 French points with NCLC 7 and CLB 5 English', () => {
    const r = calculate(profile({ age: 35, firstLanguage: clb(7, 'fr'), hasSecondLanguage: true, secondLanguage: clb(5) }));
    const french = r.sections.find((s) => s.id === 'additional')!.lines.find((l) => l.label.startsWith('French'))!;
    expect(french.points).toBe(50);
  });

  it('awards 25 French points without English', () => {
    const r = calculate(profile({ age: 35, firstLanguage: clb(8, 'fr') }));
    const french = r.sections.find((s) => s.id === 'additional')!.lines.find((l) => l.label.startsWith('French'))!;
    expect(french.points).toBe(25);
  });
});

describe('labour market integration (from 2026-11-03)', () => {
  const lmi = (r: ReturnType<typeof calculate>) => r.sections.find((s) => s.id === 'lmi')!;
  const base = { age: 29, education: 'masters' as const, firstLanguage: clb(9) };

  it('adds high-wage experience on top of work-length points', () => {
    const r = calculate(profile({ ...base, canadianWork: 5, highWageWork: '2x' }));
    expect(lmi(r).points).toBe(150);
    expect(lmi(r).max).toBe(150);
  });

  it('uses the spouse grid: 70 + 70 = 140', () => {
    const r = calculate(profile({ ...base, married: true, canadianWork: 5, highWageWork: '2x' }));
    expect(lmi(r).points).toBe(140);
    expect(lmi(r).max).toBe(140);
  });

  it('scores 20 / 40 / 70 by high-wage tier', () => {
    const pts = (['1.3x', '1.5x', '2x'] as const).map(
      (t) => lmi(calculate(profile({ ...base, canadianWork: 1, highWageWork: t }))).points,
    );
    expect(pts).toEqual([60, 80, 110]);
  });

  it('ignores high-wage experience without 12 months of Canadian work', () => {
    const r = calculate(profile({ ...base, canadianWork: 0, highWageWork: '2x' }));
    expect(lmi(r).points).toBe(0);
  });

  it('scores a job offer at 50 / 70 / 100 by tier', () => {
    const pts = (['1.3x', '1.5x', '2x'] as const).map((t) => lmi(calculate(profile({ ...base, jobOffer: t }))).points);
    expect(pts).toEqual([50, 70, 100]);
  });

  it('takes the higher of work and job offer, never both', () => {
    // work: 53 + 40 = 93 vs offer 100 → offer
    const a = calculate(profile({ ...base, canadianWork: 2, highWageWork: '1.5x', jobOffer: '2x' }));
    expect(lmi(a).points).toBe(100);
    expect(lmi(a).lines.find((l) => l.label === 'Canadian work experience')!.points).toBe(0);
    // work: 80 + 70 = 150 vs offer 100 → work
    const b = calculate(profile({ ...base, canadianWork: 5, highWageWork: '2x', jobOffer: '2x' }));
    expect(lmi(b).points).toBe(150);
    expect(lmi(b).lines.find((l) => l.label === 'High-wage job offer')!.points).toBe(0);
  });

  it('reports both options and which one counts', () => {
    const a = calculate(profile({ ...base, canadianWork: 2, highWageWork: '1.5x', jobOffer: '2x' }));
    expect(lmi(a).choice).toEqual({ work: 93, offer: 100, counted: 'offer' });
    const tie = calculate(profile({ ...base, canadianWork: 5, highWageWork: '1.3x', jobOffer: '2x' }));
    expect(tie.sections.find((s) => s.id === 'lmi')!.choice).toEqual({ work: 100, offer: 100, counted: 'work' });
    expect(lmi(calculate(profile(base))).choice!.counted).toBeNull();
  });

  it('section maximums add up to CRS_MAX on both grids', () => {
    const max = (r: ReturnType<typeof calculate>) => r.sections.reduce((a, s) => a + s.max, 0);
    expect(max(calculate(profile({})))).toBe(CRS_MAX);
    expect(max(calculate(profile({ married: true })))).toBe(CRS_MAX);
  });

  it('keeps skill transferability on plain Canadian work length', () => {
    const r = calculate(profile({ ...base, foreignWork: 3, canadianWork: 2, jobOffer: '2x' }));
    expect(r.sections.find((s) => s.id === 'transferability')!.points).toBe(100);
  });
});

describe('current vs. new rules', () => {
  const p = profile({ age: 29, education: 'masters', firstLanguage: clb(9), foreignWork: 3, canadianWork: 2, highWageWork: '1.5x', jobOffer: '2x' });

  it('scores the pre-Nov 2026 grid with Canadian work in core and no job offer points', () => {
    const r = calculate(p, 'pre2026');
    // core 110 + 135 + 124 + 53 = 422, transferability 100
    expect(r.total).toBe(522);
    expect(r.sections.map((s) => s.id)).toEqual(['core', 'transferability', 'additional']);
    expect(r.sections[0].max).toBe(500);
    expect(r.sections.reduce((a, s) => a + s.max, 0)).toBe(1200);
  });

  it('aligns every factor across both grids', () => {
    const c = compareRules(p);
    expect([c.before.total, c.after.total]).toEqual([522, 569]);
    const lmi = c.sections.find((s) => s.id === 'lmi')!;
    expect([lmi.before, lmi.after]).toEqual([53, 100]);
    const work = lmi.lines.find((l) => l.label === 'Canadian work experience')!;
    expect([work.before, work.after, work.isNew]).toEqual([53, 0, false]);
    expect(lmi.lines.find((l) => l.label === 'High-wage job offer')!.isNew).toBe(true);
    expect(c.sections.reduce((a, s) => a + s.before, 0)).toBe(522);
    expect(c.sections.reduce((a, s) => a + s.after, 0)).toBe(569);
  });

  it('shows no change without Canadian work or a job offer', () => {
    const c = compareRules(profile({ age: 29, education: 'masters', firstLanguage: clb(9), foreignWork: 3 }));
    expect(c.before.total).toBe(c.after.total);
  });
});

describe('line hints', () => {
  const hint = (r: ReturnType<typeof calculate>, label: string) =>
    r.sections.flatMap((s) => s.lines).find((l) => l.label === label)!.hint;

  it('explains what each line is based on', () => {
    const r = calculate(profile({ age: 29, education: 'masters', firstLanguage: clb(9), foreignWork: 3, canadianWork: 2 }));
    expect(hint(r, 'Age')).toBe('29 years old — ages 20–29 earn the maximum');
    expect(hint(r, 'Level of education')).toBe("Master's / professional degree");
    expect(hint(r, 'First official language')).toBe('CLB 9 in all 4 abilities');
    expect(hint(r, 'Canadian work experience')).toBe('2 years of skilled work in Canada');
    expect(hint(r, 'Education + language / Canadian work')).toBe(
      "Master's / professional degree: CLB 9+ → 50, 2+ yrs Canadian work → 50 · capped at 50",
    );
    expect(hint(r, 'Second official language')).toBe('No second-language test');
  });

  it('shows per-ability levels when they differ', () => {
    const r = calculate(profile({
      age: 35,
      firstLanguage: { test: 'ielts', clbLanguage: 'en', scores: { listening: '8', reading: '6', writing: '6.5', speaking: '7' } },
    }));
    expect(hint(r, 'First official language')).toBe('IELTS · CLB L9 R7 W8 S9');
  });
});

describe('toClb', () => {
  it('converts IELTS bands', () => {
    expect(toClb('ielts', 'listening', '8')).toBe(9);
    expect(toClb('ielts', 'reading', '7')).toBe(9);
    expect(toClb('ielts', 'writing', '7.5')).toBe(10);
    expect(toClb('ielts', 'speaking', '6')).toBe(7);
    expect(toClb('ielts', 'listening', '4')).toBe(0);
  });
  it('converts CELPIP levels', () => {
    expect(toClb('celpip', 'reading', '12')).toBe(10);
    expect(toClb('celpip', 'reading', '3')).toBe(0);
  });
  it('converts TCF writing out of 20', () => {
    expect(toClb('tcf', 'writing', '14')).toBe(9);
    expect(toClb('tcf', 'reading', '500')).toBe(8);
  });
});
