import { languageOf, TESTS } from '../crs/language';
import type { LanguageResult, Profile } from '../crs/types';
import { emptyLanguage, SKILLS } from '../crs/types';
import type { BcArea, BcEducation, BcProfile, BcSector, EducationLocation } from './types';
import { defaultBcProfile } from './types';

const KEY = 'bcpnp:profile:v1';

const EDUCATION: BcEducation[] = ['secondary', 'diploma', 'associate', 'bachelors', 'postGrad', 'masters', 'doctoral'];
const LOCATIONS: EducationLocation[] = ['outside', 'canada', 'bc'];
const SECTORS: BcSector[] = ['health', 'childcare', 'veterinary', 'education', 'construction', 'other'];
const AREAS: BcArea[] = [1, 2, 3];
const EXPERIENCE = [0, 0.5, 1, 2, 3, 4, 5];

const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const oneOf = <T>(v: unknown, list: readonly T[], d: T) => (list.includes(v as T) ? (v as T) : d);

function sanitizeLanguage(v: unknown, lang: 'en' | 'fr'): LanguageResult {
  const out = { ...emptyLanguage(), clbLanguage: lang };
  if (!v || typeof v !== 'object') return out;
  const r = v as Partial<LanguageResult>;
  const allowed = TESTS.filter((t) => t.id === 'clb' || t.language === lang).map((t) => t.id);
  out.test = oneOf(r.test, allowed, null);
  for (const s of SKILLS) {
    const raw = r.scores?.[s];
    out.scores[s] = typeof raw === 'string' && /^\d{0,3}(\.\d)?$/.test(raw) ? raw : '';
  }
  return out;
}

/** Coerce parsed JSON into a valid BcProfile, dropping anything malformed. */
export function sanitizeBc(v: unknown): BcProfile {
  const d = defaultBcProfile();
  if (!v || typeof v !== 'object') return d;
  const p = v as Record<string, unknown>;
  const wage = typeof p.hourlyWage === 'number' && Number.isFinite(p.hourlyWage) ? Math.min(999, Math.max(0, p.hourlyWage)) : null;
  return {
    hourlyWage: wage,
    skilledOffer: bool(p.skilledOffer, d.skilledOffer),
    sector: oneOf(p.sector, SECTORS, d.sector),
    area: oneOf(p.area, AREAS, null),
    regionalExperience: bool(p.regionalExperience, false),
    regionalAlumni: bool(p.regionalAlumni, false),
    experience: oneOf(p.experience, EXPERIENCE, null),
    canadianExperience: bool(p.canadianExperience, false),
    workingForEmployer: bool(p.workingForEmployer, false),
    education: oneOf(p.education, EDUCATION, null),
    educationLocation: oneOf(p.educationLocation, LOCATIONS, 'outside'),
    designation: bool(p.designation, false),
    english: sanitizeLanguage(p.english, 'en'),
    french: sanitizeLanguage(p.french, 'fr'),
  };
}

export function loadBc(): BcProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitizeBc(JSON.parse(raw));
  } catch {
    // Corrupt or blocked storage — start fresh.
  }
  return defaultBcProfile();
}

export function saveBc(p: BcProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage unavailable — answers just won't persist.
  }
}

/** English and French results from a CRS profile, so they needn't be typed twice. */
export function languageFromCrs(p: Profile): { english: LanguageResult | null; french: LanguageResult | null } {
  const out: { english: LanguageResult | null; french: LanguageResult | null } = { english: null, french: null };
  const tests = p.hasSecondLanguage ? [p.firstLanguage, p.secondLanguage] : [p.firstLanguage];
  for (const t of tests) {
    const lang = languageOf(t);
    if (!lang || SKILLS.some((s) => t.scores[s].trim() === '')) continue;
    const copy = { ...t, scores: { ...t.scores }, clbLanguage: lang };
    if (lang === 'en' && !out.english) out.english = copy;
    if (lang === 'fr' && !out.french) out.french = copy;
  }
  return out;
}
