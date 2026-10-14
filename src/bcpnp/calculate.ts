import { clbLevels, isComplete } from '../crs/language';
import type { LanguageResult } from '../crs/types';
import type { BcArea, BcEducation, BcLine, BcProfile, BcResult, BcSection } from './types';

/*
 * BC PNP Skills Immigration Registration System (SIRS) — 200 points.
 * Source: Skills Immigration Program Guide, Part 8 "Registration Scoring Factors" (effective June 10, 2026).
 *   Human capital (120): directly related experience 40, education 40, language 40.
 *   Economic (80): hourly wage 55, area of employment 25.
 */
export const BC_MAX = 200;
export const PROGRAM_GUIDE = 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf';

export const EXPERIENCE_POINTS: { years: number; label: string; points: number }[] = [
  { years: 5, label: '5+ years', points: 20 },
  { years: 4, label: '4 to under 5 years', points: 16 },
  { years: 3, label: '3 to under 4 years', points: 12 },
  { years: 2, label: '2 to under 3 years', points: 8 },
  { years: 1, label: '1 to under 2 years', points: 4 },
  { years: 0.5, label: 'Under 1 year', points: 1 },
  { years: 0, label: 'None', points: 0 },
];

export const BC_EDUCATION: Record<BcEducation, { label: string; points: number; postSecondary: boolean }> = {
  doctoral: { label: 'Doctoral degree', points: 27, postSecondary: true },
  masters: { label: "Master's degree", points: 22, postSecondary: true },
  postGrad: { label: 'Post-graduate certificate or diploma', points: 15, postSecondary: true },
  bachelors: { label: "Bachelor's degree", points: 15, postSecondary: true },
  associate: { label: 'Associate degree', points: 5, postSecondary: true },
  diploma: { label: 'Post-secondary diploma or certificate', points: 5, postSecondary: true },
  secondary: { label: 'High school or less', points: 0, postSecondary: false },
};

export const AREA_INFO: Record<BcArea, { label: string; detail: string; points: number }> = {
  1: { label: 'Area 1', detail: 'Metro Vancouver Regional District', points: 0 },
  2: { label: 'Area 2', detail: 'Squamish, Abbotsford, Agassiz, Mission, Chilliwack', points: 5 },
  3: { label: 'Area 3', detail: 'Everywhere else in B.C.', points: 15 },
};

/** Points for the lowest CLB across the four abilities on one test. */
export function clbPoints(clb: number) {
  if (clb >= 9) return 30;
  if (clb < 4) return 0;
  return (clb - 3) * 5; // 4→5, 5→10, 6→15, 7→20, 8→25
}

/** Lowest CLB across the four abilities, or 0 when the test isn't fully entered. */
export function lowestClb(result: LanguageResult) {
  if (!isComplete(result)) return 0;
  return Math.min(...Object.values(clbLevels(result)));
}

/** One point per whole dollar from $16/hr, capped at 55 ($70/hr and up). */
export function wagePoints(hourly: number | null) {
  if (hourly == null || !Number.isFinite(hourly)) return 0;
  return Math.max(0, Math.min(55, Math.floor(hourly) - 15));
}

export function experiencePoints(years: number | null) {
  if (years == null) return 0;
  return EXPERIENCE_POINTS.find((e) => years >= e.years)?.points ?? 0;
}

const sum = (lines: BcLine[]) => lines.reduce((n, l) => n + l.points, 0);
const money = (n: number) => `$${n.toLocaleString('en-CA', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function section(id: BcSection['id'], group: BcSection['group'], title: string, max: number, lines: BcLine[]): BcSection {
  return { id, group, title, max, lines, points: Math.min(max, sum(lines)) };
}

export function calculateBc(p: BcProfile): BcResult {
  const exp = experiencePoints(p.experience);
  const experience = section('experience', 'human', 'Work experience', 40, [
    {
      label: 'Directly related experience',
      points: exp,
      max: 20,
      hint: p.experience == null ? 'Not answered' : `${EXPERIENCE_POINTS.find((e) => p.experience! >= e.years)!.label} in the job offer's occupation`,
    },
    {
      label: 'Canadian experience',
      points: p.canadianExperience ? 10 : 0,
      max: 10,
      hint: '1+ year of directly related work in Canada',
    },
    {
      label: 'Working for the employer now',
      points: p.workingForEmployer ? 10 : 0,
      max: 10,
      hint: 'Full-time in B.C., same employer and occupation',
    },
  ]);

  const edu = p.education ? BC_EDUCATION[p.education] : null;
  const locationBonus = edu?.postSecondary ? (p.educationLocation === 'bc' ? 8 : p.educationLocation === 'canada' ? 6 : 0) : 0;
  const education = section('education', 'human', 'Education', 40, [
    { label: 'Highest education', points: edu?.points ?? 0, max: 27, hint: edu?.label ?? 'Not answered' },
    {
      label: 'Studied in B.C. or Canada',
      points: locationBonus,
      max: 8,
      hint: locationBonus === 8 ? 'Completed at a B.C. post-secondary institution' : locationBonus === 6 ? 'Completed in Canada, outside B.C.' : 'Highest credential completed in B.C. (+8) or elsewhere in Canada (+6)',
    },
    { label: 'Professional designation', points: p.designation ? 5 : 0, max: 5, hint: 'Valid B.C. designation for the job offer\'s occupation' },
  ]);

  const en = lowestClb(p.english);
  const fr = lowestClb(p.french);
  const enPts = clbPoints(en);
  const frPts = clbPoints(fr);
  const bilingual = en >= 4 && fr >= 4;
  const useFrench = frPts > enPts;
  const language = section('language', 'human', 'Language', 40, [
    {
      label: useFrench ? 'French proficiency' : 'English proficiency',
      points: Math.max(enPts, frPts),
      max: 30,
      hint: !en && !fr ? 'No complete test entered' : `Lowest ability: ${useFrench ? `NCLC ${fr}` : `CLB ${en}`}${en && fr ? ' (higher-scoring test counts)' : ''}`,
    },
    { label: 'English and French', points: bilingual ? 10 : 0, max: 10, hint: 'CLB/NCLC 4+ in all four abilities on both tests' },
  ]);

  const wpts = wagePoints(p.hourlyWage);
  const wage = section('wage', 'economic', 'Wage', 55, [
    {
      label: 'Hourly wage of job offer',
      points: wpts,
      max: 55,
      hint: p.hourlyWage == null ? 'Not answered' : wpts === 55 ? `${money(p.hourlyWage)}/hr — $70/hr or more earns the maximum` : `${money(p.hourlyWage)}/hr — 1 point per dollar from $16`,
    },
  ]);

  const regional = p.regionalExperience || p.regionalAlumni;
  const area = section('area', 'economic', 'Area of employment', 25, [
    {
      label: 'Location of the job',
      points: p.area ? AREA_INFO[p.area].points : 0,
      max: 15,
      hint: p.area ? `${AREA_INFO[p.area].label}: ${AREA_INFO[p.area].detail}` : 'Not answered',
    },
    {
      label: 'Regional experience or alumni',
      points: regional ? 10 : 0,
      max: 10,
      hint: p.regionalExperience ? 'Worked outside Metro Vancouver' : p.regionalAlumni ? 'Graduated outside Metro Vancouver' : 'Work or study outside Metro Vancouver',
    },
  ]);

  const sections = [experience, education, language, wage, area];
  const human = experience.points + education.points + language.points;
  const economic = wage.points + area.points;
  return { total: human + economic, human, economic, sections };
}
