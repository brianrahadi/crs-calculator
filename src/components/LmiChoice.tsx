import type { ReactNode } from 'react';
import type { LmiChoice as Choice, LmiOption } from '../crs/types';

export const OPTION_LABEL: Record<LmiOption, string> = { work: 'Canadian work experience', offer: 'Job offer' };
export const OPTION_LETTER: Record<LmiOption, string> = { work: 'A', offer: 'B' };
const OPTION_SHORT: Record<LmiOption, string> = { work: 'Canadian work', offer: 'a job offer' };

/** One-line verdict: which option counts and what the other would have given. */
export function choiceSummary(c: Choice): string {
  if (c.counted == null) return 'No points yet — add Canadian work or a high-wage job offer';
  const other: LmiOption = c.counted === 'work' ? 'offer' : 'work';
  const otherPts = c[other];
  const win = `Option ${OPTION_LETTER[c.counted]} (${OPTION_SHORT[c.counted].replace(/^a /, '')}) counts: ${c[c.counted]} points`;
  if (otherPts === 0) return win;
  if (otherPts === c[c.counted]) return `${win} — a tie with option ${OPTION_LETTER[other]}, so only one is used`;
  return `${win} — option ${OPTION_LETTER[other]} (${OPTION_SHORT[other]}) would give ${otherPts}, so it isn't added`;
}

function OptionCard({ option, choice, children, sub }: { option: LmiOption; choice: Choice; children: ReactNode; sub: string }) {
  const counted = choice.counted === option;
  const state = choice.counted == null ? 'idle' : counted ? 'counted' : 'unused';
  return (
    <div className={`lmi-option ${state}`}>
      <div className="lmi-option-head">
        <span className="lmi-letter" aria-hidden>{OPTION_LETTER[option]}</span>
        <div className="lmi-option-title">
          <strong>Option {OPTION_LETTER[option]} · {OPTION_LABEL[option]}</strong>
          <small>{sub}</small>
        </div>
        <span className="lmi-pts">
          <strong>{choice[option]}</strong> pts
          {state === 'counted' && <em className="lmi-badge counted">✓ Counts</em>}
          {state === 'unused' && <em className="lmi-badge unused">Not counted</em>}
        </span>
      </div>
      <div className="lmi-option-body">{children}</div>
    </div>
  );
}

/** The two mutually exclusive ways to earn Labour market integration points, side by side. */
export function LmiChoice({ choice, max, work, offer }: { choice: Choice; max: number; work: ReactNode; offer: ReactNode }) {
  return (
    <fieldset className="lmi-choice">
      <legend className="sr-only">Labour market integration</legend>
      <div className="lmi-head">
        <strong>Labour market integration · up to {max} points</strong>
        <p>
          You get points for <b>either</b> Canadian work experience <b>or</b> a job offer — whichever is higher, never
          both. Fill in both and we'll use the better one.
        </p>
      </div>
      <OptionCard option="work" choice={choice} sub="Length of skilled work in Canada, plus a bonus for high-wage occupations">
        {work}
      </OptionCard>
      <div className="lmi-or" aria-hidden><span>or</span></div>
      <OptionCard option="offer" choice={choice} sub="A valid Express Entry job offer in a high-wage occupation — no LMIA needed">
        {offer}
      </OptionCard>
      <p className={`lmi-verdict ${choice.counted ?? 'none'}`} aria-live="polite">{choiceSummary(choice)}</p>
    </fieldset>
  );
}
