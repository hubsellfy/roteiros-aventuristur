import { describe, expect, it } from 'vitest';
import { pickVisibleLabels } from './poiLabelLayout';

describe('pickVisibleLabels', () => {
  it('FE-COMP-POILABEL-001: keeps isolated names', () => {
    const v = pickVisibleLabels([
      { id: 1, name: 'Padaria Sol', x: 50, y: 300 },
      { id: 2, name: 'Cafe Lua', x: 400, y: 300 },
    ]);
    expect([...v]).toEqual([1, 2]);
  });

  it('FE-COMP-POILABEL-002: hides names that would overlap, keeping the first', () => {
    const v = pickVisibleLabels([
      { id: 1, name: 'Padaria Sol', x: 100, y: 300 },
      { id: 2, name: 'Padaria Lua', x: 110, y: 330 },
    ]);
    expect([...v]).toEqual([1]);
  });

  it('FE-COMP-POILABEL-003: hides a name that would cover another pin', () => {
    const v = pickVisibleLabels([
      { id: 1, name: 'Restaurante Grande Nome', x: 100, y: 300 },
      { id: 2, name: 'X', x: 100, y: 280 },
    ]);
    expect(v.has(1)).toBe(false);
  });

  it('FE-COMP-POILABEL-004: returns empty for no pins', () => {
    expect(pickVisibleLabels([]).size).toBe(0);
  });
});
