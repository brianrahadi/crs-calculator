// Downloads IRCC's official Express Entry rounds feed into public/data/draws.json.
// The app reads the live feed first; this snapshot is the offline fallback.
import { writeFile } from 'node:fs/promises';

const FEED = 'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';
const KEEP = [
  'drawNumber', 'drawNumberURL', 'drawDate', 'drawName', 'drawSize', 'drawCRS', 'drawCutOff', 'drawDistributionAsOn',
  'dd1', 'dd2', 'dd4', 'dd5', 'dd6', 'dd7', 'dd8', 'dd10', 'dd11', 'dd12', 'dd13', 'dd14', 'dd15', 'dd16', 'dd17', 'dd18',
];

const res = await fetch(FEED);
if (!res.ok) throw new Error(`Feed returned HTTP ${res.status}`);
const { rounds } = await res.json();
const slim = rounds.map((r) => Object.fromEntries(KEEP.filter((k) => k in r).map((k) => [k, r[k]])));
const out = new URL('../public/data/draws.json', import.meta.url);
await writeFile(out, JSON.stringify({ fetchedAt: Date.now(), rounds: slim }));
console.log(`Saved ${slim.length} rounds (latest #${slim[0]?.drawNumber}, ${slim[0]?.drawDate}) to public/data/draws.json`);
