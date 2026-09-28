import { clbLevels, languageOf } from './language';
import type { CrsResult, Education, Line, Profile, Section, Skill } from './types';
import { SKILLS } from './types';

/*
 * Comprehensive Ranking System criteria, per IRCC's published grid.
 * Tuples are [with accompanying spouse, without spouse].
 * Arranged-employment points were removed from the CRS on 2025-03-25.
 */

type Pair = [number, number];

const AGE: Record<number, Pair> = {
  18: [90, 99], 19: [95, 105],
  20: [100, 110], 21: [100, 110], 22: [100, 110], 23: [100, 110], 24: [100, 110],
  25: [100, 110], 26: [100, 110], 27: [100, 110], 28: [100, 110], 29: [100, 110],
  30: [95, 105], 31: [90, 99], 32: [85, 94], 33: [80, 88], 34: [75, 83],
  35: [70, 77], 36: [65, 72], 37: [60, 66], 38: [55, 61], 39: [50, 55],
  40: [45, 50], 41: [35, 39], 42: [25, 28], 43: [15, 17], 44: [5, 6],
};

const EDUCATION: Record<Education, Pair> = {
  none: [0, 0],
  secondary: [28, 30],
  oneYear: [84, 90],
  twoYear: [91, 98],
  bachelors: [112, 120],
  twoOrMore: [119, 128],
  masters: [126, 135],
  doctoral: [140, 150],
};

const SPOUSE_EDUCATION: Record<Education, number> = {
  none: 0, secondary: 2, oneYear: 6, twoYear: 7, bachelors: 8, twoOrMore: 9, masters: 10, doctoral: 10,
};

export const EDUCATION_LABELS: Record<Education, string> = {
  none: 'Less than secondary school',
  secondary: 'Secondary diploma (high school)',
  oneYear: 'One-year post-secondary program',
  twoYear: 'Two-year post-secondary program',
  bachelors: "Bachelor's degree or 3+ year program",
  twoOrMore: 'Two or more credentials (one is 3+ years)',
  masters: "Master's or professional degree",
  doctoral: 'Doctoral degree (PhD)',
};

const CANADIAN_WORK: Pair[] = [[0, 0], [35, 40], [46, 53], [56, 64], [63, 72], [70, 80]];
const SPOUSE_CANADIAN_WORK = [0, 5, 7, 8, 9, 10];

function firstLanguagePoints(clb: number, withSpouse: boolean) {
  const i = withSpouse ? 0 : 1;
  if (clb >= 10) return ([32, 34] as Pair)[i];
  if (clb === 9) return ([29, 31] as Pair)[i];
  if (clb === 8) return ([22, 23] as Pair)[i];
  if (clb === 7) return ([16, 17] as Pair)[i];
  if (clb === 6) return ([8, 9] as Pair)[i];
  if (clb >= 4) return 6;
  return 0;
}

function secondLanguagePoints(clb: number) {
  if (clb >= 9) return 6;
  if (clb >= 7) return 3;
  if (clb >= 5) return 1;
  return 0;
}

function spouseLanguagePoints(clb: number) {
  if (clb >= 9) return 5;
  if (clb >= 7) return 3;
  if (clb >= 5) return 1;
  return 0;
}

const minOf = (levels: Record<Skill, number>) => Math.min(...SKILLS.map((s) => levels[s]));
const sumOf = (levels: Record<Skill, number>, fn: (clb: number) => number) =>
  SKILLS.reduce((acc, s) => acc + fn(levels[s]), 0);

/** Lowest CLB/NCLC across the four abilities for the given language (0 if not tested). */
export function minLevelIn(p: Profile, lang: 'en' | 'fr') {
  const result = [p.firstLanguage, p.hasSecondLanguage ? p.secondLanguage : null].find((r) => r && languageOf(r) === lang);
  return result ? minOf(clbLevels(result)) : 0;
}

export function hasSpouseFactor(p: Profile) {
  return p.married && !p.spouseIsCanadian && p.spouseAccompanying;
}

export function calculate(p: Profile): CrsResult {
  const withSpouse = hasSpouseFactor(p);
  const w = withSpouse ? 0 : 1;
  const coreMax = withSpouse ? 460 : 500;

  const first = clbLevels(p.firstLanguage);
  const second = p.hasSecondLanguage ? clbLevels(p.secondLanguage) : null;
  const firstMin = minOf(first);

  // A. Core / human capital
  const age = p.age == null ? 0 : (AGE[p.age]?.[w] ?? 0);
  const education = p.education ? EDUCATION[p.education][w] : 0;
  const firstLang = sumOf(first, (c) => firstLanguagePoints(c, withSpouse));
  const secondMax = withSpouse ? 22 : 24;
  const secondLang = second ? Math.min(sumOf(second, secondLanguagePoints), secondMax) : 0;
  const cdnWork = CANADIAN_WORK[Math.min(p.canadianWork, 5)][w];

  const core: Section = {
    id: 'core',
    title: 'Core / human capital',
    max: coreMax,
    points: 0,
    lines: [
      { label: 'Age', points: age, max: withSpouse ? 100 : 110 },
      { label: 'Level of education', points: education, max: withSpouse ? 140 : 150 },
      { label: 'First official language', points: firstLang, max: withSpouse ? 128 : 136 },
      { label: 'Second official language', points: secondLang, max: secondMax },
      { label: 'Canadian work experience', points: cdnWork, max: withSpouse ? 70 : 80 },
    ],
  };

  // B. Spouse factors
  const spouseLevels = withSpouse && p.spouseHasLanguage ? clbLevels(p.spouseLanguage) : null;
  const spouse: Section = {
    id: 'spouse',
    title: 'Spouse or common-law partner',
    max: withSpouse ? 40 : 0,
    points: 0,
    lines: withSpouse
      ? [
          { label: 'Spouse education', points: p.spouseEducation ? SPOUSE_EDUCATION[p.spouseEducation] : 0, max: 10 },
          { label: 'Spouse official language', points: spouseLevels ? sumOf(spouseLevels, spouseLanguagePoints) : 0, max: 20 },
          { label: 'Spouse Canadian work experience', points: SPOUSE_CANADIAN_WORK[Math.min(p.spouseCanadianWork, 5)], max: 10 },
        ]
      : [],
  };

  // C. Skill transferability (max 100)
  const postSecondary = p.education != null && !['none', 'secondary'].includes(p.education);
  const advancedEd = p.education === 'twoOrMore' || p.education === 'masters' || p.education === 'doctoral';
  const lang7 = firstMin >= 7;
  const lang9 = firstMin >= 9;

  const edLang = !postSecondary ? 0 : lang9 ? (advancedEd ? 50 : 25) : lang7 ? (advancedEd ? 25 : 13) : 0;
  const edWork = !postSecondary
    ? 0
    : p.canadianWork >= 2 ? (advancedEd ? 50 : 25)
    : p.canadianWork === 1 ? (advancedEd ? 25 : 13) : 0;
  const educationTransfer = Math.min(50, edLang + edWork);

  const fw = p.foreignWork;
  const fwLang = fw === 0 ? 0 : lang9 ? (fw >= 3 ? 50 : 25) : lang7 ? (fw >= 3 ? 25 : 13) : 0;
  const fwWork = fw === 0
    ? 0
    : p.canadianWork >= 2 ? (fw >= 3 ? 50 : 25)
    : p.canadianWork === 1 ? (fw >= 3 ? 25 : 13) : 0;
  const foreignTransfer = Math.min(50, fwLang + fwWork);

  const tradeTransfer = !p.tradeCertificate ? 0 : lang7 ? 50 : firstMin >= 5 ? 25 : 0;

  const transferRaw = educationTransfer + foreignTransfer + tradeTransfer;
  const transferability: Section = {
    id: 'transferability',
    title: 'Skill transferability',
    max: 100,
    points: 0,
    lines: [
      { label: 'Education + language / Canadian work', points: educationTransfer, max: 50 },
      { label: 'Foreign work + language / Canadian work', points: foreignTransfer, max: 50 },
      { label: 'Trade certificate + language', points: tradeTransfer, max: 50 },
    ],
  };

  // D. Additional points (max 600)
  const french = minLevelIn(p, 'fr');
  const english = minLevelIn(p, 'en');
  const frenchBonus = french >= 7 ? (english >= 5 ? 50 : 25) : 0;
  const studyBonus = p.canadianStudy === 'threePlus' ? 30 : p.canadianStudy === 'oneOrTwo' ? 15 : 0;

  const additional: Section = {
    id: 'additional',
    title: 'Additional points',
    max: 600,
    points: 0,
    lines: [
      { label: 'Provincial nomination', points: p.provincialNomination ? 600 : 0, max: 600 },
      { label: 'French-language skills', points: frenchBonus, max: 50 },
      { label: 'Post-secondary study in Canada', points: studyBonus, max: 30 },
      { label: 'Sibling in Canada', points: p.sibling ? 15 : 0, max: 15 },
    ],
  };

  const sum = (lines: Line[]) => lines.reduce((a, l) => a + l.points, 0);
  core.points = sum(core.lines);
  spouse.points = sum(spouse.lines);
  transferability.points = Math.min(100, transferRaw);
  additional.points = Math.min(600, sum(additional.lines));

  const sections = [core, spouse, transferability, additional].filter((s) => s.max > 0);
  return {
    withSpouse,
    sections,
    total: sections.reduce((a, s) => a + s.points, 0),
  };
}
