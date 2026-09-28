import { TESTS } from './crs/language';
import type { CanadianStudy, Education, LanguageResult, Profile } from './crs/types';
import { defaultProfile, emptyLanguage, SKILLS } from './crs/types';

/*
 * Named profiles ("scenarios") saved in the browser, plus compact share links.
 * Anything decoded from a link is untrusted, so it goes through `sanitize`.
 */

export interface Scenario {
  id: string;
  name: string;
  profile: Profile;
}

export interface ScenarioStore {
  scenarios: Scenario[];
  activeId: string;
}

const STORE_KEY = 'crs:scenarios:v1';
const LEGACY_KEY = 'crs:profile:v1';
export const SHARE_PARAM = 'p';

export const newId = () => Math.random().toString(36).slice(2, 10);

export function freshStore(profile = defaultProfile()): ScenarioStore {
  const id = newId();
  return { scenarios: [{ id, name: 'My profile', profile }], activeId: id };
}

export function loadStore(): ScenarioStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ScenarioStore;
      const scenarios = (parsed.scenarios ?? [])
        .filter((s) => s && typeof s.id === 'string')
        .map((s) => ({ id: s.id, name: String(s.name || 'Untitled').slice(0, 40), profile: sanitize(s.profile) }));
      if (scenarios.length) {
        const activeId = scenarios.some((s) => s.id === parsed.activeId) ? parsed.activeId : scenarios[0].id;
        return { scenarios, activeId };
      }
    }
    // Carry over answers saved before scenarios existed.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return freshStore(sanitize(JSON.parse(legacy)));
  } catch {
    // Corrupt or blocked storage — start fresh.
  }
  return freshStore();
}

export function saveStore(store: ScenarioStore) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage unavailable — scenarios just won't persist.
  }
}

const EDUCATION: Education[] = ['none', 'secondary', 'oneYear', 'twoYear', 'bachelors', 'twoOrMore', 'masters', 'doctoral'];
const STUDY: CanadianStudy[] = ['none', 'oneOrTwo', 'threePlus'];

const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const int = (v: unknown, min: number, max: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;
const oneOf = <T>(v: unknown, list: readonly T[], d: T) => (list.includes(v as T) ? (v as T) : d);

function sanitizeLanguage(v: unknown): LanguageResult {
  const out = emptyLanguage();
  if (!v || typeof v !== 'object') return out;
  const r = v as Partial<LanguageResult>;
  out.test = oneOf(r.test, TESTS.map((t) => t.id), null);
  out.clbLanguage = oneOf(r.clbLanguage, ['en', 'fr'] as const, 'en');
  for (const s of SKILLS) {
    const raw = r.scores?.[s];
    out.scores[s] = typeof raw === 'string' && /^\d{0,3}(\.\d)?$/.test(raw) ? raw : '';
  }
  return out;
}

/** Coerce any parsed JSON into a valid Profile, dropping unknown or malformed fields. */
export function sanitize(v: unknown): Profile {
  const d = defaultProfile();
  if (!v || typeof v !== 'object') return d;
  const p = v as Record<string, unknown>;
  return {
    married: bool(p.married, d.married),
    spouseIsCanadian: bool(p.spouseIsCanadian, d.spouseIsCanadian),
    spouseAccompanying: bool(p.spouseAccompanying, d.spouseAccompanying),
    age: typeof p.age === 'number' && Number.isFinite(p.age) ? int(p.age, 0, 99, 0) : null,
    education: oneOf(p.education, EDUCATION, null),
    canadianStudy: oneOf(p.canadianStudy, STUDY, 'none'),
    firstLanguage: sanitizeLanguage(p.firstLanguage),
    hasSecondLanguage: bool(p.hasSecondLanguage, false),
    secondLanguage: sanitizeLanguage(p.secondLanguage),
    canadianWork: int(p.canadianWork, 0, 5, 0),
    foreignWork: int(p.foreignWork, 0, 3, 0),
    tradeCertificate: bool(p.tradeCertificate, false),
    provincialNomination: bool(p.provincialNomination, false),
    sibling: bool(p.sibling, false),
    spouseEducation: oneOf(p.spouseEducation, EDUCATION, null),
    spouseHasLanguage: bool(p.spouseHasLanguage, false),
    spouseLanguage: sanitizeLanguage(p.spouseLanguage),
    spouseCanadianWork: int(p.spouseCanadianWork, 0, 5, 0),
  };
}

const toBase64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

/** Encode only the fields that differ from the defaults, to keep links short. */
export function encodeProfile(p: Profile, name?: string): string {
  const d = defaultProfile() as unknown as Record<string, unknown>;
  const diff: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (JSON.stringify(v) !== JSON.stringify(d[k])) diff[k] = v;
  }
  if (name) diff._n = name;
  return toBase64Url(JSON.stringify(diff));
}

export function decodeProfile(code: string): { profile: Profile; name?: string } | null {
  try {
    const parsed = JSON.parse(fromBase64Url(code));
    if (!parsed || typeof parsed !== 'object') return null;
    const name = typeof parsed._n === 'string' ? parsed._n.slice(0, 40) : undefined;
    return { profile: sanitize({ ...defaultProfile(), ...parsed }), name };
  } catch {
    return null;
  }
}

export function shareUrl(p: Profile, name?: string) {
  const url = new URL(location.href);
  url.hash = '';
  url.search = `?${SHARE_PARAM}=${encodeProfile(p, name)}`;
  return url.toString();
}

export const sameProfile = (a: Profile, b: Profile) => JSON.stringify(a) === JSON.stringify(b);
