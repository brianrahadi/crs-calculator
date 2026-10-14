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

## BC PNP calculator

The **BC PNP** tab scores a B.C. Provincial Nominee Program **Skills Immigration** registration out of 200 points, following
Part 8 of the [Skills Immigration Program Guide](https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf)
(effective June 10, 2026):

| Factor | Max | How it's scored |
| --- | --- | --- |
| Directly related work experience | 40 | 0–20 by years, +10 Canadian experience, +10 already working for the employer |
| Highest education | 40 | 0–27 by level, +8 B.C. / +6 Canadian credential, +5 B.C. professional designation |
| Language | 40 | Lowest CLB/NCLC ability on the stronger test (CLB 4 = 5 … CLB 9+ = 30), +10 English and French |
| Hourly wage | 55 | $1 = 1 point from $16/hr, capped at $70/hr |
| Area of employment | 25 | Area 1 = 0, Area 2 = 5, Area 3 = 15, +10 regional experience or alumni |

It compares the score with every 2026 round type (Innovate: high economic impact, Care, Build, rural/remote health), checks
the job offer against the latest wage-based round, places it in the registration pool, and ranks what-ifs. Language test
scores can be copied over from the CRS calculator; answers persist locally.

WelcomeBC has no machine-readable feed, so rounds and the pool distribution live in `src/bcpnp/rounds.ts` as a
hand-maintained snapshot of [WelcomeBC invitations to apply](https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply).
After each round, add it to the top of `SCORE_ROUNDS` (and `HIGH_WAGE_DRAWS` for wage-based rounds), refresh `POOL`, and
bump `CHECKED_AT`. The draws tab also lists the high-wage rounds.

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # CRS + BC PNP scoring, aggregator tests
npm run build    # static site in dist/ — deploy anywhere (GitHub Pages, Netlify, Vercel…)
```

## Scoring notes

Points follow IRCC's published CRS criteria. Arranged-employment (job offer) points were removed on March 25, 2025
and are not counted. This is an unofficial tool — confirm with the
[official CRS tool](https://www.cic.gc.ca/english/immigrate/skilled/crs-tool.asp).
