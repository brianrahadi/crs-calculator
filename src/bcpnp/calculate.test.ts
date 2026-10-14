import { describe, expect, it } from 'vitest';
import type { LanguageResult } from '../crs/types';
import { defaultProfile } from '../crs/types';
import { calculateBc, clbPoints, experiencePoints, wagePoints } from './calculate';
import { languageFromCrs, sanitizeBc } from './storage';
import { bcSuggestions } from './suggestions';
import type { BcProfile } from './types';
import { defaultBcProfile } from './types';

const clb = (level: number, lang: 'en' | 'fr' = 'en'): LanguageResult => ({
  test: 'clb',
  clbLanguage: lang,
  scores: { reading: `${level}`, writing: `${level}`, listening: `${level}`, speaking: `${level}` },
});
const profile = (over: Partial<BcProfile>): BcProfile => ({ ...defaultBcProfile(), ...over });
const section = (p: BcProfile, id: string) => calculateBc(p).sections.find((s) => s.id === id)!.points;

describe('BC PNP factor tables', () => {
  it('scores wage at a point per dollar from $16, capped at $70', () => {
    expect(wagePoints(null)).toBe(0);
    expect(wagePoints(15.99)).toBe(0);
    expect(wagePoints(16)).toBe(1);
    expect(wagePoints(52.75)).toBe(37);
    expect(wagePoints(69.99)).toBe(54);
    expect(wagePoints(70)).toBe(55);
    expect(wagePoints(140)).toBe(55);
  });

  it('scores language by the lowest CLB', () => {
    expect([3, 4, 5, 6, 7, 8, 9, 10].map(clbPoints)).toEqual([0, 5, 10, 15, 20, 25, 30, 30]);
  });

  it('scores experience bands', () => {
    expect([null, 0, 0.5, 1, 2, 3, 4, 5].map(experiencePoints)).toEqual([0, 0, 1, 4, 8, 12, 16, 20]);
  });
});

describe('calculateBc', () => {
  it('scores an empty profile as 0', () => {
    expect(calculateBc(defaultBcProfile()).total).toBe(0);
  });

  it('reaches the 200-point maximum', () => {
    const r = calculateBc(profile({
      hourlyWage: 70,
      area: 3,
      regionalExperience: true,
      regionalAlumni: true,
      experience: 5,
      canadianExperience: true,
      workingForEmployer: true,
      education: 'doctoral',
      educationLocation: 'bc',
      designation: true,
      english: clb(9),
      french: clb(4, 'fr'),
    }));
    expect(r.total).toBe(200);
    expect(r.human).toBe(120);
    expect(r.economic).toBe(80);
  });

  it('scores a typical Metro Vancouver tech worker', () => {
    const r = calculateBc(profile({
      hourlyWage: 48,
      area: 1,
      experience: 3,
      canadianExperience: true,
      workingForEmployer: true,
      education: 'bachelors',
      english: { test: 'celpip', clbLanguage: 'en', scores: { reading: '9', writing: '9', listening: '10', speaking: '9' } },
    }));
    // experience 12+10+10, education 15, language 30, wage 33, area 0
    expect(r.total).toBe(110);
  });

  it('uses the lowest IELTS band after conversion', () => {
    const ielts = (speaking: string): LanguageResult => ({ test: 'ielts', clbLanguage: 'en', scores: { listening: '8', reading: '7', writing: '7', speaking } });
    expect(section(profile({ english: ielts('7') }), 'language')).toBe(30);
    expect(section(profile({ english: ielts('6.5') }), 'language')).toBe(25);
  });

  it('ignores an incomplete test', () => {
    const partial: LanguageResult = { test: 'celpip', clbLanguage: 'en', scores: { reading: '9', writing: '9', listening: '9', speaking: '' } };
    expect(section(profile({ english: partial }), 'language')).toBe(0);
  });

  it('counts the stronger language plus the bilingual bonus', () => {
    expect(section(profile({ english: clb(5), french: clb(7, 'fr') }), 'language')).toBe(30);
    expect(section(profile({ english: clb(9), french: clb(3, 'fr') }), 'language')).toBe(30);
  });

  it('gives the education location bonus only for post-secondary credentials', () => {
    expect(section(profile({ education: 'masters', educationLocation: 'bc' }), 'education')).toBe(30);
    expect(section(profile({ education: 'diploma', educationLocation: 'canada' }), 'education')).toBe(11);
    expect(section(profile({ education: 'secondary', educationLocation: 'bc' }), 'education')).toBe(0);
  });

  it('caps the regional bonus at 10 and the area factor at 25', () => {
    expect(section(profile({ area: 1, regionalExperience: true, regionalAlumni: true }), 'area')).toBe(10);
    expect(section(profile({ area: 2, regionalAlumni: true }), 'area')).toBe(15);
    expect(section(profile({ area: 3, regionalExperience: true }), 'area')).toBe(25);
  });
});

describe('bcSuggestions', () => {
  it('ranks what-ifs by gain and only lists ones that help', () => {
    const p = profile({ hourlyWage: 40, area: 1, experience: 2, education: 'bachelors', english: clb(7) });
    const tips = bcSuggestions(p);
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.every((t) => t.gain > 0)).toBe(true);
    expect(tips.map((t) => t.gain)).toEqual([...tips.map((t) => t.gain)].sort((a, b) => b - a));
    expect(tips[0].gain).toBe(15); // moving to Area 3
  });

  it('suggests the bilingual bonus once one language is in place', () => {
    const tips = bcSuggestions(profile({ english: clb(9) }));
    expect(tips.find((t) => t.title.includes('French'))?.gain).toBe(10);
  });

  it('has nothing to suggest at the maximum', () => {
    const max = profile({
      hourlyWage: 80, area: 3, regionalExperience: true, experience: 5, canadianExperience: true, workingForEmployer: true,
      education: 'doctoral', educationLocation: 'bc', designation: true, english: clb(10), french: clb(5, 'fr'), sector: 'health',
    });
    expect(bcSuggestions(max)).toEqual([]);
  });
});

describe('storage', () => {
  it('sanitizes untrusted input', () => {
    const p = sanitizeBc({ hourlyWage: 'lots', area: 7, experience: 2, sector: 'health', english: { test: 'tef', scores: {} }, french: { test: 'tef', scores: { reading: '400' } } });
    expect(p.hourlyWage).toBeNull();
    expect(p.area).toBeNull();
    expect(p.experience).toBe(2);
    expect(p.sector).toBe('health');
    expect(p.english.test).toBeNull(); // TEF isn't an English test
    expect(p.french.test).toBe('tef');
    expect(p.french.scores.reading).toBe('400');
  });

  it('borrows complete language results from a CRS profile', () => {
    const { english, french } = languageFromCrs({
      ...defaultProfile(),
      firstLanguage: clb(9),
      hasSecondLanguage: true,
      secondLanguage: { test: 'tef', clbLanguage: 'en', scores: { reading: '400', writing: '400', listening: '400', speaking: '' } },
    });
    expect(english?.scores.reading).toBe('9');
    expect(french).toBeNull(); // incomplete
  });
});
