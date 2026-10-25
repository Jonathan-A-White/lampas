// features/steps/ask-for-book.steps.tsx — runs features/ask-for-book.feature: the one sheet, Ask for a book (src/library/AskForBook.tsx), opened from the Library, the idea sheet, Settings > Daily and
// Ask for more, and Ask the makers about these on the import screen, each sending a 'feedback' grist (grinds/feedback.json) of the kind book or library, proven against the fake Postern.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi, type MockInstance } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { applyImport, planImport, shelfOf } from '../../src/data/repositories';
import { keepLibraryAsked } from '../../src/data/repositories/bookRequests';
import { keepRequest } from '../../src/data/repositories/requests';
import { clearBus } from '../../src/events/bus';
import { IdeaSheet } from '../../src/IdeaSheet';
import { ideaOf } from '../../src/data/grammar/ladder';
import { askAboutLibrary, askedLine, libraryRefusal } from '../../src/services/bookRequests';
import { readExport } from '../../src/library/parseExport';
import type { ListedRow } from '../../src/library/usableRows';
import { forgetTrail } from '../../src/nav/lastRoute';
import { openRequests } from '../../src/nav/route';
import { CATALOGUE, CATALOGUE_VERSION } from '../../src/resources/catalogue';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { validate, type Schema } from '../../tests/support/schema-validate';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  onLine?.mockRestore();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const feedbackSchema = JSON.parse(readFileSync('grinds/feedback.input.schema.json', 'utf8')) as Schema;
const DAY = 24 * 60 * 60 * 1000;
let fake: FakePostern;
let onLine: MockInstance<() => boolean> | undefined;

/** The book Lampas cannot use that a kept list holds, and what the sheet must send of it. */
const HENDRIKSEN = {
  resource: 'LLS:HENDRIKSENROM',
  type: 'text.monograph.commentary.bible',
  title: "Exposition of Paul's Epistle to the Romans",
  series: 'New Testament Commentary',
  languages: 'en',
  supersets: 'bible.66.1.1-66.16.27',
};
const quote = (text: string): string => (/[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
const HEADER = 'ResourceId,Type,AbbreviatedTitle,Title,Series,Languages,ReferenceSupersets';
const line = (r: { resource: string; type: string; title: string; series: string; languages: string; supersets: string }): string => [r.resource, r.type, '', r.title, r.series, r.languages, r.supersets].map(quote).join(',');

/** A book the catalogue lists, as Logos would list it (so the kept list holds a row Lampas opens and the search must not offer it). */
const listed = CATALOGUE.find((e) => e.kind === 'grammar')!;
const LISTED_ROW = { resource: listed.resource, type: 'text.monograph.grammar', title: listed.title, series: listed.series ?? '', languages: 'en,el', supersets: '' };

/** A list as Logos saves it: a book Lampas opens, an NT commentary and a Greek lexicon it does not, a manuscript and a Hebrew lexicon it never will. */
const GREEK_LEXICON = { resource: 'LLS:GREEKLEXICON', type: 'text.monograph.lexicon', title: 'A Greek Lexicon of the New Testament', series: '', languages: 'el,en', supersets: '' };
const MANUSCRIPT = { resource: 'LLS:MANUSCRIPT1', type: 'text.monograph.ancient-manuscript', title: 'Codex Sinaiticus', series: '', languages: 'el', supersets: 'bible.61.1.1-87.22.21' };
const HEBREW_LEXICON = { resource: 'LLS:HEBREWLEXICON', type: 'text.monograph.lexicon', title: 'A Hebrew Lexicon', series: '', languages: 'he,en', supersets: '' };
const LIST = [HEADER, ...[LISTED_ROW, HENDRIKSEN, GREEK_LEXICON, MANUSCRIPT, HEBREW_LEXICON].map(line)].join('\r\n') + '\r\n';


/** Empties the phone's stores and opens the app at `address` behind a fake Postern that answers a feedback grist as the mill does. */
async function openAt(address: string, options: { list?: boolean; logos?: boolean } = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  onLine?.mockRestore();
  onLine = undefined;
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${address}`);
  tutorTimings.pollMs = 20;
  tutorTimings.contactLostMs = 0;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.talks.clear(), db.requests.clear(), db.library.clear(), db.exportRows.clear()]);
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
    { key: 'resource.logos', value: options.logos === false ? 'off' : 'on' },
  ]);
  await shelfOf();
  if (options.list) await applyImport(await planImport(readExport([HEADER, ...[LISTED_ROW, HENDRIKSEN].map(line)].join('\r\n') + '\r\n')));
  render(<App />);
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}

const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Ask for a book' });
const inSheet = () => within(sheet());
const titleBox = () => inSheet().getByRole('textbox', { name: 'Book title' });
const sendButton = () => inSheet().getByRole('button', { name: /^(Send|Retry)$/ });

/** Opens the app at the place the scenario names. The idea sheet is drawn on its own, over a Library that is not asked for anything. */
async function openPlace(place: string): Promise<void> {
  if (place === 'an idea sheet') {
    await openAt('#/library');
    cleanup();
    render(<IdeaSheet idea={ideaOf('noun')} onClose={() => undefined} onWord={() => undefined} />);
    await screen.findByRole('dialog', { name: 'Idea' });
    await waitFor(() => expect(within(screen.getByRole('dialog', { name: 'Idea' })).queryByTestId('idea-loading')).toBeNull());
    return;
  }
  const addresses: Record<string, string> = { 'the Library': '#/library', 'Settings > Daily': '#/settings?group=daily', 'the Ask for more page': '#/askmore' };
  await openAt(addresses[place]);
}

const taps = async (_: unknown, label: string): Promise<void> => {
  const scope = screen.queryByRole('dialog', { name: 'Idea' }) ?? document.body;
  await user.click(await within(scope as HTMLElement).findByRole('button', { name: new RegExp(`^${label}`) }));
};
const opensTheSheet = async (): Promise<void> => {
  await user.click(await screen.findByRole('button', { name: /^Ask for a book/ }));
  await screen.findByRole('dialog', { name: 'Ask for a book' });
};
const typesTitle = async (_: unknown, title: string): Promise<void> => {
  await user.type(titleBox(), title);
};
const sends = async (): Promise<void> => {
  await user.click(sendButton());
};
const sheetSays = async (_: unknown, words: string): Promise<void> => {
  expect(await inSheet().findByText(words)).toBeInTheDocument();
};
const noGrist = (): void => {
  expect(fake.received).toHaveLength(0);
};
const oneBook = async (): Promise<Record<string, unknown>> => {
  // the tutor's talk (a bible-talk grist) may have come first, as in the door's scenario: the book is the one feedback grist
  const grists = () => fake.received.filter((r) => r.grist.kind === 'feedback');
  await waitFor(() => expect(grists()).toHaveLength(1));
  expect(fake.received).toHaveLength(grists().length + fake.received.filter((r) => r.grist.kind === 'bible-talk').length);
  expect(grists()[0].grist).toMatchObject({ app: 'lampas', kind: 'feedback', v: '1' });
  const input = grists()[0].input;
  expect(validate(input, feedbackSchema)).toEqual([]);
  return input;
};

const feature = await loadFeature('features/ask-for-book.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  ScenarioOutline('The sheet opens from each place with the kind preset', ({ Given, When, Then }, row) => {
    Given('the app is open at <place> behind a fake Postern', () => openPlace(row.place));
    When('he taps "<button>"', () => taps(undefined, row.button));
    Then('the sheet "Ask for a book" is open with the kind "<kind>"', async () => {
      const kind = await screen.findByRole('combobox', { name: 'Kind of book' });
      expect(sheet()).toBeInTheDocument();
      expect((kind as HTMLSelectElement).selectedOptions[0].textContent).toBe(row.kind);
    });
  });

  Scenario('Without a list kept the title is typed, the sheet says what is sent, and one book request goes', ({ Given, When, Then, And }) => {
    Given('the app is open at the Library behind a fake Postern with no list kept', () => openAt('#/library'));
    When('he opens Ask for a book', opensTheSheet);
    Then('the sheet has no search of his books', () => {
      expect(inSheet().queryByRole('searchbox')).toBeNull();
    });
    And('the sheet says in one line what is sent', () => {
      const sends = within(sheet()).getByTestId('ask-sends');
      expect(sends.textContent).toMatch(/title/i);
      expect(sends.textContent).toMatch(/Nothing else leaves this phone/);
    });
    And('Send is disabled', () => {
      expect(sendButton()).toBeDisabled();
    });
    When('he types the title {string} and the reason {string}', async (_, title: string, why: string) => {
      await user.type(titleBox(), title);
      await user.type(inSheet().getByRole('textbox', { name: 'Why would it help?' }), why);
    });
    And('he taps Send in the sheet', sends);
    Then('the mill received one feedback grist of kind book with the title {string} and the reason and no Logos details', async (_, title: string) => {
      expect(await oneBook()).toEqual({ kind: 'book', title, why: 'To read beside the Greek.', app_version: __APP_VERSION__ });
    });
    And('the sheet says {string}', sheetSays);
    And('the phone keeps one request of kind book with the words {string}', async (_, words: string) => {
      await waitFor(async () => expect(await db.requests.count()).toBe(1));
      expect(await db.requests.toArray()).toEqual([expect.objectContaining({ txid: fake.txids[0], kind: 'book', text: words, status: 'sent' })]);
    });
    And('Your requests lists it as {string}', async (_, label: string) => {
      cleanup();
      render(<App />);
      act(() => openRequests('settings'));
      await screen.findByRole('heading', { name: 'Your requests', level: 1 });
      expect(await screen.findByText(new RegExp(`^${label} · `))).toBeInTheDocument();
    });
  });

  Scenario('With a list kept he searches the books Lampas cannot use and a pick fills the request', ({ Given, When, Then, And }) => {
    Given('the app is open at the Library behind a fake Postern with a list kept', () => openAt('#/library', { list: true }));
    When('he opens Ask for a book', opensTheSheet);
    And('he searches his other books for {string}', async (_, words: string) => {
      await user.type(await inSheet().findByRole('searchbox', { name: 'Search your other books' }), words);
    });
    Then('the results are {string} and nothing from the books Lampas opens', async (_, title: string) => {
      const results = await inSheet().findByTestId('ask-results');
      expect(within(results).getAllByRole('button').map((b) => b.textContent)).toEqual([expect.stringContaining(title)]);
      await user.clear(inSheet().getByRole('searchbox', { name: 'Search your other books' }));
      await user.type(inSheet().getByRole('searchbox', { name: 'Search your other books' }), listed.title.slice(0, 12));
      expect(inSheet().queryByTestId('ask-results')?.textContent ?? '').not.toContain(listed.title);
      await user.clear(inSheet().getByRole('searchbox', { name: 'Search your other books' }));
      await user.type(inSheet().getByRole('searchbox', { name: 'Search your other books' }), 'hendriksen');
    });
    When('he picks {string}', async (_, title: string) => {
      await user.click(await within(await inSheet().findByTestId('ask-results')).findByRole('button', { name: new RegExp(title) }));
    });
    Then('the sheet shows the book picked with its type and series', async () => {
      const picked = await inSheet().findByTestId('ask-picked');
      expect(picked).toHaveTextContent(HENDRIKSEN.title);
      expect(picked).toHaveTextContent('Commentary');
      expect(picked).toHaveTextContent(HENDRIKSEN.series);
    });
    When('he taps Send in the sheet', sends);
    Then("the mill received one feedback grist of kind book with that row's Resource ID, Type, Series and ReferenceSupersets", async () => {
      expect(await oneBook()).toEqual({
        kind: 'book',
        title: HENDRIKSEN.title,
        resource: HENDRIKSEN.resource,
        type: HENDRIKSEN.type,
        series: HENDRIKSEN.series,
        refs: HENDRIKSEN.supersets,
        app_version: __APP_VERSION__,
      });
    });
  });

  Scenario('The kind preset by the place goes with the request', ({ Given, When, And, Then }) => {
    Given('the app is open at Settings > Daily behind a fake Postern', () => openAt('#/settings?group=daily'));
    When('he taps {string}', taps);
    And('he types the title {string}', async (_, title: string) => {
      await screen.findByRole('dialog', { name: 'Ask for a book' });
      await typesTitle(undefined, title);
    });
    And('he taps Send in the sheet', sends);
    Then('the mill received one feedback grist of kind book with the title {string} and the kind devotional', async (_, title: string) => {
      expect(await oneBook()).toEqual({ kind: 'book', title, kindWanted: 'devotional', app_version: __APP_VERSION__ });
    });
  });

  Scenario('A book he already asked for is refused with its line', ({ Given, And, When, Then }) => {
    Given('the app is open at the Library behind a fake Postern with no list kept', () => openAt('#/library'));
    And('he asked for {string} on 21 Oct', async (_, title: string) => {
      await keepRequest({ txid: 'earlier', kind: 'book', text: title, app_version: 'v', sentAt: Date.UTC(2026, 9, 21, 12) });
    });
    When('he opens Ask for a book', opensTheSheet);
    And('he types the title {string}', typesTitle);
    And('he taps Send in the sheet', sends);
    Then('the sheet says {string}', sheetSays);
    And('the mill has received no grist', noGrist);
  });

  Scenario('A book already in the catalogue is refused with its line', ({ Given, When, And, Then }) => {
    Given('the app is open at the Library behind a fake Postern with no list kept', () => openAt('#/library'));
    When('he opens Ask for a book', opensTheSheet);
    And('he types the title of a book the catalogue lists', () => typesTitle(undefined, listed.title));
    And('he taps Send in the sheet', sends);
    Then('the sheet says {string}', sheetSays);
    And('the mill has received no grist', noGrist);
  });

  Scenario('Offline the request waits and goes when the phone is back online', ({ Given, And, When, Then }) => {
    Given('the app is open at the Library behind a fake Postern with no list kept', () => openAt('#/library'));
    And('the phone is offline', () => {
      onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    });
    When('he opens Ask for a book', opensTheSheet);
    And('he types the title {string}', typesTitle);
    And('he taps Send in the sheet', sends);
    Then('the sheet says {string}', sheetSays);
    And('the mill has received no grist', noGrist);
    When('the phone is back online', async () => {
      onLine?.mockRestore();
      onLine = undefined;
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });
    });
    Then('the mill received one feedback grist of kind book with the title {string} and no Logos details', async (_, title: string) => {
      expect(await oneBook()).toEqual({ kind: 'book', title, app_version: __APP_VERSION__ });
    });
    And('the sheet says {string}', sheetSays);
  });

  Scenario("The tutor's Send and the sheet's own Send post the same request fields for the same values", ({ Given, When, Then, And }) => {
    let byHand: Record<string, unknown> = {};
    Given('the app is open at the Library behind a fake Postern with no list kept', () => openAt('#/library'));
    When('he opens Ask for a book', opensTheSheet);
    And('he types the title {string}, picks the kind {string} and writes the reason {string}', async (_, title: string, kind: string, why: string) => {
      await user.type(titleBox(), title);
      await user.selectOptions(inSheet().getByRole('combobox', { name: 'Kind of book' }), kind);
      await user.type(inSheet().getByRole('textbox', { name: 'Why would it help?' }), why);
    });
    And('he taps Send in the sheet', sends);
    Then('the mill received one feedback grist of kind book, which is kept as the hand\'s request', async () => {
      byHand = await oneBook();
      expect(byHand).toMatchObject({ kind: 'book', title: 'Lenski, Romans', kindWanted: 'commentary', why: 'To read beside the Greek.' });
    });
    When('the app is opened again behind a fake Postern whose tutor will fill those same three values', async () => {
      await openAt('#/library');
      fake.kindReplies = {
        feedback: { status: 'answered', answer: { status: 'sent' } },
        'bible-talk': {
          status: 'answered',
          answer: {
            answer: 'That is everything I need.',
            words: [],
            form_values: [
              { field: 'title', value: 'Lenski, Romans' },
              { field: 'kind', value: 'Commentary' },
              { field: 'why', value: 'To read beside the Greek.' },
            ],
          },
        },
      };
    });
    And('he opens Ask for a book', opensTheSheet);
    And('he lets the tutor do it and taps the Send the panel ends with', async () => {
      await user.click(inSheet().getByRole('button', { name: 'Let the tutor do it' }));
      const panel = await screen.findByRole('region', { name: 'The tutor is helping with this form' });
      await user.click(await within(panel).findByRole('button', { name: 'Send' }));
    });
    Then("the mill received one feedback grist of kind book whose fields are the hand's request, field by field", async () => {
      const byTutor = await oneBook();
      expect(Object.keys(byTutor).sort()).toEqual(Object.keys(byHand).sort());
      for (const key of Object.keys(byHand)) expect(byTutor[key], key).toEqual(byHand[key]);
    });
  });

  Scenario('Ask the makers about these sends the whole list once, with the usable rows attached', ({ Given, Then, When, And }) => {
    Given('his Logos list is read on the import screen and holds books Lampas cannot use', async () => {
      await openAt('#/library?import');
      await user.upload(await screen.findByLabelText('Logos list file'), new File([LIST], 'logos-list.csv', { type: 'text/csv' }));
      await screen.findByTestId('import-result');
    });
    Then('nothing has been sent', () => {
      expect(fake.received).toHaveLength(0);
      expect(fake.blobs).toHaveLength(0);
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('button', { name: label }));
    });
    Then('the mill received one feedback grist of kind library with the counts by Logos type', async () => {
      const input = await oneBook();
      expect(input).toEqual({
        kind: 'library',
        books: 5,
        usable: 2,
        counts: { 'text.monograph.lexicon': 2, 'text.monograph.ancient-manuscript': 1, 'text.monograph.commentary.bible': 1 },
        catalogue_version: CATALOGUE_VERSION,
        app_version: __APP_VERSION__,
      });
    });
    And('it carries one attachment library.csv of type text/csv under 200 KB', () => {
      const [file, ...more] = fake.received[0].attachments;
      expect(more).toEqual([]);
      expect(file).toMatchObject({ mime: 'text/csv', name: 'library.csv' });
      expect(file.size).toBeLessThan(200 * 1024);
    });
    And("the file's header is ResourceId, Type, Title, Series, ReferenceSupersets", () => {
      const text = fake.attachmentText(fake.received[0].attachments[0])!;
      expect(text.split(/\r?\n/)[0]).toBe('ResourceId,Type,Title,Series,ReferenceSupersets');
    });
    And('the file holds the usable books and no manuscript', () => {
      const text = fake.attachmentText(fake.received[0].attachments[0])!;
      expect(text).toContain(HENDRIKSEN.resource);
      expect(text).toContain(GREEK_LEXICON.resource);
      expect(text).not.toContain(MANUSCRIPT.resource);
      expect(text).not.toContain('ancient-manuscript');
      expect(text).not.toContain(HEBREW_LEXICON.resource);
      expect(text).not.toContain(LISTED_ROW.resource);
    });
    And('the page says {string} the day, the number of books, and {string}', async (_, _asked: string, ending: string) => {
      const asked = await screen.findByTestId('library-asked');
      expect(asked.textContent).toMatch(/^Asked on \d{1,2} \w{3}: 2 books\./);
      expect(asked.textContent).toContain(ending);
    });
    And('the phone keeps one request of kind library', async () => {
      await waitFor(async () => expect(await db.requests.count()).toBe(1));
      expect(await db.requests.toArray()).toEqual([expect.objectContaining({ kind: 'library', status: 'sent' })]);
    });
  });

  Scenario('A second library request is refused until the catalogue changes or 30 days pass', ({ Given, When, Then, And }) => {
    const ago = (days: number): number => Date.now() - days * DAY;
    Given('a library request was sent 5 days ago under this catalogue version for 412 books', async () => {
      await openAt('#/library');
      await keepLibraryAsked({ at: ago(5), version: CATALOGUE_VERSION, books: 412 });
    });
    When('he reads his Logos list on the import screen again', async () => {
      cleanup();
      window.history.replaceState(null, '', '/#/library?import');
      render(<App />);
      await user.upload(await screen.findByLabelText('Logos list file'), new File([LIST], 'logos-list.csv', { type: 'text/csv' }));
      await screen.findByTestId('import-result');
    });
    Then('Ask the makers about these is not offered', () => {
      expect(screen.queryByRole('button', { name: 'Ask the makers about these' })).toBeNull();
    });
    And("the page says the card's line for 412 books", async () => {
      expect((await screen.findByTestId('library-asked')).textContent).toBe(askedLine({ at: ago(5), version: CATALOGUE_VERSION, books: 412 }));
    });
    And('the Library card says the same line', async () => {
      cleanup();
      window.history.replaceState(null, '', '/#/library');
      render(<App />);
      const card = await screen.findByTestId('library-card');
      await waitFor(() => expect(card.textContent).toContain(askedLine({ at: ago(5), version: CATALOGUE_VERSION, books: 412 })));
    });
    When('the library request is sent anyway', async () => {
      const rows: ListedRow[] = readExport(LIST).map((r) => ({ resource: r.resource, type: r.type, title: r.title, series: r.series, languages: r.languages, refs: r.supersets }));
      expect(await askAboutLibrary(rows, 5)).toEqual({ ok: false, line: askedLine({ at: ago(5), version: CATALOGUE_VERSION, books: 412 }) });
    });
    Then('it is refused with that line and the mill has received no grist', noGrist);
    When('the library request was sent 31 days ago', async () => {
      await keepLibraryAsked({ at: ago(31), version: CATALOGUE_VERSION, books: 412 });
    });
    Then('asking the makers about these is allowed again', async () => {
      expect(await libraryRefusal()).toBeUndefined();
    });
    When('the library request was sent 5 days ago under another catalogue version', async () => {
      await keepLibraryAsked({ at: ago(5), version: `${CATALOGUE_VERSION}-older`, books: 412 });
    });
    Then('asking the makers about these is allowed under the new catalogue', async () => {
      expect(await libraryRefusal()).toBeUndefined();
    });
  });

  Scenario('Ask for more keeps its other forms and has no study-resource box', ({ Given, Then, And }) => {
    Given('the app is open at the Ask for more page behind a fake Postern', async () => {
      await openAt('#/askmore');
      await screen.findByRole('heading', { name: 'Ask for more', level: 1 });
    });
    Then('it offers the forms {string}, {string} and {string} and the button {string}', (_, a: string, b: string, c: string, d: string) => {
      const main = screen.getByRole('main');
      for (const name of [a, b, c, d]) expect(within(main).getByRole('button', { name })).toBeInTheDocument();
    });
    And('{string} opens no form of its own', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name }));
      expect(screen.queryByRole('form', { name })).toBeNull();
      expect(await screen.findByRole('dialog', { name: 'Ask for a book' })).toBeInTheDocument();
    });
  });
});

