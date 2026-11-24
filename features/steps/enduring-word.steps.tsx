// features/steps/enduring-word.steps.tsx — runs features/enduring-word.feature (mw-1l901so.1, mw-1l901so.2): Enduring Word, David Guzik's commentary on the web, as a row of the "In another book…" chooser
// (src/library/InLogosChooser.tsx, where his library holds no DGCB volume of the book) and as the Verse view's "Commentary" door (src/library/EnduringWordDoor.tsx), both opening Lampas's reader
// (src/sermons/SermonReader.tsx). The sermon index service is not reached (SERMONS_URL is empty in the tests): the reader cannot get the words, so the page opens on the web.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setGreekInterest, setResourceOn, shelfOf } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetPlayback } from '../../src/handsFree/playback';
import { runCommand } from '../../src/handsFree/commands';
import { InLogosChooser } from '../../src/library/InLogosChooser';
import type { CatalogueEntry } from '../../src/resources/catalogue';
import { ENDURING_WORD_CREDIT, ENDURING_WORD_SECTIONS, ENDURING_WORD_SOURCE } from '../../src/resources/enduringWord';
import { SermonReaderHost } from '../../src/sermons/SermonReader';
import { closeSermonText, serveTextOf } from '../../src/sermons/sermonText';
import { setSermonsUrl } from '../../src/services/sermons';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';
import { keepImport } from '../../tests/support/logos-import';
import { closeDatabase } from './close-database';

afterAll(async () => {
  cleanup();
  stopReading();
  serveTextOf(ENDURING_WORD_SOURCE, false);
  setSermonsUrl(undefined);
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


// ---- by voice (mw-1l901so.3): the words go to Hands-free's own router (runCommand), as the recogniser would hand them; the speech engine is voice-kit's honest fake ----
const SERVICE = 'https://sermons.test';
const SECTION_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** The commentary's words as the service would hand them (made up for the test: none of the site's own): an opening paragraph, then each section of John 3's outline as its heading and one paragraph. */
const COMMENTARY = ['Opening words.', ...(ENDURING_WORD_SECTIONS['john-3'] ?? []).flatMap((range, i) => [`${i + 1}. (${range}) Heading ${SECTION_WORDS[i]}`, `Words of section ${i + 1}.`])];
let synth: FakeSynth;
let said: string[] = [];
let asked: string[] = [];

/** Lampas is opened on John 3:16, Logos Off, the phone speaking English; `served`: the service answers the commentary's words (the reader asks for them), else it serves none of the site's. */
async function openJohn316(served: boolean): Promise<void> {
  cleanup();
  closeSermonText();
  stopReading();
  clearBus();
  forgetPlayback();
  vi.unstubAllGlobals();
  noteWindows();
  said = [];
  asked = [];
  serveTextOf(ENDURING_WORD_SOURCE, false);
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '02');
  window.history.replaceState(null, '', '/#/?b=jhn&c=3&v=16');
  stubChapterFetch();
  synth = stubSpeech([ENGLISH_VOICE]);
  if (served) {
    setSermonsUrl(SERVICE);
    serveTextOf(ENDURING_WORD_SOURCE);
    const chapters = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith(`${SERVICE}/v1/text`)) return chapters(input, init);
      asked.push(url);
      return Promise.resolve(new Response(JSON.stringify({ id: 'john-3', title: 'John 3 · Enduring Word', source: ENDURING_WORD_SOURCE, url: 'https://enduringword.com/bible-commentary/john-3/', paragraphs: COMMENTARY }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });
  } else setSermonsUrl(undefined);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.readings.clear(), db.library.clear()]);
  await setGreekInterest(5);
  await seedHisWords();
  await setResourceOn('logos', false);
  render(<App />);
  await screen.findByRole('region', { name: 'Verse view' });
}

const hear = async (_: unknown, words: string) => {
  await act(async () => {
    await runCommand(words, (text) => {
      said.push(text);
      return Promise.resolve();
    });
  });
};
const sheet = () => document.querySelector<HTMLElement>('[data-sermon-reader]');
const markedParagraph = async (text: string, doing: 'reading' | 'not reading') => {
  await waitFor(() => {
    const marked = sheet()?.querySelector('[data-sermon-paragraph][data-reading]');
    expect(marked?.textContent).toBe(text);
    const reading = getReading();
    if (doing === 'reading') expect(reading.status === 'reading' && reading.answer !== null).toBe(true);
    else expect(reading.status === 'idle' || reading.status === 'paused').toBe(true);
  });
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
    Given('Lampas is opened on John 3:16 with Logos Off', () => openJohn316(false));
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

  const served = 'Lampas is opened on John 3:16 with Logos Off and a service that serves the words of John 3\'s commentary';
  const headed = "the reader is headed {string}";
  const marks = 'the reader marks the paragraph {string} and is reading it';
  const marksNot = 'the reader marks the paragraph {string} and is not reading';

  Scenario('In Hands-free on John 3:16 "Enduring Word" opens the John 3 page in the reader at section 6 and starts reading', ({ Given, When, Then, And }) => {
    Given(served, () => openJohn316(true));
    When('he says {string}', hear);
    Then(headed, readerHeaded);
    And('the service was asked for the commentary {string}', async (_, id: string) => {
      await waitFor(() => expect(asked).toEqual([`${SERVICE}/v1/text?id=${id}&source=${ENDURING_WORD_SOURCE}`]));
    });
    And(marks, (_, text: string) => markedParagraph(text, 'reading'));
    And('no page is opened on the web', () => {
      expect(windows).toEqual([]);
    });
  });

  Scenario('"stop", then the reading, then "Enduring Word" again goes on at the paragraph where he stopped', ({ Given, When, Then, And }) => {
    Given(served, () => openJohn316(true));
    When('he says {string}', hear);
    And('he then says {string}', hear);
    Then(marks, (_, text: string) => markedParagraph(text, 'reading'));
    When('he says {string} to end it', hear);
    Then(marksNot, (_, text: string) => markedParagraph(text, 'not reading'));
    When('he next says {string}', hear);
    Then('the reader is put away', async () => {
      await waitFor(() => expect(sheet()).toBeNull());
    });
    And('John 3 is being read from verse {int}', async (_, verse: number) => {
      await waitFor(() => {
        const reading = getReading();
        expect(reading.status).toBe('reading');
        expect(reading.answer).toBeNull();
        expect(reading.verse).toBe(verse);
      });
    });
    When('he asks again {string}', hear);
    Then(headed, readerHeaded);
    And('the reader goes on at the paragraph {string} and is reading it', (_, text: string) => markedParagraph(text, 'reading'));
  });

  Scenario('The credit line is said once, at the start', ({ Given, When, Then, And }) => {
    Given(served, () => openJohn316(true));
    When('he says {string}', hear);
    Then('the first thing the phone says is the credit {string}', async (_, credit: string) => {
      expect(credit).toBe(ENDURING_WORD_CREDIT);
      await waitFor(() => expect(synth.spoken[0]?.text).toBe(credit));
    });
    When('he then says {string}', hear);
    And('he next says {string}', hear);
    And('he says {string} once more', hear);
    Then('the phone has said the credit once', () => {
      expect(synth.spoken.filter((s) => s.text.includes(ENDURING_WORD_CREDIT))).toHaveLength(1);
    });
  });

  Scenario('Where the service serves no words the page opens on the web and he is told', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on John 3:16 with Logos Off and a service that serves no words of the commentary', () => openJohn316(false));
    When('he says {string}', hear);
    Then('the page {string} is opened on the web, as the reader cannot get its words', pageOpened);
    And('Hands-free says {string}', (_, line: string) => {
      expect(said).toEqual([line]);
    });
  });
});
