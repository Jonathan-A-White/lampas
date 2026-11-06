// tests/unit/library-bible-marks.test.ts — the Library's Bibles page shows which part each Bible is set for, read from the three Settings keys and never from a shelf row
// (mw-5r3p30.1135, src/library/kinds.ts): the marks, the line the Bibles row reads, the states with the Bibles taken from Settings, and what choosing a part writes.
import 'fake-indexeddb/auto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getLogosBibles, planImport, setLogosBibleFor } from '../../src/data/repositories';
import { bibleLine, marksOf, partsFor, setBibleFor, withBibles } from '../../src/library/bibleParts';
import { booksOn, countLine, headerCount, infoOf } from '../../src/library/kinds';
import { DEFAULT_APOCRYPHA_BIBLE, DEFAULT_LOGOS_BIBLE } from '../../src/resources/logosBible';

const NKJV = 'LLS:1.0.30';
const ESV = 'LLS:1.0.710';
const LES = 'LLS:LELXX';
const LSB = DEFAULT_LOGOS_BIBLE;
const NRSV = DEFAULT_APOCRYPHA_BIBLE;
const bibles = { nt: NKJV, ot: LSB, apocrypha: NRSV };

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

describe('the marks of a Bible', () => {
  it('name each part it is set for, in the order Settings lists them', () => {
    expect(marksOf(NKJV, bibles)).toBe('NT');
    expect(marksOf(LSB, bibles)).toBe('OT');
    expect(marksOf(NRSV, bibles)).toBe('Apocrypha');
    expect(marksOf(ESV, bibles)).toBe('');
    expect(marksOf(LSB, { nt: LSB, ot: LSB, apocrypha: NRSV })).toBe('NT · OT');
  });

  it('change with Settings at once: the Bible a part moves to is marked and the one it left is not', () => {
    expect(marksOf(LSB, bibles)).toBe('OT');
    expect(marksOf(ESV, { ...bibles, ot: ESV })).toBe('OT');
    expect(marksOf(LSB, { ...bibles, ot: ESV })).toBe('');
  });
});

describe('the Bibles row and the page', () => {
  it('read the three parts, in one name when they agree', () => {
    expect(bibleLine(bibles)).toBe('NT NKJV · OT LSB · Apocrypha NRSV');
    expect(bibleLine({ nt: NRSV, ot: NRSV, apocrypha: NRSV })).toBe('NRSV for all three');
    expect(countLine('bible', new Map(), bibles)).toBe('NT NKJV · OT LSB · Apocrypha NRSV');
    expect(headerCount('bible', withBibles(new Map(), Object.values(bibles)))).toBe('3 in use');
  });

  it('take the Bibles from Settings, dropping what a shelf row of a Bible said', () => {
    const states = withBibles(new Map([[ESV, 'on' as const], ['LLS:46.30.24', 'on' as const]]), Object.values(bibles));
    expect(states.get(ESV)).toBeUndefined();
    expect(states.get(NKJV)).toBe('on');
    expect(states.get('LLS:46.30.24')).toBe('on');
  });

  it('do not count the Bibles among the books on: Settings always sets three', () => {
    expect(booksOn(withBibles(new Map(), Object.values(bibles)))).toBe(0);
    expect(infoOf('bible').steps).toBe('parts');
  });
});

describe('choosing a Bible asks which part', () => {
  it('offers only the parts the Bible holds', () => {
    expect(partsFor(ESV)).toEqual(['nt', 'ot']);
    expect(partsFor(LES)).toEqual(['ot', 'apocrypha']);
    expect(partsFor('LLS:MYOWNBIBLE.1')).toEqual(['nt', 'ot', 'apocrypha']);
  });

  it('writes only the part named', async () => {
    await setBibleFor('nt', NKJV);
    await setBibleFor('ot', LSB);
    await setBibleFor('ot', LES);
    expect(await getLogosBibles()).toEqual({ nt: NKJV, ot: LES, apocrypha: NRSV });
  });

  it('All three writes every part the Bible holds and leaves the rest', async () => {
    await setBibleFor('apocrypha', LES);
    await setBibleFor('all', ESV);
    expect(await getLogosBibles()).toEqual({ nt: ESV, ot: ESV, apocrypha: LES });
    await setBibleFor('all', NRSV);
    expect(await getLogosBibles()).toEqual({ nt: NRSV, ot: NRSV, apocrypha: NRSV });
  });
});

describe('an import and the Bibles he has set', () => {
  const row = (resource: string) => ({ resource, type: 'text.monograph.bible', abbreviated: '', title: resource, series: '', languages: 'en', supersets: '' });

  it('takes the first Bible he owns while none is set, and none once a part is set (the stale shelf mark gone changes nothing)', async () => {
    await db.library.clear();
    await db.meta.clear();
    expect((await planImport([row(LSB)])).turning.map((t) => t.entry.resource)).toEqual([LSB]);
    await setLogosBibleFor('nt', NKJV);
    expect((await planImport([row(LSB)])).turning).toEqual([]);
  });
});
