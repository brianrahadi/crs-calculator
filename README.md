# crs-calculator

A fast, guided calculator for Canada's Express Entry **Comprehensive Ranking System (CRS)** score, paired with live
round-of-invitation data from IRCC.

## Features

- **Step-by-step flow** (about you → education → language → work → spouse → extras) with a live score panel that
  updates on every answer. On mobile the panel becomes a bottom bar with a pull-up breakdown.
- **Enter real test scores** — IELTS, CELPIP, PTE Core, TEF Canada, TCF Canada — converted to CLB/NCLC automatically
  (or type CLB levels directly).
- **Results page**: full points breakdown, your score vs. every recently active draw type (ranked by what you're
  eligible for), your position in the candidate pool, and ranked "ways to raise your score" what-ifs.
- **Latest draws tab**: newest round, per-category cutoffs, cutoff trend chart, full history table, and pool distribution.
- Answers persist locally in the browser; light & dark themes; printable results.

## Draw data

Draws are read from IRCC's official feed — the same JSON behind the
[canada.ca rounds-of-invitations page](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html):

```
https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json
```

The feed allows cross-origin requests, so the browser fetches it directly — no backend needed. The app shows cached
or bundled data instantly, then swaps in the live feed (cached for 3 hours). `public/data/draws.json` is an offline
fallback snapshot; refresh it with:

```sh
npm run sync-draws
```

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # scoring + aggregator tests
npm run build    # static site in dist/ — deploy anywhere (GitHub Pages, Netlify, Vercel…)
```

## Scoring notes

Points follow IRCC's published CRS criteria. Arranged-employment (job offer) points were removed on March 25, 2025
and are not counted. This is an unofficial tool — confirm with the
[official CRS tool](https://www.cic.gc.ca/english/immigrate/skilled/crs-tool.asp).
