// A Logos devotional for a date (mw-1fwagb.2): the calendar devotionals are filed by the DayOfYear data type, so the link is
// logosres:<id>;ref=DayOfYear.<Mon>_<D> with a ref.ly fallback that writes the space as '+'. UNVERIFIED on a device (docs/resources.md).
import { describe, expect, it } from 'vitest';
import { devotionalLink } from '../../src/resources/logosDevotional';

describe('devotionalLink', () => {
  it('opens the devotional at Oct 19 in the scheme first and the ref.ly address as the fallback', () => {
    expect(devotionalLink('iv-tdg', new Date(2026, 9, 19))).toEqual({
      url: 'logosres:iv-tdg;ref=DayOfYear.Oct_19',
      fallback: 'https://ref.ly/logosres/iv-tdg?ref=DayOfYear.Oct+19',
    });
  });

  it('writes Jan 1 with a three-letter month and no leading zero', () => {
    const link = devotionalLink('iv-tdg', new Date(2027, 0, 1));
    expect(link.url).toBe('logosres:iv-tdg;ref=DayOfYear.Jan_1');
    expect(link.fallback).toBe('https://ref.ly/logosres/iv-tdg?ref=DayOfYear.Jan+1');
  });

  it('writes Dec 31', () => {
    const link = devotionalLink('iv-tdg', new Date(2026, 11, 31));
    expect(link.url).toBe('logosres:iv-tdg;ref=DayOfYear.Dec_31');
    expect(link.fallback).toBe('https://ref.ly/logosres/iv-tdg?ref=DayOfYear.Dec+31');
  });

  it('reads the date as the local day, not UTC', () => {
    expect(devotionalLink('iv-tdg', new Date(2026, 9, 19, 23, 59)).url).toBe('logosres:iv-tdg;ref=DayOfYear.Oct_19');
    expect(devotionalLink('iv-tdg', new Date(2026, 9, 19, 0, 0)).url).toBe('logosres:iv-tdg;ref=DayOfYear.Oct_19');
  });

  it('passes the resource id the way the lexicon links do: raw in the scheme, URI-encoded in the https address', () => {
    expect(devotionalLink('LLS:46.30.18', new Date(2026, 9, 19))).toEqual({
      url: 'logosres:LLS:46.30.18;ref=DayOfYear.Oct_19',
      fallback: 'https://ref.ly/logosres/LLS%3A46.30.18?ref=DayOfYear.Oct+19',
    });
  });
});
