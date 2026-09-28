/*
 * Aggregates Express Entry rounds from IRCC's official feed — the same JSON that
 * powers canada.ca's "Rounds of invitations" page. Falls back to a bundled
 * snapshot (refresh with `npm run sync-draws`) if the live feed is unreachable.
 */

export const OFFICIAL_FEED = 'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';
export const OFFICIAL_PAGE =
  'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html';
const SNAPSHOT = `${import.meta.env.BASE_URL}data/draws.json`;
const CACHE_KEY = 'crs:draws:v1';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export type RawRound = Record<string, string>;

export interface Bucket {
  label: string;
  count: number;
  /** Lowest CRS score in this bucket, used to place a candidate. */
  from: number;
  to: number;
}

export interface Draw {
  number: number;
  date: string; // YYYY-MM-DD
  name: string;
  category: CategoryId;
  size: number;
  crs: number;
  tieBreak: string;
  distributionDate: string;
  distribution: Bucket[];
  poolTotal: number;
  url: string;
}

export type CategoryId =
  | 'cec' | 'pnp' | 'french' | 'healthcare' | 'trades' | 'stem' | 'transport' | 'agriculture'
  | 'education' | 'senior' | 'physicians' | 'military' | 'general' | 'fsw' | 'fst' | 'other';

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  cec: 'Canadian Experience Class',
  pnp: 'Provincial Nominee Program',
  french: 'French-language proficiency',
  healthcare: 'Healthcare & social services',
  trades: 'Trades',
  stem: 'STEM',
  transport: 'Transport',
  agriculture: 'Agriculture & agri-food',
  education: 'Education',
  senior: 'Senior managers (Cdn exp.)',
  physicians: 'Physicians (Cdn exp.)',
  military: 'Skilled military recruits',
  general: 'General (all programs)',
  fsw: 'Federal Skilled Worker',
  fst: 'Federal Skilled Trades',
  other: 'Other',
};

/** Who can be invited in each round type — plain-language eligibility hint. */
export const CATEGORY_HINTS: Partial<Record<CategoryId, string>> = {
  cec: 'Needs 1+ year of skilled Canadian work experience in the last 3 years.',
  pnp: 'Only candidates holding a provincial nomination (+600).',
  french: 'Needs NCLC 7+ in all four French abilities.',
  healthcare: 'Needs 6+ months of recent experience in an eligible healthcare or social-services occupation.',
  trades: 'Needs 6+ months of recent experience in an eligible trade occupation.',
  stem: 'Needs 6+ months of recent experience in an eligible STEM occupation.',
  transport: 'Needs 6+ months of recent experience in an eligible transport occupation.',
  agriculture: 'Needs 6+ months of recent experience in an eligible agriculture occupation.',
  education: 'Needs 6+ months of recent experience in an eligible education occupation.',
  senior: 'Needs Canadian work experience in an eligible senior-management occupation.',
  physicians: 'Needs Canadian work experience as a physician.',
  military: 'Only candidates recruited by the Canadian Armed Forces.',
  general: 'Open to all Express Entry candidates.',
};

export function categorize(name: string): CategoryId {
  const n = name.toLowerCase();
  if (n.includes('canadian experience')) return 'cec';
  if (n.includes('provincial nominee')) return 'pnp';
  if (n.includes('french')) return 'french';
  if (n.includes('physician')) return 'physicians';
  if (n.includes('healthcare')) return 'healthcare';
  if (n.includes('trade occupations') || n.includes('trades occupations')) return 'trades';
  if (n.includes('stem')) return 'stem';
  if (n.includes('transport')) return 'transport';
  if (n.includes('agri')) return 'agriculture';
  if (n.includes('education')) return 'education';
  if (n.includes('senior manager')) return 'senior';
  if (n.includes('military')) return 'military';
  if (n === 'general' || n.includes('no program specified')) return 'general';
  if (n.includes('federal skilled worker')) return 'fsw';
  if (n.includes('federal skilled trades')) return 'fst';
  return 'other';
}

const num = (v: string | undefined) => {
  const n = Number((v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** dd1..dd17 in IRCC's feed are pool-distribution buckets; dd18 is the pool total. */
const BUCKETS: { key: string; label: string; from: number; to: number }[] = [
  { key: 'dd1', label: '601–1200', from: 601, to: 1200 },
  { key: 'dd4', label: '491–500', from: 491, to: 500 },
  { key: 'dd2', label: '501–600', from: 501, to: 600 },
  { key: 'dd5', label: '481–490', from: 481, to: 490 },
  { key: 'dd6', label: '471–480', from: 471, to: 480 },
  { key: 'dd7', label: '461–470', from: 461, to: 470 },
  { key: 'dd8', label: '451–460', from: 451, to: 460 },
  { key: 'dd10', label: '441–450', from: 441, to: 450 },
  { key: 'dd11', label: '431–440', from: 431, to: 440 },
  { key: 'dd12', label: '421–430', from: 421, to: 430 },
  { key: 'dd13', label: '411–420', from: 411, to: 420 },
  { key: 'dd14', label: '401–410', from: 401, to: 410 },
  { key: 'dd15', label: '351–400', from: 351, to: 400 },
  { key: 'dd16', label: '301–350', from: 301, to: 350 },
  { key: 'dd17', label: '0–300', from: 0, to: 300 },
];

function normalize(r: RawRound): Draw {
  const distribution = BUCKETS.map((b) => ({ label: b.label, from: b.from, to: b.to, count: num(r[b.key]) }))
    .sort((a, b) => b.from - a.from);
  const href = /href='([^']+)'/.exec(r.drawNumberURL ?? '')?.[1];
  return {
    number: num(r.drawNumber),
    date: r.drawDate,
    name: r.drawName,
    category: categorize(r.drawName ?? ''),
    size: num(r.drawSize),
    crs: num(r.drawCRS),
    tieBreak: r.drawCutOff ?? '',
    distributionDate: r.drawDistributionAsOn ?? '',
    distribution,
    poolTotal: num(r.dd18),
    url: href ? `https://www.canada.ca${href.replace('/content/canadasite', '')}` : OFFICIAL_PAGE,
  };
}

export interface DrawsData {
  draws: Draw[];
  source: 'live' | 'cache' | 'snapshot';
  fetchedAt: number;
}

function parse(json: { rounds?: RawRound[] }): Draw[] {
  return (json.rounds ?? [])
    .map(normalize)
    .filter((d) => d.date && d.crs > 0)
    .sort((a, b) => (a.date === b.date ? b.number - a.number : b.date.localeCompare(a.date)));
}

function readCache(): { rounds: RawRound[]; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(rounds: RawRound[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rounds, fetchedAt: Date.now() }));
  } catch {
    // Storage full or blocked — the app works fine without the cache.
  }
}

/** Keep only fields the app reads, so the cache stays small. */
const KEEP = ['drawNumber', 'drawNumberURL', 'drawDate', 'drawName', 'drawSize', 'drawCRS', 'drawCutOff', 'drawDistributionAsOn', ...BUCKETS.map((b) => b.key), 'dd18'];
export const slim = (rounds: RawRound[]) =>
  rounds.map((r) => Object.fromEntries(KEEP.filter((k) => k in r).map((k) => [k, r[k]])));

/** Instant, possibly stale data: the local cache, else the bundled snapshot. */
export async function loadStale(): Promise<DrawsData> {
  const cached = readCache();
  if (cached) return { draws: parse(cached), source: 'cache', fetchedAt: cached.fetchedAt };
  const res = await fetch(SNAPSHOT);
  const json = await res.json();
  return { draws: parse(json), source: 'snapshot', fetchedAt: json.fetchedAt ?? 0 };
}

export const isFresh = (d: DrawsData) =>
  d.source === 'live' || (d.source === 'cache' && Date.now() - d.fetchedAt < CACHE_TTL_MS);

/** Fetch the official feed directly (canada.ca sends Access-Control-Allow-Origin: *). */
export async function loadLive(): Promise<DrawsData> {
  const res = await fetch(OFFICIAL_FEED, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`IRCC feed returned HTTP ${res.status}`);
  const json = await res.json();
  const rounds = slim(json.rounds ?? []);
  writeCache(rounds);
  return { draws: parse({ rounds }), source: 'live', fetchedAt: Date.now() };
}

export interface CategorySummary {
  category: CategoryId;
  latest: Draw;
  draws: Draw[];
  /** Lowest cutoff in the trailing 12 months. */
  low12: number;
  high12: number;
  avg12: number;
  count12: number;
}

export function summarize(draws: Draw[]): CategorySummary[] {
  const byCat = new Map<CategoryId, Draw[]>();
  for (const d of draws) {
    if (!byCat.has(d.category)) byCat.set(d.category, []);
    byCat.get(d.category)!.push(d);
  }
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const since = cutoff.toISOString().slice(0, 10);

  return [...byCat.entries()]
    .map(([category, list]) => {
      const recent = list.filter((d) => d.date >= since);
      const scores = (recent.length ? recent : [list[0]]).map((d) => d.crs);
      return {
        category,
        latest: list[0],
        draws: list,
        low12: Math.min(...scores),
        high12: Math.max(...scores),
        avg12: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count12: recent.length,
      };
    })
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date));
}

/** Approximate number of pool candidates scoring above `score`, from the latest distribution. */
export function candidatesAbove(draw: Draw, score: number) {
  let above = 0;
  for (const b of draw.distribution) {
    if (b.from > score) above += b.count;
    else if (b.to >= score) {
      // Assume a uniform spread inside the bucket.
      above += Math.round(b.count * ((b.to - score) / (b.to - b.from + 1)));
    }
  }
  return above;
}
