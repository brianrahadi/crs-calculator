import type { LanguageResult } from '../crs/types';
import { emptyLanguage } from '../crs/types';

/** Highest completed credential, as the BC PNP Skills Immigration guide groups them. */
export type BcEducation = 'secondary' | 'diploma' | 'associate' | 'bachelors' | 'postGrad' | 'masters' | 'doctoral';

export type EducationLocation = 'outside' | 'canada' | 'bc';

/** 1 = Metro Vancouver, 2 = Squamish/Abbotsford/Agassiz/Mission/Chilliwack, 3 = rest of B.C. */
export type BcArea = 1 | 2 | 3;

/** Sector of the B.C. job offer — decides which targeted draws a registrant can be picked in. */
export type BcSector = 'health' | 'childcare' | 'veterinary' | 'education' | 'construction' | 'other';

export interface BcProfile {
  /** Hourly base rate of the B.C. job offer, in CAD. */
  hourlyWage: number | null;
  /** Job offer is NOC TEER 0, 1, 2 or 3 (otherwise TEER 4–5). */
  skilledOffer: boolean;
  sector: BcSector;
  area: BcArea | null;
  /** 12+ months full-time work outside Metro Vancouver in the last 5 years. */
  regionalExperience: boolean;
  /** Graduated from a public post-secondary outside Metro Vancouver in the last 3 years, while living there. */
  regionalAlumni: boolean;
  /** Years of directly related experience: 0 none, 0.5 under a year, 1–5 (5 = 5+). */
  experience: number | null;
  canadianExperience: boolean;
  workingForEmployer: boolean;
  education: BcEducation | null;
  educationLocation: EducationLocation;
  designation: boolean;
  english: LanguageResult;
  french: LanguageResult;
}

export const defaultBcProfile = (): BcProfile => ({
  hourlyWage: null,
  skilledOffer: true,
  sector: 'other',
  area: null,
  regionalExperience: false,
  regionalAlumni: false,
  experience: null,
  canadianExperience: false,
  workingForEmployer: false,
  education: null,
  educationLocation: 'outside',
  designation: false,
  english: emptyLanguage(),
  french: { ...emptyLanguage(), clbLanguage: 'fr' },
});

export interface BcLine {
  label: string;
  points: number;
  max: number;
  hint?: string;
}

export interface BcSection {
  id: 'experience' | 'education' | 'language' | 'wage' | 'area';
  group: 'human' | 'economic';
  title: string;
  points: number;
  max: number;
  lines: BcLine[];
}

export interface BcResult {
  total: number;
  human: number;
  economic: number;
  sections: BcSection[];
}
