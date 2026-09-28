import type { LanguageResult, LanguageTest, Skill, TestLanguage } from './types';
import { SKILLS } from './types';

/**
 * Minimum score needed for each CLB/NCLC level, per skill, highest level first.
 * Source: IRCC "Language test equivalency charts" (CLB 4–10).
 */
type Thresholds = Record<Skill, number[]>; // index 0 = CLB 10, index 6 = CLB 4

interface TestInfo {
  id: LanguageTest;
  name: string;
  short: string;
  language: TestLanguage;
  step: number;
  min: number;
  max: number;
  /** Per-skill score range labels shown as input hints. */
  placeholder: string;
  thresholds?: Thresholds;
}

const IELTS: Thresholds = {
  reading: [8, 7, 6.5, 6, 5, 4, 3.5],
  writing: [7.5, 7, 6.5, 6, 5.5, 5, 4],
  listening: [8.5, 8, 7.5, 6, 5.5, 5, 4.5],
  speaking: [7.5, 7, 6.5, 6, 5.5, 5, 4],
};

const PTE: Thresholds = {
  reading: [88, 78, 69, 60, 51, 42, 33],
  writing: [90, 88, 79, 69, 60, 51, 41],
  listening: [89, 82, 71, 60, 50, 39, 28],
  speaking: [89, 84, 76, 68, 59, 51, 42],
};

const TEF: Thresholds = {
  reading: [546, 503, 462, 434, 393, 352, 306],
  writing: [558, 512, 472, 428, 379, 330, 268],
  listening: [546, 503, 462, 434, 393, 352, 306],
  speaking: [556, 518, 494, 456, 422, 387, 328],
};

const TCF: Thresholds = {
  reading: [549, 524, 499, 453, 406, 375, 342],
  writing: [16, 14, 12, 10, 7, 6, 4],
  listening: [549, 523, 503, 458, 398, 369, 331],
  speaking: [16, 14, 12, 10, 7, 6, 4],
};

export const TESTS: TestInfo[] = [
  { id: 'ielts', name: 'IELTS General Training', short: 'IELTS', language: 'en', step: 0.5, min: 0, max: 9, placeholder: '0–9', thresholds: IELTS },
  { id: 'celpip', name: 'CELPIP-General', short: 'CELPIP', language: 'en', step: 1, min: 0, max: 12, placeholder: '1–12' },
  { id: 'pte', name: 'PTE Core', short: 'PTE Core', language: 'en', step: 1, min: 10, max: 90, placeholder: '10–90', thresholds: PTE },
  { id: 'tef', name: 'TEF Canada', short: 'TEF', language: 'fr', step: 1, min: 0, max: 699, placeholder: '0–699', thresholds: TEF },
  { id: 'tcf', name: 'TCF Canada', short: 'TCF', language: 'fr', step: 1, min: 0, max: 699, placeholder: 'see hint', thresholds: TCF },
  { id: 'clb', name: 'I already know my CLB / NCLC levels', short: 'CLB', language: 'en', step: 1, min: 0, max: 12, placeholder: '4–10' },
];

export const testInfo = (id: LanguageTest) => TESTS.find((t) => t.id === id)!;

/** TCF writing/speaking are scored out of 20; everything else uses the test-wide range. */
export function skillRange(test: LanguageTest, skill: Skill) {
  const info = testInfo(test);
  if (test === 'tcf' && (skill === 'writing' || skill === 'speaking')) {
    return { min: 0, max: 20, step: 1, placeholder: '0–20' };
  }
  if (test === 'tcf') return { min: 0, max: 699, step: 1, placeholder: '0–699' };
  return { min: info.min, max: info.max, step: info.step, placeholder: info.placeholder };
}

/** Convert one raw score to a CLB level (0 means below CLB 4, or no score). */
export function toClb(test: LanguageTest | null, skill: Skill, raw: string): number {
  if (!test || raw.trim() === '') return 0;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  if (test === 'celpip' || test === 'clb') {
    const level = Math.floor(value);
    return level < 4 ? 0 : Math.min(level, 10);
  }
  const thresholds = testInfo(test).thresholds![skill];
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) return 10 - i;
  }
  return 0;
}

export function clbLevels(result: LanguageResult): Record<Skill, number> {
  return Object.fromEntries(
    SKILLS.map((s) => [s, toClb(result.test, s, result.scores[s])]),
  ) as Record<Skill, number>;
}

export function isComplete(result: LanguageResult) {
  return !!result.test && SKILLS.every((s) => result.scores[s].trim() !== '');
}

export function languageOf(result: LanguageResult): TestLanguage | null {
  if (!result.test) return null;
  return result.test === 'clb' ? result.clbLanguage : testInfo(result.test).language;
}
