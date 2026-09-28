import { EDUCATION_LABELS, hasSpouseFactor } from '../crs/calculate';
import { isComplete, languageOf } from '../crs/language';
import type { Education, Profile } from '../crs/types';
import { Field, OptionList, Segmented, Toggle } from './controls';
import { LanguageInput } from './LanguageInput';

export interface Step {
  id: string;
  title: string;
  blurb: string;
  done: (p: Profile) => boolean;
}

export const stepsFor = (p: Profile): Step[] => [
  { id: 'you', title: 'About you', blurb: 'Age and family situation set which points grid applies.', done: (p) => p.age != null },
  { id: 'education', title: 'Education', blurb: 'Your highest credential, assessed by an ECA if earned outside Canada.', done: (p) => p.education != null },
  { id: 'language', title: 'Language', blurb: 'Results from an approved test, less than two years old.', done: (p) => isComplete(p.firstLanguage) },
  { id: 'work', title: 'Work experience', blurb: 'Skilled (TEER 0, 1, 2 or 3), paid, full-time or equivalent — past 10 years.', done: () => true },
  ...(hasSpouseFactor(p)
    ? [{ id: 'spouse', title: 'Your spouse', blurb: 'Your partner can add up to 40 points.', done: (p: Profile) => p.spouseEducation != null }]
    : []),
  { id: 'extras', title: 'Extra points', blurb: 'Nominations, family and study in Canada.', done: () => true },
];

const EDUCATION_ORDER: Education[] = ['none', 'secondary', 'oneYear', 'twoYear', 'bachelors', 'twoOrMore', 'masters', 'doctoral'];

export function StepBody({ step, p, set }: { step: string; p: Profile; set: (patch: Partial<Profile>) => void }) {
  switch (step) {
    case 'you':
      return (
        <>
          <Field label="How old are you?" hint="Use your age on the day you'd submit your Express Entry profile.">
            <div className="age-row">
              <input
                className="age-input"
                type="number"
                inputMode="numeric"
                min={16}
                max={70}
                placeholder="Age"
                aria-label="Age"
                value={p.age ?? ''}
                onChange={(e) => set({ age: e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value))) })}
              />
              <input
                className="age-slider"
                type="range"
                min={17}
                max={46}
                aria-hidden
                tabIndex={-1}
                value={p.age ?? 29}
                onChange={(e) => set({ age: Number(e.target.value) })}
              />
            </div>
            {p.age != null && (p.age < 18 || p.age >= 45) && (
              <p className="note">Age earns points only between 18 and 44 — max points from 20 to 29.</p>
            )}
          </Field>
          <Field label="Marital status">
            <Segmented
              label="Marital status"
              value={p.married}
              onChange={(married) => set({ married })}
              options={[
                { value: false, label: 'Single', sub: 'Never married, divorced, widowed' },
                { value: true, label: 'Married / common-law', sub: 'Including conjugal partner' },
              ]}
            />
          </Field>
          {p.married && (
            <>
              <Toggle
                title="My spouse is a Canadian citizen or permanent resident"
                sub="If so, you're scored as a single applicant."
                checked={p.spouseIsCanadian}
                onChange={(spouseIsCanadian) => set({ spouseIsCanadian })}
              />
              {!p.spouseIsCanadian && (
                <Toggle
                  title="My spouse will come with me to Canada"
                  sub="A non-accompanying spouse is also scored as single."
                  checked={p.spouseAccompanying}
                  onChange={(spouseAccompanying) => set({ spouseAccompanying })}
                />
              )}
            </>
          )}
        </>
      );

    case 'education':
      return (
        <>
          <Field label="Highest level of education">
            <OptionList
              label="Highest level of education"
              value={p.education}
              onChange={(education) => set({ education })}
              options={EDUCATION_ORDER.map((e) => ({ value: e, label: EDUCATION_LABELS[e] }))}
            />
          </Field>
          <Field label="Did you study in Canada?" hint="A Canadian post-secondary credential earns bonus points (in-person, 8+ months, full-time).">
            <Segmented
              label="Canadian study"
              value={p.canadianStudy}
              onChange={(canadianStudy) => set({ canadianStudy })}
              options={[
                { value: 'none', label: 'No' },
                { value: 'oneOrTwo', label: '1–2 year credential', sub: '+15' },
                { value: 'threePlus', label: '3+ years / Master’s / PhD', sub: '+30' },
              ]}
            />
          </Field>
        </>
      );

    case 'language': {
      const firstLang = languageOf(p.firstLanguage);
      const other = firstLang === 'fr' ? 'en' : 'fr';
      return (
        <>
          <Field label="First official language test" hint="Pick the test you took (or plan to take) and enter your band scores.">
            <LanguageInput label="First language test" value={p.firstLanguage} onChange={(firstLanguage) => set({ firstLanguage })} />
          </Field>
          <Toggle
            title={`I also have ${other === 'fr' ? 'French' : 'English'} test results`}
            sub={other === 'fr' ? 'French at NCLC 7+ earns up to 50 bonus points.' : 'Adds second-language points and can unlock the full French bonus.'}
            checked={p.hasSecondLanguage}
            onChange={(hasSecondLanguage) => set({ hasSecondLanguage })}
          />
          {p.hasSecondLanguage && (
            <Field label="Second official language test">
              <LanguageInput
                label="Second language test"
                only={other}
                value={p.secondLanguage}
                onChange={(secondLanguage) => set({ secondLanguage })}
              />
            </Field>
          )}
        </>
      );
    }

    case 'work':
      return (
        <>
          <Field label="Skilled work experience in Canada" hint="Authorized work in Canada within the past 10 years.">
            <Segmented
              label="Canadian work experience"
              value={p.canadianWork}
              onChange={(canadianWork) => set({ canadianWork })}
              options={[0, 1, 2, 3, 4, 5].map((y) => ({ value: y, label: y === 0 ? 'None' : y === 5 ? '5+ yrs' : `${y} yr${y > 1 ? 's' : ''}` }))}
            />
          </Field>
          <Field label="Skilled work experience outside Canada" hint="Foreign experience in the past 10 years — it counts through skill transferability.">
            <Segmented
              label="Foreign work experience"
              value={p.foreignWork}
              onChange={(foreignWork) => set({ foreignWork })}
              options={[
                { value: 0, label: 'None' },
                { value: 1, label: '1 yr' },
                { value: 2, label: '2 yrs' },
                { value: 3, label: '3+ yrs' },
              ]}
            />
          </Field>
          <Toggle
            title="I have a Canadian certificate of qualification in a trade"
            sub="Issued by a province, territory or federal body."
            checked={p.tradeCertificate}
            onChange={(tradeCertificate) => set({ tradeCertificate })}
          />
        </>
      );

    case 'spouse':
      return (
        <>
          <Field label="Spouse's highest education">
            <OptionList
              label="Spouse education"
              value={p.spouseEducation}
              onChange={(spouseEducation) => set({ spouseEducation })}
              options={EDUCATION_ORDER.map((e) => ({ value: e, label: EDUCATION_LABELS[e] }))}
            />
          </Field>
          <Field label="Spouse's skilled work in Canada">
            <Segmented
              label="Spouse Canadian work experience"
              value={p.spouseCanadianWork}
              onChange={(spouseCanadianWork) => set({ spouseCanadianWork })}
              options={[0, 1, 2, 3, 4, 5].map((y) => ({ value: y, label: y === 0 ? 'None' : y === 5 ? '5+ yrs' : `${y} yr${y > 1 ? 's' : ''}` }))}
            />
          </Field>
          <Toggle
            title="My spouse has official language test results"
            checked={p.spouseHasLanguage}
            onChange={(spouseHasLanguage) => set({ spouseHasLanguage })}
          />
          {p.spouseHasLanguage && (
            <LanguageInput label="Spouse language test" value={p.spouseLanguage} onChange={(spouseLanguage) => set({ spouseLanguage })} />
          )}
        </>
      );

    case 'extras':
      return (
        <>
          <Toggle
            title="I have a provincial or territorial nomination"
            sub="An enhanced PNP nomination through Express Entry."
            points="+600"
            checked={p.provincialNomination}
            onChange={(provincialNomination) => set({ provincialNomination })}
          />
          <Toggle
            title="I have a sibling living in Canada"
            sub="Brother or sister, 18+, who is a citizen or permanent resident (yours or your spouse's)."
            points="+15"
            checked={p.sibling}
            onChange={(sibling) => set({ sibling })}
          />
          <div className="callout">
            <strong>Job offers no longer add points.</strong> IRCC removed arranged-employment points from the CRS on
            March 25, 2025. French-language points are calculated automatically from your test results.
          </div>
        </>
      );
  }
  return null;
}
