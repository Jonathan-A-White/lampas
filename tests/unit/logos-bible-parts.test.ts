// A default Logos Bible for each part of the canon (mw-5r3p30.841): the New Testament, the Old Testament and the Apocrypha each open in a Bible of their own.
// Until he picks one, the Old Testament follows the one Bible he had (the New Testament's row, `logosBible`), so nothing changes; the Apocrypha starts in his NRSV (mw-5r3p30.889), as a Bible with none would open nothing.
import 'fake-indexeddb/auto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { dropStaleBibleRows, getLogosBible, getLogosBibles, setLogosBible, setLogosBibleFor, shelfOf } from '../../src/data/repositories';
import { DEFAULT_APOCRYPHA_BIBLE, DEFAULT_LOGOS_BIBLE, bibleFor, bibleRef, partOf, verseLink } from '../../src/resources/logosBible';
import { verseChips } from '../../src/resources/tutorLinks';
import { placeOf } from '../../src/resources/tutorLinks';

const ESV = 'LLS:1.0.710';
const NASB = 'LLS:NASB95';
const KJV = 'LLS:KJV';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

describe('the part of a book', () => {
  it('is the New Testament for its 27 books, the Old Testament for the 39, the Apocrypha for its own', () => {
    expect(partOf('rom')).toBe('nt');
    expect(partOf('rev')).toBe('nt');
    expect(partOf('dan')).toBe('ot');
    expect(partOf('psa')).toBe('ot');
    expect(partOf('tob')).toBe('apocrypha');
    expect(partOf('sir')).toBe('apocrypha');
    expect(partOf('1ma')).toBe('apocrypha');
  });

  it('picks the Bible of that part', () => {
    const bibles = { nt: DEFAULT_LOGOS_BIBLE, ot: NASB, apocrypha: KJV };
    expect(bibleFor('rom', bibles)).toBe(DEFAULT_LOGOS_BIBLE);
    expect(bibleFor('dan', bibles)).toBe(NASB);
    expect(bibleFor('wis', bibles)).toBe(KJV);
  });

  it('has a Logos reference for an Apocrypha book', () => {
    expect(bibleRef('tob', 3, 1)).toBe('Bible.Tob3.1');
    expect(bibleRef('1ma', 2)).toBe('Bible.1Ma2');
  });
});

describe('Open in Logos on a reference', () => {
  const bibles = { nt: DEFAULT_LOGOS_BIBLE, ot: NASB, apocrypha: KJV };
  const resources = { on: ['logos'], options: {} };

  it('opens a New Testament reference in the New Testament Bible', () => {
    const place = placeOf('Romans 8:31')!;
    const [chip] = verseChips(place, place.name, resources, bibleFor(place.book, bibles));
    expect(chip.url).toBe('logosres:lgcystndrdbblsb;ref=Bible.Ro8.31');
  });

  it('opens an Old Testament reference in the Old Testament Bible', () => {
    const place = placeOf('Daniel 2:28')!;
    const [chip] = verseChips(place, place.name, resources, bibleFor(place.book, bibles));
    expect(chip.url).toBe('logosres:nasb95;ref=Bible.Da2.28');
  });

  it('opens an Apocrypha reference in the Apocrypha Bible', () => {
    expect(verseLink('tob', 3, 1, bibleFor('tob', bibles))?.url).toBe('logosres:kjv;ref=Bible.Tob3.1');
  });
});

describe('the three Bibles he keeps', () => {
  it('are the default Bibles while he has chosen none: the Legacy Standard Bible, and the NRSV for the Apocrypha', async () => {
    expect(await getLogosBibles()).toEqual({ nt: DEFAULT_LOGOS_BIBLE, ot: DEFAULT_LOGOS_BIBLE, apocrypha: DEFAULT_APOCRYPHA_BIBLE });
  });

  it('follow the one Bible he had (the logosBible setting) until each is picked, the Apocrypha excepted', async () => {
    await db.settings.put({ key: 'logosBible', value: NASB });
    expect(await getLogosBibles()).toEqual({ nt: NASB, ot: NASB, apocrypha: DEFAULT_APOCRYPHA_BIBLE });
    expect(await getLogosBible()).toBe(NASB);
  });

  it('keep one part picked apart from the others, and survive a reload (the store is read again)', async () => {
    await db.settings.put({ key: 'logosBible', value: NASB });
    await setLogosBibleFor('ot', ESV);
    expect(await getLogosBibles()).toEqual({ nt: NASB, ot: ESV, apocrypha: DEFAULT_APOCRYPHA_BIBLE });
    expect(await getLogosBible('ot')).toBe(ESV);
    // picking the New Testament does not move a part that was following it
    await setLogosBibleFor('nt', KJV);
    expect(await getLogosBibles()).toEqual({ nt: KJV, ot: ESV, apocrypha: DEFAULT_APOCRYPHA_BIBLE });
    db.close();
    await db.open();
    expect(await getLogosBibles()).toEqual({ nt: KJV, ot: ESV, apocrypha: DEFAULT_APOCRYPHA_BIBLE });
  });

  it('are set together by setLogosBible (the Library chooses one Bible; the Apocrypha keeps to a Bible that has one), and a malformed saved one is the default', async () => {
    await setLogosBible(ESV);
    expect(await getLogosBibles()).toEqual({ nt: ESV, ot: ESV, apocrypha: DEFAULT_APOCRYPHA_BIBLE });
    await db.settings.put({ key: 'logosBibleOt', value: 'nonsense' });
    expect((await getLogosBibles()).ot).toBe(ESV);
  });
});

// the Library's Bibles page once kept its own "Chosen" mark on the shelf, apart from the three Settings keys (mw-5r3p30.1135); the marks are now read from the keys and the stale ones go
describe('the stale Chosen mark of the shelf', () => {
  const NKJV = 'LLS:1.0.30';
  const LES = 'LLS:LELXX';
  const LSB = DEFAULT_LOGOS_BIBLE;

  beforeEach(async () => {
    await db.library.clear();
  });

  it('is dropped when no part is set to that Bible, and the three part choices are unchanged', async () => {
    await setLogosBibleFor('nt', NKJV);
    await setLogosBibleFor('ot', LSB);
    await setLogosBibleFor('apocrypha', DEFAULT_APOCRYPHA_BIBLE);
    // the Library had marked LES Chosen, a Bible no part is set to
    await db.library.put({ id: LES, kind: 'bible', state: 'on', since: 1 });
    const before = await getLogosBibles();
    expect(await dropStaleBibleRows()).toBe(1);
    expect((await shelfOf('bible')).map((r) => r.id)).toEqual([]);
    expect(await getLogosBibles()).toEqual(before);
    expect(before).toEqual({ nt: NKJV, ot: LSB, apocrypha: DEFAULT_APOCRYPHA_BIBLE });
  });

  it('is kept when a part is set to that Bible, and nothing else on the shelf is touched', async () => {
    await setLogosBibleFor('ot', LES);
    await db.library.bulkPut([
      { id: LES, kind: 'bible', state: 'on', since: 1 },
      { id: 'LLS:46.30.24', kind: 'lexicon', state: 'on', since: 1 },
    ]);
    expect(await dropStaleBibleRows()).toBe(0);
    expect(await db.library.get(LES)).toBeDefined();
    expect(await db.library.get('LLS:46.30.24')).toBeDefined();
  });

  it('reads the default Bibles as set (a phone that never opened Settings), so a row for one of them stays', async () => {
    await db.library.put({ id: LSB, kind: 'bible', state: 'on', since: 1 });
    expect(await dropStaleBibleRows()).toBe(0);
  });
});
