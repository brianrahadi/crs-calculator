import { useState } from 'react';
import { HIGH_WAGE_LIST_URL, searchOccupations, TIER_LABEL } from '../crs/highWage';
import type { WageTier } from '../crs/types';

/** Search IRCC's high-wage occupation list by NOC code or title, and pick a tier from a match. */
export function OccupationLookup({ label, onPick }: { label: string; onPick: (tier: WageTier) => void }) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const matches = searchOccupations(query);
  const looksLikeNoc = /^\d{5}$/.test(query.trim());

  return (
    <div className="occ-lookup">
      <input
        type="search"
        className="occ-input"
        placeholder="Search NOC code or job title"
        aria-label={label}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPicked(null);
        }}
      />
      {picked && <p className="occ-picked">{picked}</p>}
      {!picked && query.trim() !== '' && (
        matches.length > 0 ? (
          <ul className="occ-results">
            {matches.map((o) => (
              <li key={o.noc}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(o.tier);
                    setPicked(`${o.noc} ${o.title} — ${TIER_LABEL[o.tier]}`);
                  }}
                >
                  <span className="occ-noc">{o.noc}</span>
                  <span className="occ-title">{o.title}</span>
                  <span className="occ-tier">{o.tier.replace('x', '×')}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="occ-none">
            {looksLikeNoc ? `NOC ${query.trim()} isn't` : "Nothing matching that is"} on the{' '}
            <a href={HIGH_WAGE_LIST_URL} target="_blank" rel="noreferrer">high-wage list</a>, so it earns no high-wage points.
          </p>
        )
      )}
    </div>
  );
}
