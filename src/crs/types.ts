export type Education =
  | 'none'
  | 'secondary'
  | 'oneYear'
  | 'twoYear'
  | 'bachelors'
  | 'twoOrMore'
  | 'masters'
  | 'doctoral';

export type Skill = 'reading' | 'writing' | 'listening' | 'speaking';
export const SKILLS: Skill[] = ['listening', 'reading', 'writing', 'speaking'];

export type LanguageTest = 'ielts' | 'celpip' | 'pte' | 'tef' | 'tcf' | 'clb';
export type TestLanguage = 'en' | 'fr';

export interface LanguageResult {
  test: LanguageTest | null;
  /** Raw scores as the candidate typed them (band, level, points). */
  scores: Record<Skill, string>;
  /** Only used when test === 'clb': which language the levels are for. */
  clbLanguage: TestLanguage;
}

export type CanadianStudy = 'none' | 'oneOrTwo' | 'threePlus';

export interface Profile {
  married: boolean;
  /** Spouse is a Canadian citizen / PR — scored as single. */
  spouseIsCanadian: boolean;
  /** Spouse will come with the applicant to Canada. */
  spouseAccompanying: boolean;
  age: number | null;
  education: Education | null;
  canadianStudy: CanadianStudy;
  firstLanguage: LanguageResult;
  hasSecondLanguage: boolean;
  secondLanguage: LanguageResult;
  canadianWork: number; // years, 0..5 (5 = 5+)
  foreignWork: number; // years, 0..3 (3 = 3+)
  tradeCertificate: boolean;
  provincialNomination: boolean;
  sibling: boolean;
  spouseEducation: Education | null;
  spouseHasLanguage: boolean;
  spouseLanguage: LanguageResult;
  spouseCanadianWork: number;
}

export interface Line {
  label: string;
  points: number;
  max: number;
  hint?: string;
}

export interface Section {
  id: 'core' | 'spouse' | 'transferability' | 'additional';
  title: string;
  points: number;
  max: number;
  lines: Line[];
}

export interface CrsResult {
  total: number;
  withSpouse: boolean;
  sections: Section[];
}

export const emptyLanguage = (): LanguageResult => ({
  test: null,
  scores: { reading: '', writing: '', listening: '', speaking: '' },
  clbLanguage: 'en',
});

export const defaultProfile = (): Profile => ({
  married: false,
  spouseIsCanadian: false,
  spouseAccompanying: true,
  age: null,
  education: null,
  canadianStudy: 'none',
  firstLanguage: emptyLanguage(),
  hasSecondLanguage: false,
  secondLanguage: emptyLanguage(),
  canadianWork: 0,
  foreignWork: 0,
  tradeCertificate: false,
  provincialNomination: false,
  sibling: false,
  spouseEducation: null,
  spouseHasLanguage: false,
  spouseLanguage: emptyLanguage(),
  spouseCanadianWork: 0,
});
