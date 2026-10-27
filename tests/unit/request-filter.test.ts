// Your requests' status filter (mw-5r3p30.795): every status the kit knows lands under a chip by a named rule, and one it does not know shows under All only.
import { describe, expect, it } from 'vitest';
import { REQUEST_STATUSES } from 'pwa-kit/requests';
import { FILTERS, filterOf, STATUS_FILTER } from '../../src/data/requestFilter';

describe('the status filter of Your requests', () => {
  it('maps every status of the kit to a chip', () => {
    const chips = FILTERS.map(([value]) => value);
    for (const status of REQUEST_STATUSES) {
      const chip = filterOf(status);
      expect(chip, `status ${status} has no chip`).toBeDefined();
      expect(chips).toContain(chip);
    }
    expect(Object.keys(STATUS_FILTER).sort()).toEqual([...REQUEST_STATUSES].sort());
  });

  it('puts sent, filed, building and moved under Waiting, landed, adopted-as-setting and built-differently under Adopted, declined under Declined', () => {
    expect(['sent', 'filed', 'building', 'moved'].map(filterOf)).toEqual(['waiting', 'waiting', 'waiting', 'waiting']);
    expect(['landed', 'adopted-as-setting', 'built-differently'].map(filterOf)).toEqual(['adopted', 'adopted', 'adopted']);
    expect(filterOf('declined')).toBe('declined');
  });

  it('gives a status nobody mapped no chip but All', () => {
    expect(filterOf('postponed')).toBeUndefined();
  });

  it('offers All, Waiting, Adopted, Declined in that order', () => {
    expect(FILTERS.map(([, label]) => label)).toEqual(['All', 'Waiting', 'Adopted', 'Declined']);
  });
});
