import { describe, expect, it } from 'vitest';
import { HIGH_WAGE_OCCUPATIONS, occupationByNoc, searchOccupations } from './highWage';

describe('high-wage occupation list', () => {
  it('matches IRCC tier counts', () => {
    const count = (t: string) => HIGH_WAGE_OCCUPATIONS.filter((o) => o.tier === t).length;
    expect([count('2x'), count('1.5x'), count('1.3x')]).toEqual([31, 89, 66]);
    expect(new Set(HIGH_WAGE_OCCUPATIONS.map((o) => o.noc)).size).toBe(186);
  });
  it('looks up by NOC and title', () => {
    expect(occupationByNoc('21231')?.tier).toBe('1.5x');
    expect(occupationByNoc('41101')?.tier).toBe('2x');
    expect(occupationByNoc('21234')?.tier).toBe('1.3x');
    expect(occupationByNoc('64100')).toBeUndefined();
    expect(searchOccupations('software').map((o) => o.noc)).toEqual(['21231', '21232', '21311']);
    expect(searchOccupations('2123').length).toBe(4);
  });
});
