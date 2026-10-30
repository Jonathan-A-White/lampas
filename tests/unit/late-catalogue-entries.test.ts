// tests/unit/late-catalogue-entries.test.ts — a book the catalogue lists after a phone imported his Logos list is matched against that import at the next start (mw-5r3p30.888):
// it goes On, and Pinned when the catalogue says it starts so, unless he set that book himself; the Hebrew word sheet then shows Enhanced BDB.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { afterCatalogueUpdate, getLogosBible, getStudyResources, importNote, lexiconTicks, MAX_PINS, shelfOf, stateOf } from '../../src/data/repositories';
import { CATALOGUE_VERSION, KINDS, entriesOf, entryOf } from '../../src/resources/catalogue';
import { logosStudy } from '../../src/resources/logos';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;
const BDB = 'LLS:46.30.16';
const HEBREW = entriesOf('lexicon').filter((e) => e.lang === 'he');

/** a row of his kept list as an import under the older catalogue kept it */
const kept = (resource: string, matched: boolean) => {
  const e = entryOf(resource);
  return { resource, type: 'text.monograph.lexicon', title: e?.title ?? resource, series: '', languages: 'en', refs: '', matched };
};

describe('a book the catalogue lists after his import', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear(), db.exportRows.clear(), db.meta.clear()]);
    // the old keys, taken first, as on a phone that has been open since the shelf came
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: '[]' },
      { key: 'grammarBooks', value: '[]' },
      { key: 'works', value: '[]' },
      { key: 'devotionalDraw', value: 'none' },
      { key: 'resource.logos', value: 'on' },
    ]);
    await shelfOf();
    await vi.waitFor(async () => expect(await db.library.get('#taken')).toBeDefined(), { timeout });
  });

  /** his phone as it stood when the Hebrew lexicons were not in the catalogue: BDAG pinned, the Strong's dictionaries On, the list kept without the Hebrew ones, matched under an older version */
  async function phoneFromBefore(): Promise<void> {
    const old = entriesOf('lexicon').filter((e) => e.lang !== 'he');
    await db.library.bulkPut(['LLS:46.30.18', 'LLS:46.10.6', 'LLS:46.10.12', 'LLS:STRNGDICHEBGRK'].map((id, i) => ({ id, kind: 'lexicon' as const, state: i === 0 ? ('pinned' as const) : ('on' as const), since: 1 })));
    await db.exportRows.bulkPut([...old.map((e) => kept(e.resource, true)), ...HEBREW.map((e) => kept(e.resource, false))]);
    await db.meta.put({ key: 'libraryImport', value: JSON.stringify({ at: Date.UTC(2026, 9, 20), books: 40, matched: old.length, newSince: 0, version: `${CATALOGUE_VERSION}-older` }) });
  }

  it('turns the Hebrew lexicons On at the next start and Pins Enhanced BDB, and a Hebrew word sheet then shows it', async () => {
    await phoneFromBefore();
    await afterCatalogueUpdate();
    expect(await stateOf(BDB)).toBe('pinned');
    for (const e of HEBREW) expect(await stateOf(e.resource), e.title).toBe(e.starts === 'pinned' ? 'pinned' : 'on');
    expect((await importNote())?.version).toBe(CATALOGUE_VERSION);
    const study = await getStudyResources();
    const word = { form: 'הָאָרֶץ', lemma: 'אֶרֶץ', strongs: 'H776', topic: undefined, ref: undefined };
    const shown = logosStudy(word, await lexiconTicks(), study.pinnedLexicons ?? []);
    expect(shown.links.map((l) => l.tile)).toContain('BDB');
    expect(shown.door?.count).toBe(HEBREW.length + 3);
  });

  it("never undoes his own Off or Unpin of a book that came late", async () => {
    await phoneFromBefore();
    await afterCatalogueUpdate();
    // he turns Gesenius Off and takes BDB off its pin; a later catalogue change must not turn either back
    await db.library.delete('LLS:46.30.24');
    await db.library.put({ id: BDB, kind: 'lexicon', state: 'on', since: 2 });
    await db.meta.put({ key: 'libraryImport', value: JSON.stringify({ ...(await importNote()), version: `${CATALOGUE_VERSION}-older` }) });
    await afterCatalogueUpdate();
    expect(await stateOf('LLS:46.30.24')).toBe('off');
    expect(await stateOf(BDB)).toBe('on');
  });

  it('adds nothing for a phone with no list kept', async () => {
    await afterCatalogueUpdate();
    expect(await db.library.count()).toBe(1);
  });

  // the sweep (mw-5r3p30.888): every kind is matched by the one function, so a late entry of any kind is handled as a lexicon is
  describe.each(KINDS.filter((k) => k !== 'greek-text' && k !== 'interlinear'))('a late %s', (kind) => {
    it('is turned On, or Pinned where the catalogue says it starts so, and a Bible only while he has none', async () => {
      const entries = entriesOf(kind);
      await db.exportRows.bulkPut(entries.map((e) => kept(e.resource, false)));
      await db.meta.put({ key: 'libraryImport', value: JSON.stringify({ at: 1, books: entries.length, matched: 0, newSince: 0, version: `${CATALOGUE_VERSION}-older` }) });
      await afterCatalogueUpdate();
      const rows = new Map((await shelfOf(kind)).map((r) => [r.id, r.state]));
      if (kind === 'bible') {
        expect([...rows.keys()]).toEqual([entries[0].resource]);
        expect(await getLogosBible()).toBe(entries[0].resource);
        return;
      }
      expect(rows.size).toBe(entries.length);
      let pins = 0;
      for (const e of entries) {
        const pinned = e.starts === 'pinned' && kind !== 'devotional' && pins < MAX_PINS;
        if (pinned) pins += 1;
        expect(rows.get(e.resource), e.title).toBe(pinned ? 'pinned' : 'on');
      }
    });
  });
});
