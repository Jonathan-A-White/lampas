// features/steps/library-shelf.steps.tsx — runs features/library-shelf.feature: his shelf in the Dexie `library` table (src/data/repositories/library.ts), the old keys taken into rows
// on the first open, and the old readers answering from the rows.
import '@testing-library/react/dont-cleanup-after-each';
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import { DEVOTIONALS } from '../../src/data/daily/devotionals';
import { getGrammarBooks, getStudyResources, getWorks, setKind, setResourceOption, setState, shelfOf, type ShelfResult } from '../../src/data/repositories';
import { devotionalDraw, pinnedOf } from '../../src/data/repositories/library';
import { entriesOf } from '../../src/resources/catalogue';
import { GRAMMAR_BOOKS } from '../../src/resources/grammarBooks';
import { LEXICONS } from '../../src/resources/logos';
import { tickedOf } from '../../src/resources';
import { logos } from '../../src/resources/logos';
import { WORKS } from '../../src/resources/works';

afterAll(() => db.close());

const list = (text: string): string[] => text.split(',').map((s) => s.trim());
const lexicon = (id: string): string => LEXICONS.find((l) => l.id === id)?.resource ?? `no lexicon ${id}`;
const book = (id: string): string => GRAMMAR_BOOKS.find((b) => b.id === id)?.resource ?? `no book ${id}`;
const volumes = (id: string): string[] => WORKS.find((w) => w.id === id)?.volumes.map((v) => v.resource) ?? [];
const TWO = DEVOTIONALS.slice(2, 4).map((d) => d.id);

/** An empty phone: no settings, no shelf, and the shelf has taken nothing from the old keys yet. */
async function emptyPhone(): Promise<void> {
  await db.open();
  await Promise.all([db.settings.clear(), db.library.clear()]);
}

const rowsOf = async (kind?: Parameters<typeof shelfOf>[0]) => Object.fromEntries((await shelfOf(kind)).map((r) => [r.id, r.state]));
const ticked = async (): Promise<string[]> => tickedOf(logos, (await getStudyResources()).options.logos);

const feature = await loadFeature('features/library-shelf.feature');

describeFeature(feature, ({ Scenario }) => {
  const OLD =
    'the old keys hold the lexicons {string} ticked, the grammar books {string} ticked, the works {string} ticked and a draw of two devotionals';
  const seedOld = async (_: unknown, lexicons: string, books: string, works: string): Promise<void> => {
    await emptyPhone();
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: JSON.stringify(list(lexicons)) },
      { key: 'grammarBooks', value: JSON.stringify(list(books)) },
      { key: 'works', value: JSON.stringify(list(works)) },
      { key: 'devotionalDraw', value: TWO.join(',') },
    ]);
  };
  const opened = async (): Promise<void> => {
    await shelfOf();
  };

  Scenario('The first open makes rows from the old keys', ({ Given, When, Then, And }) => {
    Given(OLD, seedOld);
    When('the shelf is first opened', opened);
    Then('the library table has the lexicons {string} On, with {string} Pinned', async (_, ids: string, pinned: string) => {
      const rows = await rowsOf('lexicon');
      expect(rows).toEqual(Object.fromEntries(list(ids).map((id) => [lexicon(id), id === pinned ? 'pinned' : 'on'])));
    });
    And('the library table has the grammar book {string} Pinned and no row for {string}', async (_, id: string, gone: string) => {
      expect(await rowsOf('grammar')).toEqual({ [book(id)]: 'pinned' });
      expect(await db.library.get(gone)).toBeUndefined();
    });
    And('the library table has the volumes of the works {string} On', async (_, ids: string) => {
      const rows = await rowsOf('commentary');
      const expected = list(ids).flatMap(volumes);
      expect(expected.length).toBeGreaterThan(2);
      expect(rows).toEqual(Object.fromEntries(expected.map((r) => [r, 'on'])));
    });
    And('the library table has the two devotionals of the draw On', async () => {
      expect(await rowsOf('devotional')).toEqual(Object.fromEntries(TWO.map((id) => [id, 'on'])));
    });
  });

  Scenario('The old readers answer from the rows', ({ Given, When, Then, And }) => {
    let held: string | undefined;
    Given(OLD, seedOld);
    When('the shelf is first opened', opened);
    Then('the Logos lexicons ticked are {string}', async (_, ids: string) => expect(await ticked()).toEqual(list(ids)));
    And('getGrammarBooks answers {string}', async (_, ids: string) => expect(await getGrammarBooks()).toEqual(list(ids)));
    And('getWorks answers {string}', async (_, ids: string) => expect(await getWorks()).toEqual(list(ids)));
    And('the devotional draw is the two devotionals', async () => expect(await devotionalDraw()).toBe(TWO.join(',')));
    When('he ticks the lexicon {string} and unticks {string}', async (_, add: string, drop: string) => {
      held = (await db.settings.get('resourceOption.logos'))?.value;
      const next = (await ticked()).filter((id) => id !== drop);
      await setResourceOption('logos', JSON.stringify([...next, add]));
    });
    Then('the lexicons ticked now are {string}', async (_, ids: string) => expect(await ticked()).toEqual(list(ids)));
    And('the old key resourceOption.logos still holds what it held', async () => expect((await db.settings.get('resourceOption.logos'))?.value).toBe(held));
  });

  Scenario('A phone with no old keys starts with the books that start ticked', ({ Given, When, Then, And }) => {
    Given('the old keys hold nothing', emptyPhone);
    When('the shelf is first opened', opened);
    Then('the Logos lexicons ticked are {string}', async (_, ids: string) => expect(await ticked()).toEqual(list(ids)));
    And('getGrammarBooks answers {string}', async (_, ids: string) => expect(await getGrammarBooks()).toEqual(list(ids)));
    And('getWorks answers nothing', async () => expect(await getWorks()).toEqual([]));
    And('the devotional draw is every devotional', async () => expect(await devotionalDraw()).toBe('all'));
  });

  Scenario('All on and All off for a kind', ({ Given, When, Then, And }) => {
    Given('the old keys hold nothing', emptyPhone);
    When('he sets every lexicon On', async () => expect(await setKind('lexicon', 'on')).toEqual({ ok: true }));
    Then('every catalogue lexicon is On', async () => {
      const rows = await rowsOf('lexicon');
      expect(Object.keys(rows).sort()).toEqual(entriesOf('lexicon').map((e) => e.resource).sort());
    });
    And('the lexicon {string} is still Pinned', async (_, id: string) => expect((await rowsOf('lexicon'))[lexicon(id)]).toBe('pinned'));
    When('he sets every lexicon Off', async () => expect(await setKind('lexicon', 'off')).toEqual({ ok: true }));
    Then('no lexicon is on the shelf', async () => expect(await shelfOf('lexicon')).toEqual([]));
  });

  Scenario('A fourth pin in a kind is refused', ({ Given, When, Then }) => {
    let result: ShelfResult;
    Given('the old keys hold nothing', emptyPhone);
    When('he pins the lexicons {string}', async (_, ids: string) => {
      for (const id of list(ids)) expect(await setState(lexicon(id), 'pinned')).toEqual({ ok: true });
    });
    Then('the shelf pins {int} lexicons', async (_, n: number) => expect(await pinnedOf('lexicon')).toHaveLength(n));
    When('he pins the lexicon {string}', async (_, id: string) => {
      result = await setState(lexicon(id), 'pinned');
    });
    Then('the shelf refuses with {string} and still pins {int} lexicons', async (_, reason: string, n: number) => {
      expect(result).toEqual({ ok: false, reason });
      expect(await pinnedOf('lexicon')).toHaveLength(n);
    });
  });

  Scenario('Bibles hold one On', ({ Given, When, Then, And }) => {
    Given('the old keys hold nothing', emptyPhone);
    When('he sets the Bible {string} On', async (_, id: string) => expect(await setState(id, 'on')).toEqual({ ok: true }));
    And('he sets the Bible {string} On', async (_, id: string) => expect(await setState(id, 'on')).toEqual({ ok: true }));
    Then('the shelf holds the one Bible {string}', async (_, id: string) => expect(await rowsOf('bible')).toEqual({ [id]: 'on' }));
    And('setting every Bible On is refused with {string}', async (_, reason: string) => expect(await setKind('bible', 'on')).toEqual({ ok: false, reason }));
  });

  Scenario('A Devotional cannot be Pinned', ({ Given, When, Then }) => {
    let result: ShelfResult;
    Given('the old keys hold nothing', emptyPhone);
    When('he pins the devotional {string}', async (_, id: string) => {
      result = await setState(id, 'pinned');
    });
    Then('the shelf refuses with {string} and still pins {int} devotionals', async (_, reason: string, n: number) => {
      expect(result).toEqual({ ok: false, reason });
      expect(await pinnedOf('devotional')).toHaveLength(n);
    });
  });
});
