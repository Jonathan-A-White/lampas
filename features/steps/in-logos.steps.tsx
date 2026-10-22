// features/steps/in-logos.steps.tsx — runs features/in-logos.feature: the chooser behind "In another book…" (src/library/InLogosChooser.tsx) and the two doors of a verse (src/library/InLogosDoors.tsx),
// over a small catalogue of its own (the real one holds one commentary on Romans) and the Dexie shelf.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import { setResourceOn, shelfOf } from '../../src/data/repositories';
import { InLogosChooser } from '../../src/library/InLogosChooser';
import { InLogosDoors } from '../../src/library/InLogosDoors';
import type { CatalogueEntry, Kind } from '../../src/resources/catalogue';
import type { StudyPlace } from '../../src/resources/types';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

const entry = (kind: Kind, short: string, covers?: string[]): CatalogueEntry => ({
  resource: `LLS:${short.toUpperCase().replace(/\W+/g, '')}`,
  kind,
  title: short,
  short,
  lang: 'en',
  opens: kind === 'bible' ? 'chapter' : 'verse',
  value: 'a test book',
  ...(covers ? { covers } : {}),
  via: 'id',
});

/** Five commentaries on Romans, one on John, four Greek texts, two interlinears (one on Psalms as well), two Bibles and three lexicons. */
const BOOKS: readonly CatalogueEntry[] = [
  ...[1, 2, 3, 4, 5].map((n) => entry('commentary', `Commentary on Romans ${n}`, ['rom'])),
  entry('commentary', 'Commentary on John 1', ['jhn']),
  ...[1, 2, 3, 4].map((n) => entry('greek-text', `Greek text ${n}`)),
  ...[1, 2].map((n) => entry('interlinear', `Interlinear ${n}`, ['rom', 'jhn', 'psa'])),
  ...[1, 2].map((n) => entry('bible', `Bible ${n}`)),
  ...[1, 2, 3].map((n) => entry('lexicon', `Lexicon ${n}`)),
];
const book = (short: string): CatalogueEntry => {
  const found = BOOKS.find((e) => e.short === short);
  if (!found) throw new Error(`no test book ${short}`);
  return found;
};

const PLACES: Record<string, { place: StudyPlace; name: string }> = {
  'Romans 8:31': { place: { book: 'rom', chapter: 8, verse: 31 }, name: 'Romans 8:31' },
  'John 3:16': { place: { book: 'jhn', chapter: 3, verse: 16 }, name: 'John 3:16' },
  'Psalm 23:1': { place: { book: 'psa', chapter: 23, verse: 1 }, name: 'Psalms 23:1' },
};
const placeOf = (text: string) => PLACES[text] ?? expect.unreachable(`no place ${text}`);

/** A phone whose old keys say nothing is ticked (so the shelf takes nothing from them), then the rows put on it and Logos switched. */
async function shelf(rows: readonly (readonly [CatalogueEntry, 'on' | 'pinned'])[], logos = true): Promise<void> {
  cleanup();
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
  await shelfOf();
  await db.library.bulkPut(rows.map(([e, state]) => ({ id: e.resource, kind: e.kind, state, since: 1 })));
  await setResourceOn('logos', logos);
}

const everything = (pinned?: string) => shelf(BOOKS.map((e) => [e, e.short === pinned ? 'pinned' : 'on'] as const).filter(([e]) => e.kind !== 'bible' && e.kind !== 'lexicon'));

const opened = (text: string): void => {
  cleanup();
  const { place, name } = placeOf(text);
  render(<InLogosChooser place={place} name={name} entries={BOOKS} onClose={() => undefined} />);
};
const doors = (text: string): void => {
  cleanup();
  const { place, name } = placeOf(text);
  render(<InLogosDoors place={place} name={name} entries={BOOKS} />);
};

const chooser = () => screen.findByRole('dialog');
/** The drawn groups, top to bottom, as their headings read. */
const groupNames = async (): Promise<string[]> => {
  const dialog = await chooser();
  await within(dialog).findAllByRole('group');
  return within(dialog).getAllByRole('group').map((g) => g.getAttribute('aria-label') ?? '');
};
const group = async (name: string) => within(await chooser()).findByRole('group', { name: new RegExp(`^${name}\\b`) });
const rows = (box: HTMLElement): HTMLElement[] => within(box).queryAllByRole('link');

const SHELF = 'his shelf holds 5 commentaries on Romans, 1 commentary on John, 4 Greek texts and 2 interlinears, all On, with 1 interlinear pinned';

const feature = await loadFeature('features/in-logos.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The groups and counts follow the shelf and the place', ({ Given, When, Then, And }) => {
    Given(SHELF, () => everything('Interlinear 1'));
    When('he opens the chooser at {string}', (_, at: string) => opened(at));
    Then('the chooser is headed {string}', async (_, title: string) => {
      expect((await chooser()).getAttribute('aria-label')).toBe(title);
    });
    And('the groups read {string}', async (_, names: string) => {
      expect(await groupNames()).toEqual(names.split(', '));
    });
    And('each group draws 3 rows at most, and {string} has {string} waiting', async (_, name: string, more: string) => {
      for (const g of within(await chooser()).getAllByRole('group')) expect(rows(g).length).toBeLessThanOrEqual(3);
      const box = await group(name);
      expect(rows(box)).toHaveLength(3);
      expect(within(box).getByRole('button', { name: new RegExp(`^${more}`) })).toBeTruthy();
    });
    When('he taps {string} under {string}', async (_, more: string, name: string) => {
      await user.click(within(await group(name)).getByRole('button', { name: new RegExp(`^${more}`) }));
    });
    Then('{string} draws {int} rows', async (_, name: string, count: number) => {
      expect(rows(await group(name))).toHaveLength(count);
    });
  });

  Scenario('Search opens every group', ({ Given, When, Then, And }) => {
    Given(SHELF, () => everything('Interlinear 1'));
    When('he opens the chooser at {string}', (_, at: string) => opened(at));
    And('he searches the chooser for {string}', async (_, text: string) => {
      await user.type(within(await chooser()).getByRole('searchbox'), text);
    });
    Then('{string} draws {int} rows', async (_, name: string, count: number) => {
      expect(rows(await group(name))).toHaveLength(count);
    });
    And('no "more" button is drawn', async () => {
      expect(within(await chooser()).queryByRole('button', { name: /\bmore\b/ })).toBeNull();
    });
  });

  Scenario('A commentary whose volume lacks the book is absent', ({ Given, When, Then, And }) => {
    Given(SHELF, () => everything('Interlinear 1'));
    When('he opens the chooser at {string}', (_, at: string) => opened(at));
    Then('the chooser has no row for {string}', async (_, name: string) => {
      await chooser();
      expect(within(await chooser()).queryByText(name)).toBeNull();
    });
    When('he moves the chooser to {string}', (_, at: string) => opened(at));
    Then('{string} draws {int} rows', async (_, name: string, count: number) => {
      expect(rows(await group(name))).toHaveLength(count);
    });
    And('the chooser has a row for {string}', async (_, name: string) => {
      expect(await within(await chooser()).findByText(name)).toBeTruthy();
    });
  });

  Scenario('A book that is Off is absent', ({ Given, And, When, Then }) => {
    Given(SHELF, () => everything('Interlinear 1'));
    And('the Greek text {string} is Off', async (_, short: string) => {
      await db.library.delete(book(short).resource);
    });
    When('he opens the chooser at {string}', (_, at: string) => opened(at));
    Then('the groups read {string}', async (_, names: string) => {
      expect(await groupNames()).toEqual(names.split(', '));
    });
    And('the chooser has no row for {string}', async (_, name: string) => {
      expect(within(await chooser()).queryByText(name)).toBeNull();
    });
  });

  Scenario('The Old Testament card lists Bibles and interlinears only', ({ Given, And, When, Then }) => {
    Given(SHELF, () => everything('Interlinear 1'));
    And('the Bible {string} is chosen', async (_, short: string) => {
      await db.library.put({ id: book(short).resource, kind: 'bible', state: 'on', since: 1 });
    });
    When('he opens the chooser at {string}', (_, at: string) => opened(at));
    Then('the groups read {string}', async (_, names: string) => {
      expect(await groupNames()).toEqual(names.split(', '));
    });
    And('the chooser has no row for {string}', async (_, name: string) => {
      expect(within(await chooser()).queryByText(name)).toBeNull();
    });
  });

  Scenario('With no verse-kind On the second door is absent', ({ Given, When, Then, And }) => {
    Given('his shelf holds only 3 lexicons On, and Logos is On', () => shelf(BOOKS.filter((e) => e.kind === 'lexicon').map((e) => [e, 'on'] as const)));
    When('the verse\'s doors are drawn at {string}', (_, at: string) => doors(at));
    Then('the door {string} is drawn', async (_, name: string) => {
      expect(await screen.findByRole('link', { name })).toBeTruthy();
    });
    And('the door {string} is not drawn', async (_, name: string) => {
      await screen.findByRole('link', { name: 'In Logos' });
      expect(screen.queryByRole('button', { name })).toBeNull();
    });
  });

  Scenario('With a Greek text On the second door opens the chooser', ({ Given, When, Then }) => {
    Given(SHELF, () => everything('Interlinear 1'));
    When('the verse\'s doors are drawn at {string}', (_, at: string) => doors(at));
    Then('the door {string} is drawn', async (_, name: string) => {
      expect(await screen.findByRole('button', { name })).toBeTruthy();
    });
    When('he taps the door {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name }));
    });
    Then('the chooser is headed {string}', async (_, title: string) => {
      expect((await chooser()).getAttribute('aria-label')).toBe(title);
    });
  });

  Scenario('With Logos Off neither door is drawn', ({ Given, And, When, Then }) => {
    Given(SHELF, () => everything('Interlinear 1'));
    And('Logos is Off', () => setResourceOn('logos', false));
    When('the verse\'s doors are drawn at {string}', (_, at: string) => doors(at));
    Then('the door {string} is not drawn', async (_, name: string) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(screen.queryByRole('link', { name })).toBeNull();
      expect(screen.queryByRole('button', { name })).toBeNull();
    });
    And('the door {string} is not drawn', async (_, name: string) => {
      expect(screen.queryByRole('button', { name })).toBeNull();
    });
  });
});
