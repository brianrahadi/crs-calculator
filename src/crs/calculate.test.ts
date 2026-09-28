import { describe, expect, it } from 'vitest';
import { calculate } from './calculate';
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
