import { skillRange, TESTS, testInfo, toClb } from '../crs/language';
import type { LanguageResult, LanguageTest, Skill, TestLanguage } from '../crs/types';
import { SKILLS } from '../crs/types';
import { Segmented } from './controls';

const SKILL_LABELS: Record<Skill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

export function LanguageInput({
  value,
  onChange,
  only,
  label,
}: {
  value: LanguageResult;
  onChange: (v: LanguageResult) => void;
  /** Restrict to tests in one language (used for the second language). */
  only?: TestLanguage;
  label: string;
}) {
  const tests = TESTS.filter((t) => !only || t.id === 'clb' || t.language === only);
  const setTest = (test: LanguageTest) =>
    onChange({
      ...value,
      test,
      scores: test === value.test ? value.scores : { reading: '', writing: '', listening: '', speaking: '' },
      clbLanguage: only ?? value.clbLanguage,
    });

  return (
    <div className="lang">
      <div className="test-grid" role="radiogroup" aria-label={label}>
        {tests.map((t) => (
          <button
            type="button"
            key={t.id}
            role="radio"
            aria-checked={value.test === t.id}
            className={`test-card ${value.test === t.id ? 'on' : ''} ${t.id === 'clb' ? 'wide' : ''}`}
            onClick={() => setTest(t.id)}
          >
            <strong>{t.id === 'clb' ? 'Enter CLB / NCLC directly' : t.short}</strong>
            <small>{t.id === 'clb' ? 'Skip the conversion' : t.language === 'en' ? 'English' : 'French'}</small>
          </button>
        ))}
      </div>

      {value.test === 'clb' && !only && (
        <Segmented
          label="Language of these levels"
          value={value.clbLanguage}
          onChange={(clbLanguage) => onChange({ ...value, clbLanguage })}
          options={[
            { value: 'en', label: 'English (CLB)' },
            { value: 'fr', label: 'French (NCLC)' },
          ]}
        />
      )}

      {value.test && (
        <div className="score-grid">
          {SKILLS.map((s) => {
            const range = skillRange(value.test!, s);
            const raw = value.scores[s];
            const clb = toClb(value.test, s, raw);
            return (
              <label key={s} className="score-input">
                <span>{SKILL_LABELS[s]}</span>
                <input
                  inputMode="decimal"
                  type="number"
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  placeholder={range.placeholder}
                  value={raw}
                  onChange={(e) => onChange({ ...value, scores: { ...value.scores, [s]: e.target.value } })}
                />
                {raw !== '' && value.test !== 'clb' && (
                  <em className={`clb-chip ${clb >= 9 ? 'hi' : clb >= 7 ? 'mid' : 'lo'}`}>
                    {clb ? `CLB ${clb}` : 'Below CLB 4'}
                  </em>
                )}
              </label>
            );
          })}
        </div>
      )}
      {value.test && value.test !== 'clb' && (
        <p className="fine">Scores convert to {testInfo(value.test).language === 'fr' ? 'NCLC' : 'CLB'} levels using IRCC's official equivalency charts.</p>
      )}
    </div>
  );
}
