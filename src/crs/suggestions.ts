import { calculate } from './calculate';
import { clbLevels, languageOf } from './language';
import type { LanguageResult, Profile } from './types';
import { emptyLanguage } from './types';

export interface Suggestion {
  title: string;
  detail: string;
  gain: number;
}

const clbOf = (level: number, lang: 'en' | 'fr'): LanguageResult => ({
  ...emptyLanguage(),
  test: 'clb',
  clbLanguage: lang,
  scores: { reading: `${level}`, writing: `${level}`, listening: `${level}`, speaking: `${level}` },
});

/** Raise every skill to at least `level`, keeping any higher scores. */
function raised(result: LanguageResult, level: number): LanguageResult {
  const current = clbLevels(result);
  const lang = languageOf(result) ?? 'en';
  const out = clbOf(level, lang);
  for (const s of Object.keys(current) as (keyof typeof current)[]) {
    out.scores[s] = `${Math.max(current[s], level)}`;
  }
  return out;
}

/** What-if scenarios the candidate could realistically act on, ranked by points gained. */
export function suggestions(p: Profile): Suggestion[] {
  const base = calculate(p).total;
  const out: Suggestion[] = [];
  const tryIt = (title: string, detail: string, next: Profile) => {
    const gain = calculate(next).total - base;
    if (gain > 0) out.push({ title, detail, gain });
  };

  if (p.firstLanguage.test) {
    const levels = clbLevels(p.firstLanguage);
    const min = Math.min(...Object.values(levels));
    if (min < 9) {
      tryIt('Reach CLB 9 in every skill', 'Retake your first-language test aiming for CLB 9 across the board — it also unlocks the top skill-transferability tier.', { ...p, firstLanguage: raised(p.firstLanguage, 9) });
    } else if (min < 10) {
      tryIt('Reach CLB 10 in every skill', 'Push each ability to CLB 10 on your first-language test.', { ...p, firstLanguage: raised(p.firstLanguage, 10) });
    }
  }

  // French as a second language: bonus points plus eligibility for French category draws.
  if (languageOf(p.firstLanguage) !== 'fr') {
    const frenchNow = p.hasSecondLanguage && languageOf(p.secondLanguage) === 'fr'
      ? Math.min(...Object.values(clbLevels(p.secondLanguage)))
      : 0;
    if (frenchNow < 7) {
      tryIt('Learn French to NCLC 7', 'French proficiency earns up to 50 bonus points plus second-language points, and makes you eligible for French-language category draws.', {
        ...p,
        hasSecondLanguage: true,
        secondLanguage: clbOf(7, 'fr'),
      });
    }
  }

  if (p.canadianWork < 5) {
    const years = p.canadianWork + 1;
    tryIt(`Gain ${years === 1 ? 'one year' : `a ${ordinal(years)} year`} of Canadian work`, 'Skilled (TEER 0–3) work in Canada adds core points and multiplies with your education and foreign experience.', { ...p, canadianWork: years });
  }

  if (p.education && ['none', 'secondary', 'oneYear', 'twoYear', 'bachelors'].includes(p.education)) {
    tryIt("Complete a master's degree", 'A graduate credential moves you into the top education bracket.', { ...p, education: 'masters' });
  }

  if (p.married && !p.spouseIsCanadian && p.spouseAccompanying) {
    const spouseMin = p.spouseHasLanguage ? Math.min(...Object.values(clbLevels(p.spouseLanguage))) : 0;
    if (spouseMin < 9) {
      tryIt('Spouse takes a language test (CLB 9)', 'Your partner can add up to 20 points through their own official-language results.', {
        ...p,
        spouseHasLanguage: true,
        spouseLanguage: p.spouseHasLanguage ? raised(p.spouseLanguage, 9) : clbOf(9, 'en'),
      });
    }
  }

  if (!p.provincialNomination) {
    tryIt('Get a provincial nomination', 'An enhanced PNP nomination adds 600 points — effectively guaranteeing an invitation.', { ...p, provincialNomination: true });
  }

  return out.sort((a, b) => b.gain - a.gain);
}

function ordinal(n: number) {
  return ['', 'first', 'second', 'third', 'fourth', 'fifth'][n] ?? `${n}th`;
}
