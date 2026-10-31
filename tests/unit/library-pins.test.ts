// tests/unit/library-pins.test.ts — the pin cap is three for each kind and language (mw-5r3p30.894): a Hebrew lexicon is pinned beside three Greek ones, and the refusal names the language.
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { MAX_PINS, planImport, pinnedOf, setState, shelfOf } from '../../src/data/repositories';
import { entriesOf, entryOf, type CatalogueEntry } from '../../src/resources/catalogue';
import { pinRefusal } from '../../src/library/kinds';
import type { ExportRow } from '../../src/library/parseExport';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const GREEK = entriesOf('lexicon').filter((e) => e.lang === 'grc');
const HEBREW = entriesOf('lexicon').filter((e) => e.lang === 'he');
const BDB = entryOf('LLS:46.30.16')!;

const exportRow = (e: CatalogueEntry): ExportRow => ({ resource: e.resource, type: 'text.monograph.lexicon', abbreviated: '', title: e.title, series: '', languages: 'en', supersets: '' });

describe('the pin cap per kind and language', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear(), db.exportRows.clear(), db.meta.clear()]);
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: '[]' },
      { key: 'grammarBooks', value: '[]' },
      { key: 'works', value: '[]' },
      { key: 'devotionalDraw', value: 'none' },
    ]);
    await shelfOf();
  }, ASYNC_WAIT_MS);

  it('pins Enhanced BDB beside three pinned Greek lexicons, and refuses a fourth Greek one naming Greek', async () => {
    for (const e of GREEK.slice(0, MAX_PINS)) expect(await setState(e.resource, 'pinned')).toEqual({ ok: true });
    expect(await setState(BDB.resource, 'pinned')).toEqual({ ok: true });
    expect(await setState(GREEK[MAX_PINS].resource, 'pinned')).toEqual({ ok: false, reason: 'too-many-pins' });
    expect((await pinnedOf('lexicon')).map((r) => r.id)).toHaveLength(MAX_PINS + 1);
    expect(pinRefusal(GREEK[MAX_PINS])).toBe('Three Greek lexicons pinned already: unpin one first');
  });

  it('refuses a fourth Hebrew pin naming Hebrew, with Greek pins untouched', async () => {
    for (const e of HEBREW.slice(0, MAX_PINS)) expect(await setState(e.resource, 'pinned')).toEqual({ ok: true });
    expect(await setState(HEBREW[MAX_PINS].resource, 'pinned')).toEqual({ ok: false, reason: 'too-many-pins' });
    expect(await setState(GREEK[0].resource, 'pinned')).toEqual({ ok: true });
    expect(pinRefusal(HEBREW[MAX_PINS])).toBe('Three Hebrew lexicons pinned already: unpin one first');
  });

  it('keeps one cap for a kind with no language: the fourth grammar pin is refused in the old words', async () => {
    const grammars = entriesOf('grammar');
    for (const e of grammars.slice(0, MAX_PINS)) expect(await setState(e.resource, 'pinned')).toEqual({ ok: true });
    expect(await setState(grammars[MAX_PINS].resource, 'pinned')).toEqual({ ok: false, reason: 'too-many-pins' });
    expect(pinRefusal(grammars[MAX_PINS])).toBe('Three pinned already: unpin one first');
  });

  it('an import that starts more than three lexicons pinned pins up to three of each language', async () => {
    // the catalogue starts three pinned today (two Greek, BDB): make it five Greek and two Hebrew, as a later catalogue might
    const startsBefore = new Map([...GREEK, ...HEBREW].map((e) => [e, e.starts]));
    const starts = [...GREEK.slice(0, 5), ...HEBREW.slice(0, 2)];
    try {
      for (const e of [...GREEK, ...HEBREW]) e.starts = starts.includes(e) ? 'pinned' : 'on';
      const plan = await planImport([...GREEK, ...HEBREW].map(exportRow));
      const pinned = plan.turning.filter((t) => t.state === 'pinned');
      expect(pinned.filter((t) => t.entry.lang === 'grc').map((t) => t.entry.resource)).toEqual(GREEK.slice(0, MAX_PINS).map((e) => e.resource));
      expect(pinned.filter((t) => t.entry.lang === 'he').map((t) => t.entry.resource)).toEqual(HEBREW.slice(0, 2).map((e) => e.resource));
    } finally {
      for (const [e, was] of startsBefore) e.starts = was;
    }
  });
});
