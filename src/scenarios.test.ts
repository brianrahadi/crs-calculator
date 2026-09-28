import { describe, expect, it } from 'vitest';
import { calculate } from './crs/calculate';
import { defaultProfile } from './crs/types';
import { decodeProfile, encodeProfile, sanitize } from './scenarios';

describe('share links', () => {
  it('round-trips a profile and its name', () => {
    const p = {
      ...defaultProfile(),
      age: 31,
      education: 'masters' as const,
      canadianWork: 2,
      firstLanguage: { test: 'ielts' as const, clbLanguage: 'en' as const, scores: { reading: '7', writing: '7', listening: '8', speaking: '7.5' } },
    };
    const code = encodeProfile(p, 'Après retest');
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const decoded = decodeProfile(code)!;
    expect(decoded.name).toBe('Après retest');
    expect(decoded.profile).toEqual(p);
    expect(calculate(decoded.profile).total).toBe(calculate(p).total);
  });

  it('keeps links short by omitting defaults', () => {
    expect(encodeProfile({ ...defaultProfile(), age: 29 }).length).toBeLessThan(20);
  });

  it('rejects garbage', () => {
    expect(decodeProfile('%%%')).toBeNull();
    expect(decodeProfile(btoa('"just a string"'))).toBeNull();
  });
});

describe('sanitize', () => {
  it('drops malformed and unknown fields', () => {
    const p = sanitize({
      age: 'thirty',
      education: '<img onerror=alert(1)>',
      canadianWork: 99,
      provincialNomination: 'yes',
      extra: 1,
      firstLanguage: { test: 'hack', scores: { reading: '<b>' } },
    });
    expect(p.age).toBeNull();
    expect(p.education).toBeNull();
    expect(p.canadianWork).toBe(5);
    expect(p.provincialNomination).toBe(false);
    expect(p.firstLanguage.test).toBeNull();
    expect(p.firstLanguage.scores.reading).toBe('');
    expect('extra' in p).toBe(false);
  });
});
