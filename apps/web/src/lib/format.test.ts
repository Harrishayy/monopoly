import { describe, expect, it } from 'vitest';
import { ago, duration, money } from './format';

describe('format', () => {
  it('money formats pence', () => expect(money(42000)).toBe('£420.00'));
  it('duration picks a unit', () => {
    expect(duration(820)).toBe('820ms');
    expect(duration(12_400)).toBe('12.4s');
    expect(duration(372_000)).toBe('6m 12s');
  });
  it('ago is relative to now', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    expect(ago('2026-10-10T11:59:50Z', now)).toBe('now');
    expect(ago('2026-10-10T10:00:00Z', now)).toBe('2h');
    expect(ago('2026-10-07T12:00:00Z', now)).toBe('3d');
  });
});
