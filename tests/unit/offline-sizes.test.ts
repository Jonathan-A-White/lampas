import { describe, expect, it } from 'vitest';
import { measure, TOLERANCE } from '../../scripts/offline-sizes';
import { lxxBytes, scopeBytes } from '../../src/data/offlineSizes';
import { offlineChoices, megabytes } from '../../src/settings/offlineCopyState';

// The megabytes on the Keep on this phone chips (mw-lcv9z3g.6) must stay true. The New Testament's and the Hebrew Old Testament's are measured here over the committed files (public/ is what
// `npm run build` copies into dist/): a change to the data that moves one more than 10% fails this test. The Septuagint is written at deploy, so its chip is an estimate from the index
// (lxxBytes), held to a real `npm run lxx:ship` below and checked on each deploy by `npm run offline:sizes` (docs/data.md 'The offline copy').

describe('the megabytes on the Keep on this phone chips', () => {
  it('New Testament and Old Testament: Hebrew are within 10% of the bytes their files hold', () => {
    const rows = measure('public');
    expect(rows.map((r) => r.scope)).toEqual(['hbo', 'nt']);
    for (const row of rows) {
      expect(row.missing, `${row.scope} has files missing`).toEqual([]);
      expect(Math.abs(row.shown - row.real) / row.real, `${row.scope}: chip ${row.shown}, real ${row.real}`).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it('the Septuagint estimate is within 10% of a real ship (2026-11-09: 198 chapters of six books)', () => {
    // verses of the shipped chapters by book, and the bytes the ship wrote (chapters 9,707,375, lexicon-grc-lxx.json 812,403, index.json 8,031)
    const shipped = { gen: 725, exo: 467, lev: 240, num: 49, psa: 1652, isa: 510 };
    const index = { books: Object.entries(shipped).map(([code, verses]) => ({ code, name: code, chapters: 1, verses: [verses], fingerprints: ['0123456789ab'] })) };
    const real = 9_707_375 + 812_403 + 8_031;
    expect(Math.abs(lxxBytes(index) - real) / real).toBeLessThanOrEqual(TOLERANCE);
    const shown = Number(megabytes(scopeBytes('lxx', index)!).replace(' MB', '')) * 1e6;
    expect(Math.abs(shown - real) / real).toBeLessThanOrEqual(TOLERANCE);
  });

  it('All is the sum of the other three', () => {
    const index = { books: [{ code: 'gen', name: 'Genesis', chapters: 1, verses: [31], fingerprints: ['0123456789ab'] }] };
    expect(scopeBytes('all', index)).toBe(scopeBytes('hbo', index)! + scopeBytes('lxx', index)! + scopeBytes('nt', index)!);
  });

  it('a Septuagint that is not known yet shows no megabytes on its chip or All\'s, and never a wrong one', () => {
    expect(offlineChoices(null).map(([, label]) => label)).toEqual(['Nothing extra', 'Old Testament: Hebrew (77 MB)', 'Old Testament: Septuagint', 'New Testament (36 MB)', 'All']);
    const index = { books: [{ code: 'gen', name: 'Genesis', chapters: 1, verses: [31], fingerprints: ['0123456789ab'] }] };
    expect(offlineChoices(index).map(([, label]) => label)).toEqual(['Nothing extra', 'Old Testament: Hebrew (77 MB)', 'Old Testament: Septuagint (0.9 MB)', 'New Testament (36 MB)', 'All (114 MB)']);
  });
});
