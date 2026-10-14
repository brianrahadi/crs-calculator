import { clbLevels, isComplete } from '../crs/language';
import type { LanguageResult, TestLanguage } from '../crs/types';
import { emptyLanguage } from '../crs/types';
import { BC_EDUCATION, calculateBc, lowestClb } from './calculate';
import type { BcProfile } from './types';

export interface BcSuggestion {
  title: string;
  detail: string;
  gain: number;
}

const clbOf = (level: number, lang: TestLanguage): LanguageResult => ({
  ...emptyLanguage(),
  test: 'clb',
  clbLanguage: lang,
  scores: { reading: `${level}`, writing: `${level}`, listening: `${level}`, speaking: `${level}` },
});

/** Raise every ability to at least `level`, keeping higher ones. */
function raised(result: LanguageResult, level: number, lang: TestLanguage): LanguageResult {
  const out = clbOf(level, lang);
  if (!isComplete(result)) return out;
  const current = clbLevels(result);
  for (const s of Object.keys(current) as (keyof typeof current)[]) out.scores[s] = `${Math.max(current[s], level)}`;
  return out;
}

/** What-ifs a registrant could act on, ranked by points gained. */
export function bcSuggestions(p: BcProfile): BcSuggestion[] {
  const base = calculateBc(p).total;
  const out: BcSuggestion[] = [];
  const tryIt = (title: string, detail: string, next: BcProfile) => {
    const gain = calculateBc(next).total - base;
    if (gain > 0) out.push({ title, detail, gain });
  };

  const en = lowestClb(p.english);
  const fr = lowestClb(p.french);
  const main = fr > en ? 'fr' : 'en';
  const mainLevel = Math.max(en, fr);
  if (mainLevel < 9) {
    const target = Math.max(mainLevel + 1, 4);
    const word = main === 'fr' ? 'NCLC' : 'CLB';
    tryIt(
      mainLevel === 0 ? 'Take an English test (CLB 4+)' : `Lift your weakest ability to ${word} ${target}`,
      'Language points use your lowest of the four abilities, so raising the weakest one is what counts. CLB 9 earns the full 30.',
      main === 'fr' ? { ...p, french: raised(p.french, target, 'fr') } : { ...p, english: raised(p.english, target, 'en') },
    );
  }
  if (mainLevel >= 4 && !(en >= 4 && fr >= 4)) {
    tryIt(
      en >= 4 ? 'Add a French test at NCLC 4+' : 'Add an English test at CLB 4+',
      'Valid English and French tests with level 4+ in every ability add 10 bonus points.',
      en >= 4 ? { ...p, french: raised(p.french, 4, 'fr') } : { ...p, english: raised(p.english, 4, 'en') },
    );
  }

  if (p.hourlyWage != null && p.hourlyWage < 70) {
    const to = Math.min(70, Math.floor(p.hourlyWage) + 5);
    tryIt(`Negotiate $${to}/hr`, 'Every whole dollar above $15/hr is a point, up to 55 at $70/hr. Only the base hourly rate counts — not bonuses, tips or overtime.', { ...p, hourlyWage: to });
  }

  if (p.area !== 3) {
    tryIt('Take a job outside the Lower Mainland', 'Job offers in Area 3 (outside Metro Vancouver and the Fraser Valley/Squamish towns) earn 15 area points.', { ...p, area: 3 });
  }
  if (!p.regionalExperience && !p.regionalAlumni) {
    tryIt('Work a year outside Metro Vancouver', '12 months of full-time work outside Area 1 in the last five years — or graduating from a regional public institution — adds 10 points.', { ...p, regionalExperience: true });
  }

  if (p.experience != null && p.experience < 5) {
    const next = p.experience < 1 ? 1 : p.experience + 1;
    tryIt(`Reach ${next === 5 ? '5+' : next} year${next === 1 ? '' : 's'} of related experience`, "Experience in the job offer's occupation (or a directly related one at the same or higher TEER) adds points up to 5 years.", { ...p, experience: next });
  }
  if (!p.canadianExperience) {
    tryIt('Get a year of related work in Canada', 'At least 12 months of directly related, authorized work for a Canadian employer adds 10 points.', { ...p, canadianExperience: true });
  }
  if (!p.workingForEmployer) {
    tryIt('Work full-time for your employer before registering', "Already working full-time in B.C. for the employer, in the offered occupation, adds 10 points.", { ...p, workingForEmployer: true });
  }

  if (p.education && BC_EDUCATION[p.education].postSecondary && p.educationLocation !== 'bc') {
    tryIt('Complete your next credential in B.C.', 'A highest credential from a B.C. post-secondary institution earns 8 bonus points (6 elsewhere in Canada).', { ...p, educationLocation: 'bc' });
  }
  if (!p.designation && ['health', 'childcare', 'veterinary', 'construction'].includes(p.sector)) {
    tryIt('Get your B.C. professional designation', 'A valid B.C. designation for your occupation (e.g. SkilledTradesBC certificate, ECE or practical nurse registration) adds 5 points.', { ...p, designation: true });
  }

  return out.sort((a, b) => b.gain - a.gain).slice(0, 6);
}
