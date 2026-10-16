import type { Rules } from './calculate';
import { calculate } from './calculate';
import type { CrsResult, Profile, Section } from './types';

export interface LineDiff {
  label: string;
  before: number;
  after: number;
  hintBefore?: string;
  hintAfter?: string;
  /** Factor only exists under the new rules. */
  isNew: boolean;
}

export interface SectionDiff {
  id: Section['id'];
  title: string;
  before: number;
  after: number;
  maxAfter: number;
  lines: LineDiff[];
}

export interface RulesComparison {
  before: CrsResult;
  after: CrsResult;
  sections: SectionDiff[];
}

/**
 * Score a profile under the current grid and the Nov 3, 2026 grid, aligned line by line.
 * Rows follow the new grid's layout; each line's "before" value is found by label wherever it sat
 * in the old grid (e.g. Canadian work experience moved from Core into Labour market integration).
 */
export function compareRules(p: Profile, from: Rules = 'pre2026', to: Rules = 'nov2026'): RulesComparison {
  const before = calculate(p, from);
  const after = calculate(p, to);
  const oldLines = new Map(before.sections.flatMap((s) => s.lines.map((l) => [l.label, l] as const)));

  const sections = after.sections.map((s): SectionDiff => {
    const lines = s.lines.map((l): LineDiff => {
      const old = oldLines.get(l.label);
      return { label: l.label, before: old?.points ?? 0, after: l.points, hintBefore: old?.hint, hintAfter: l.hint, isNew: !old };
    });
    const oldSection = before.sections.find((x) => x.id === s.id);
    // Subtotals come from the aligned lines, except where the old grid capped the section.
    const capped = s.id === 'transferability' || s.id === 'additional';
    return {
      id: s.id,
      title: s.title,
      before: capped && oldSection ? oldSection.points : lines.reduce((a, l) => a + l.before, 0),
      after: s.points,
      maxAfter: s.max,
      lines,
    };
  });

  return { before, after, sections };
}
