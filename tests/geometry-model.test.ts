// Cross-layer contract: every zone the table offers is a bet the model accepts, and vice versa
// the model's rules reject nothing the table can produce. Lives in tests/ because it spans two layers.
import { describe, expect, it } from 'vitest';
import { buildTable } from '../src/geometry/buildTable';
import { Slip } from '../src/model/slip';

describe('geometry ↔ model', () => {
  const { zones } = buildTable();

  it('every one of the 154 zones is accepted by the slip and round-trips through toBets()', () => {
    const slip = new Slip();
    for (const zone of zones) {
      const r = slip.addChip({ type: zone.type, numbers: zone.numbers }, 1);
      expect(r, zone.id).toEqual({ ok: true, changed: true });
    }
    const ids = slip.toBets().map((b) => `${b.type}:${b.numbers.join('-')}`).sort();
    expect(ids).toEqual(zones.map((z) => z.id).sort());
  });
});
