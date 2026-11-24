// features/steps/enduring-word.steps.tsx — runs features/enduring-word.feature (mw-1l901so.1, mw-1l901so.2): Enduring Word, David Guzik's commentary on the web, as a row of the "In another book…" chooser
// (src/library/InLogosChooser.tsx, where his library holds no DGCB volume of the book) and as the Verse view's "Commentary" door (src/library/EnduringWordDoor.tsx), both opening Lampas's reader
// (src/sermons/SermonReader.tsx). The sermon index service is not reached (SERMONS_URL is empty in the tests): the reader cannot get the words, so the page opens on the web.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setGreekInterest, setResourceOn, shelfOf } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { InLogosChooser } from '../../src/library/InLogosChooser';
import type { CatalogueEntry } from '../../src/resources/catalogue';
import { SermonReaderHost } from '../../src/sermons/SermonReader';
import { closeSermonText } from '../../src/sermons/sermonText';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';
import { keepImport } from '../../tests/support/logos-import';
import { closeDatabase } from './close-database';

afterAll(async () => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  await closeDatabase();
});

const user = userEvent.setup();
let windows: string[] = [];
let at = '';

const entry = (resource: string, short: string, covers: string[]): CatalogueEntry => ({ resource, kind: 'commentary', title: short, short, lang: 'en', opens: 'verse', value: 'a test book', covers, via: 'id' });
const DGCB_IS = entry('LLS:GUZIKCOMM23IS', 'DGCB Is', ['isa']);
const JOHN = entry('LLS:COMMENTARYONJOHN1', 'Commentary on John 1', ['jhn']);
const BOOKS: readonly CatalogueEntry[] = [DGCB_IS, JOHN];

const PLACES: Record<string, { book: string; chapter: number; verse: number }> = {
  'Isaiah 1:1': { book: 'isa', chapter: 1, verse: 1 },
  'John 3:16': { book: 'jhn', chapter: 3, verse: 16 },
  'John 3:40': { book: 'jhn', chapter: 3, verse: 40 },
};

/** The windows the reader opens are noted, not opened (each step is a test of its own: this is set in the Given, not in a beforeEach). */
function noteWindows(): void {
  windows = [];
  vi.stubGlobal('open', (url: string) => {
    windows.push(url);
    return null;
  });
}

/** His library holds these books (an import that names them, and the shelf), Logos On. */
async function library(rows: readonly CatalogueEntry[]): Promise<void> {
  cleanup();
  closeSermonText();
  vi.unstubAllGlobals();
  noteWindows();
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await keepImport(rows.map((e) => e.resource));
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
  await shelfOf();
  await db.library.bulkPut(rows.map((e) => ({ id: e.resource, kind: e.kind, state: 'on' as const, since: 1 })));
  await setResourceOn('logos', true);
}

const chooser = () => screen.findByRole('dialog', { name: /in Logos$/ });
const group = async (name: string) => within(await chooser()).findByRole('group', { name: new RegExp(`^${name}\\b`) });
const rowNames = (box: HTMLElement): string[] => within(box).queryAllByRole('link').map((a) => (a.querySelector('span span')?.textContent ?? '').trim());

const reader = () => screen.findByRole('dialog', { name: /Enduring Word$/ });

async function opened(text: string): Promise<void> {
  cleanup();
  at = text;
  const place = PLACES[text] ?? expect.unreachable(`no place ${text}`);
  render(
    <>
      <InLogosChooser place={place} name={text} entries={BOOKS} onClose={() => undefined} />
      <SermonReaderHost />
    </>,
  );
}

const readerHeaded = async (_: unknown, title: string) => {
  await waitFor(async () => expect((await reader()).getAttribute('aria-label')).toBe(title));
};
const creditShown = async (_: unknown, credit: string) => {
  await waitFor(async () => expect((await reader()).querySelector('[data-enduring-credit]')?.textContent).toBe(credit));
};
const pageOpened = async (_: unknown, url: string) => {
  await waitFor(() => expect(windows).toEqual([url]));
};

const tapRow = async (_: unknown, short: string) => {
  await user.click(await within(await chooser()).findByRole('link', { name: `Open ${at} in ${short}` }));
};

const feature = await loadFeature('features/enduring-word.feature');

describeFeature(feature, ({ Scenario }) => {
  const held = 'his library holds the DGCB volume "DGCB Is" and a commentary on John, all On';
  const chooserAt = (_: unknown, at: string) => opened(at);

  Scenario('Where his library holds the DGCB volume the chooser lists it and no Enduring Word row', ({ Given, When, Then, And }) => {
    Given(held, () => library(BOOKS));
    When('he opens the chooser at {string}', chooserAt);
    Then('{string} lists {string}', async (_, name: string, short: string) => {
      await waitFor(async () => expect(rowNames(await group(name))).toEqual([short]));
    });
    And('the chooser has no row for {string}', async (_, short: string) => {
      await group('Commentaries on Isaiah');
      expect(within(await chooser()).queryByRole('link', { name: new RegExp(short.replace(/[()]/g, '\\$&')) })).toBeNull();
    });
  });

  Scenario('Where his library holds no DGCB volume of the book the chooser lists Enduring Word', ({ Given, When, Then }) => {
    Given(held, () => library(BOOKS));
    When('he opens the chooser at {string}', chooserAt);
    Then('{string} lists {string} and {string}', async (_, name: string, first: string, second: string) => {
      await waitFor(async () => expect(rowNames(await group(name))).toEqual([first, second]));
    });
  });

  Scenario("Its row opens the chapter's page in Lampas's reader, with its credit line", ({ Given, When, And, Then }) => {
    Given(held, () => library(BOOKS));
    When('he opens the chooser at {string}', chooserAt);
    And('he taps the row {string}', tapRow);
    Then('the reader is headed {string}', readerHeaded);
    And('the reader shows the credit {string}', creditShown);
    And('the page {string} is opened on the web, as the reader cannot get its words', pageOpened);
  });

  Scenario("A verse no section's range holds opens the chapter's top", ({ Given, When, And, Then }) => {
    Given(held, () => library(BOOKS));
    When('he opens the chooser at {string}', chooserAt);
    And('he taps the row {string}', tapRow);
    Then('the page {string} is opened on the web, as the reader cannot get its words', pageOpened);
  });

  Scenario('With Logos Off the Verse view has the Commentary door', ({ Given, Then, When, And }) => {
    Given('Lampas is opened on John 3:16 with Logos Off', async () => {
      cleanup();
      closeSermonText();
      stopReading();
      clearBus();
      vi.unstubAllGlobals();
      noteWindows();
      window.localStorage.clear();
      window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '02');
      window.history.replaceState(null, '', '/#/?b=jhn&c=3&v=16');
      stubChapterFetch();
      await db.open();
      await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.readings.clear(), db.library.clear()]);
      await setGreekInterest(5);
      await seedHisWords();
      await setResourceOn('logos', false);
      render(<App />);
      await screen.findByRole('region', { name: 'Verse view' });
    });
    Then('the Verse view has the door {string}, which is the link {string}', async (_, label: string, url: string) => {
      const door = await waitFor(() => {
        const found = [...document.querySelectorAll<HTMLAnchorElement>('a[data-enduring-word-door]')].find((a) => a.textContent === label);
        if (!found) throw new Error(`no door ${label}`);
        return found;
      });
      expect(door.getAttribute('href')).toBe(url);
    });
    When('he taps the door {string}', async (_, label: string) => {
      const door = [...document.querySelectorAll<HTMLAnchorElement>('a[data-enduring-word-door]')].find((a) => a.textContent === label);
      await user.click(door ?? expect.unreachable(`no door ${label}`));
    });
    Then('the reader is headed {string}', readerHeaded);
    And('the page {string} is opened on the web, as the reader cannot get its words', pageOpened);
  });
});
