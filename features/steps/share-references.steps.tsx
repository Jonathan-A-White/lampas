// features/steps/share-references.steps.tsx — runs features/share-references.feature: the Bible references listed on the 'Share to Lampas' sheet
// (src/share/ShareReferences.tsx, mw-s1dc0n.1) and, for a shared picture, those the find-refs grist reads from it (src/share/findRefs.ts, mw-s1dc0n.2). The share is
// a row in Dexie as the worker parks it; the app is the whole App, so a tapped link opens the Reader. The mill is the fake Postern of tests/support/fake-postern.ts,
// the canvas the image seam of src/images/shrink.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi, type MockInstance } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { listVerseLists, parkShare } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { imageSeam } from '../../src/images/shrink';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';

const realSeam = { ...imageSeam };

afterAll(() => {
  onLine?.mockRestore();
  cleanup();
  stopReading();
  Object.assign(imageSeam, realSeam);
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

let fake: FakePostern;
let onLine: MockInstance<() => boolean> | undefined;

/** Opens the app at the Share screen with `text` (or one picture) parked as the waiting share. `fresh` starts from an empty phone; a second share keeps what the phone kept. */
async function open(text: string, fresh: boolean, picture: false | 'held' | 'failing' | 'offline' | { answers: [string, string] } = false): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  onLine?.mockRestore();
  onLine = undefined;
  Object.assign(imageSeam, realSeam);
  tutorTimings.pollMs = 20;
  stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  const kept = fresh ? null : window.localStorage.getItem('lampas.shareRefsOrder');
  window.localStorage.clear();
  if (kept) window.localStorage.setItem('lampas.shareRefsOrder', kept);
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/share?s=share-1');
  fake = makeFakePostern();
  // a picture's grist waits for the step that answers it, or fails at once
  if (picture === 'failing') fake.kindReplies['find-refs'] = { status: 'failed', reason: 'could not read it' };
  if (picture === 'offline') {
    fake.down = true;
    onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
  }
  if (typeof picture === 'object') fake.kindReplies['find-refs'] = answered(picture.answers);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  imageSeam.decode = async () => ({ width: 1200, height: 800, source: null });
  imageSeam.encode = async () => new Blob([new Uint8Array(50_000).fill(7)], { type: 'image/jpeg' });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.talkPictures.clear(), db.shares.clear(), db.pictureRefs.clear(), db.verseLists.clear()]);
  await parkShare({
    id: 'share-1',
    createdAt: Date.now(),
    text: text || undefined,
    files: picture ? [{ name: 'shared-1.png', type: 'image/png', bytes: new Uint8Array([1, 2, 3]).buffer }] : [],
  });
  render(<App />);
  await screen.findByRole('dialog', { name: 'Share to Lampas' });
}

const openOnCard = async (): Promise<void> => {
  await user.click(await within(await screen.findByRole('dialog', { name: /^Romans 8:28/ })).findByRole('button', { name: 'Open' }));
};

/** The Reader is on Romans 8 and verse 28 has been brought to the top: its box says so, and no verse is selected (that would open the Verse view). */
const readerAtEight = async (): Promise<void> => {
  await waitFor(() => expect(document.querySelector('[data-brought-verse="28"]')).not.toBeNull());
  expect(window.location.hash).toContain('c=8');
  expect(window.location.hash).not.toContain('v=');
};

const sheet = () => screen.getByRole('dialog', { name: 'Share to Lampas' });
const links = () => Array.from(sheet().querySelectorAll<HTMLAnchorElement>('a[data-share-ref]'));
const linkNamed = (name: string): HTMLAnchorElement => {
  const found = links().find((a) => a.textContent === name);
  if (!found) throw new Error(`no link ${name}`);
  return found;
};

/** What the mill answers the find-refs grist with. */
const answered = (...pairs: [string, string][]) => ({ status: 'answered' as const, answer: { references: pairs.map(([printed, ref]) => ({ printed, ref })) } });
/** 'a' at 'b' and 'c' at 'd' from the step's four strings. */
const pairsOf = (strings: string[]): [string, string][] => Array.from({ length: strings.length / 2 }, (_, i) => [strings[2 * i]!, strings[2 * i + 1]!]);
const sheetShows = async (_: unknown, heading: string, name: string) => {
  expect(await within(sheet()).findByRole('heading', { name: heading })).toBeInTheDocument();
  expect(links().map((l) => l.textContent)).toEqual([name]);
};

const feature = await loadFeature('features/share-references.feature');

describeFeature(feature, ({ Scenario }) => {
  const sharedWords = (_: unknown, text: string) => open(text, true);
  const inOrder = (_: unknown, a: string, b: string, c?: string) => {
    expect(links().map((l) => l.textContent)).toEqual(c === undefined ? [a, b] : [a, b, c]);
  };

  Scenario('Shared words with two references list two links', ({ Given, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    Then('the sheet shows {string} with the links {string} and {string}', (_, heading: string, a: string, b: string) => {
      expect(within(sheet()).getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(links().map((l) => l.textContent)).toEqual([a, b]);
    });
    And('the link {string} goes to {string}', (_, name: string, href: string) => {
      expect(linkNamed(name).getAttribute('href')).toBe(href);
    });
    And('the link {string} also goes to {string}', (_, name: string, href: string) => {
      expect(linkNamed(name).getAttribute('href')).toBe(href);
    });
  });

  Scenario("A link opens the verse's card over the list, and Open brings the verse to the top of its chapter in the Reader", ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(linkNamed(name));
    });
    Then('a card headed {string} shows the text {string}', async (_, heading: string, text: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      await waitFor(() => expect(dialog.querySelector('[data-reference-text]')).toHaveTextContent(text));
    });
    And('the sheet shows the link {string}', async (_, name: string) => {
      expect(sheet()).toBeInTheDocument();
      expect(linkNamed(name)).toBeInTheDocument();
    });
    When('he taps Open on the card', openOnCard);
    Then('the Reader is open at Romans 8 with verse 28 brought to the top', readerAtEight);
    And('no verse is selected', () => {
      expect(document.querySelector('[data-verse][data-selected="true"]')).toBeNull();
      expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull();
    });
  });

  const card = () => screen.getByRole('dialog', { name: 'Genesis 1:28' });

  Scenario('An Old Testament reference opens a card with its English, not another chapter', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(linkNamed(name));
    });
    Then('a card headed {string} says {string}', async (_, heading: string, line: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      // an English verse is drawn in chunks, so the text is read from the passage whole
      await waitFor(() => expect((dialog.textContent ?? '').replace(/\s+/g, ' ')).toMatch(new RegExp(line)));
    });
    And('the Reader is not opened', () => {
      expect(window.location.hash).toContain('/share');
      expect(document.querySelector('[data-link-notice]')).toBeNull();
      expect(sheet()).toBeInTheDocument();
    });
    When('he closes the card', async () => {
      await user.click(within(card()).getByRole('button', { name: 'Close' }));
    });
    Then('the sheet shows the link {string} again', async (_, name: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Genesis 1:28' })).toBeNull());
      expect(linkNamed(name)).toBeInTheDocument();
    });
  });

  Scenario('The card for an Old Testament reference has Open, which goes to the Reader, as a New Testament one does', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(linkNamed(name));
    });
    Then('a card headed {string} says {string}', async (_, heading: string, line: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      // an English verse is drawn in chunks, so the text is read from the passage whole
      await waitFor(() => expect((dialog.textContent ?? '').replace(/\s+/g, ' ')).toMatch(new RegExp(line)));
    });
    And('the card has an Open button and no Open in Logos link', async () => {
      expect(await within(card()).findByRole('button', { name: 'Open' })).toBeInTheDocument();
      expect(within(card()).queryByRole('link', { name: 'Open in Logos' })).toBeNull();
    });
  });

  Scenario('The references keep the order of the page, a repeat at its first place', ({ Given, Then }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    Then('the links are, in order, {string}, {string} and {string}', inOrder);
  });

  Scenario('Bible order groups them under each book, and the choice is kept', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    When('he taps {string}', async (_, label: string) => {
      await user.click(within(sheet()).getByRole('button', { name: label }));
    });
    Then('the links are, in order, {string}, {string} and {string}', inOrder);
    And('the books listed are {string} then {string}', (_, a: string, b: string) => {
      expect(Array.from(sheet().querySelectorAll('h4')).map((h) => h.textContent)).toEqual([a, b]);
    });
    When('the Share screen is opened again with a share of the words {string}', (_, text: string) => open(text, false));
    Then('the links are, in order, {string} and {string}', inOrder);
  });

  Scenario('Words with no reference say so', ({ Given, Then }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    Then('the sheet says {string}', (_, text: string) => {
      expect(within(sheet()).getByText(text)).toBeInTheDocument();
      expect(links()).toHaveLength(0);
    });
  });

  Scenario('A shared picture is read for its references, and a book that is not a book is dropped', ({ Given, Then, When, And }) => {
    Given('the Share screen is opened with a shared picture', async () => {
      await open('', true, 'held');
    });
    Then('the sheet says {string}', async (_, text: string) => {
      expect(await within(sheet()).findByText(text)).toBeInTheDocument();
    });
    When('the mill answers with the references {string} at {string} and {string} at {string}', async (_, ...strings: string[]) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      await fake.answer(answered(...pairsOf(strings)));
    });
    Then('the sheet shows {string} with the link {string}', sheetShows);
    And('the link {string} goes to {string}', (_, name: string, href: string) => {
      expect(linkNamed(name).getAttribute('href')).toBe(href);
    });
    And('the picture went to the find-refs grind alone, with its language', () => {
      expect(fake.received).toHaveLength(1);
      expect(fake.received[0]!.grist.kind).toBe('find-refs');
      expect(fake.received[0]!.input).toEqual({ language: 'en' });
      expect(fake.received[0]!.attachments).toHaveLength(1);
      expect(fake.received[0]!.attachments[0]!.mime).toBe('image/jpeg');
    });
  });

  Scenario('A grist that fails says so, and Try again reads the picture again', ({ Given, Then, When, And }) => {
    Given('the Share screen is opened with a shared picture, and the mill fails the grist', async () => {
      await open('', true, 'failing');
    });
    Then('the sheet says {string}', async (_, text: string) => {
      expect(await within(sheet()).findByRole('alert')).toHaveTextContent(text);
    });
    When('the mill will answer with the references {string} at {string}', (_, printed: string, ref: string) => {
      fake.kindReplies['find-refs'] = answered([printed, ref]);
    });
    And('he taps {string}', async (_, label: string) => {
      await user.click(within(sheet()).getByRole('button', { name: label }));
    });
    Then('the sheet shows {string} with the link {string}', sheetShows);
  });

  const sheetShowsTwo = async (_: unknown, heading: string, a: string, b: string) => {
    expect(await within(sheet()).findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(links().map((l) => l.textContent)).toEqual([a, b]);
  };
  const sheetShowsLink = async (_: unknown, name: string) => {
    await waitFor(() => expect(links().map((l) => l.textContent)).toContain(name));
  };
  const withWords = (text: string, picture: 'held' | 'failing') => open(text, true, picture);

  Scenario('While a picture is read, the references in its words are already listed', ({ Given, Then, And, When }) => {
    Given('the Share screen is opened with a shared picture and the words {string}, read slowly', (_, text: string) => withWords(text, 'held'));
    Then('the sheet says {string}', async (_, text: string) => {
      expect(await within(sheet()).findByText(text)).toBeInTheDocument();
    });
    And('the sheet shows the link {string}', sheetShowsLink);
    When('the mill answers with the references {string} at {string}', async (_, printed: string, ref: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      await fake.answer(answered([printed, ref]));
    });
    Then('the sheet shows {string} with the links {string} and {string}', sheetShowsTwo);
  });

  Scenario('A picture that fails keeps the references in the words it came with', ({ Given, Then, And, When }) => {
    Given('the Share screen is opened with a shared picture and the words {string}, and the mill fails the grist', (_, text: string) => withWords(text, 'failing'));
    Then('the sheet says {string}', async (_, text: string) => {
      expect(await within(sheet()).findByRole('alert')).toHaveTextContent(text);
    });
    And('the sheet shows the link {string}', sheetShowsLink);
    When('the mill will answer with the references {string} at {string}', (_, printed: string, ref: string) => {
      fake.kindReplies['find-refs'] = answered([printed, ref]);
    });
    And('he taps {string}', async (_, label: string) => {
      await user.click(within(sheet()).getByRole('button', { name: label }));
    });
    Then('the sheet shows {string} with the links {string} and {string}', sheetShowsTwo);
  });

  Scenario('Going back to a share after an opened reference sends no second grist', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a shared picture, read at once with the reference {string} at {string}', async (_, printed: string, ref: string) => {
      await open('', true, { answers: [printed, ref] });
      await within(sheet()).findByRole('heading', { name: 'Bible references (1)' });
    });
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(linkNamed(name));
    });
    And('he taps Open on the card', openOnCard);
    Then('the Reader is open at Romans 8 with verse 28 brought to the top', readerAtEight);
    When('he goes Back', async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    Then('the sheet {string} is there', async (_, name: string) => {
      expect(await screen.findByRole('dialog', { name })).toBeInTheDocument();
    });
    And('only one grist went to the mill', () => {
      expect(fake.received).toHaveLength(1);
    });
  });

  Scenario('Offline, the line says the phone is offline and offers Try again', ({ Given, Then, And, When }) => {
    Given('the Share screen is opened with a shared picture, and the phone is offline', async () => {
      await open('', true, 'offline');
    });
    Then('the sheet says {string}', async (_, text: string) => {
      expect(await within(sheet()).findByRole('alert')).toHaveTextContent(text);
    });
    And('the sheet offers {string}', (_, label: string) => {
      expect(within(sheet()).getByRole('button', { name: label })).toBeInTheDocument();
    });
    When('the phone is online again and the mill will answer with the references {string} at {string}', (_, printed: string, ref: string) => {
      onLine?.mockRestore();
      onLine = undefined;
      fake.down = false;
      fake.kindReplies['find-refs'] = answered([printed, ref]);
    });
    And('he taps {string}', async (_, label: string) => {
      await user.click(within(sheet()).getByRole('button', { name: label }));
    });
    Then('the sheet shows {string} with the link {string}', sheetShows);
  });

  Scenario('Going back from the card of an Old Testament reference sends no second grist', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a shared picture, read at once with the reference {string} at {string}', async (_, printed: string, ref: string) => {
      await open('', true, { answers: [printed, ref] });
      await within(sheet()).findByRole('heading', { name: 'Bible references (1)' });
    });
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(linkNamed(name));
    });
    Then('a card headed {string} says {string}', async (_, heading: string, line: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      // an English verse is drawn in chunks, so the text is read from the passage whole
      await waitFor(() => expect((dialog.textContent ?? '').replace(/\s+/g, ' ')).toMatch(new RegExp(line)));
    });
    When('he goes Back', async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    Then('the sheet {string} is not there', (_, name: string) => {
      expect(screen.queryByRole('dialog', { name })).toBeNull();
    });
    And('the sheet shows the link {string} again', async (_, name: string) => {
      expect(linkNamed(name)).toBeInTheDocument();
    });
    And('only one grist went to the mill', () => {
      expect(fake.received).toHaveLength(1);
    });
  });
  Scenario('Let the tutor do it saves the references as a list: the tutor fills where and the name, and its Send saves', ({ Given, When, Then, And }) => {
    const panel = () => screen.getByRole('region', { name: 'The tutor is helping with this form' });
    const form = () => sheet().querySelector('form') as HTMLFormElement;
    const tutor = (answer: string, ask: string | undefined, values: { field: string; value: string }[] = []) => {
      fake.autoReply = { status: 'answered', answer: { answer, words: [], ...(values.length ? { form_values: values } : {}), ...(ask ? { form_ask: ask } : {}) } };
    };
    const asks = async (_: unknown, question: string) => {
      await waitFor(() => expect(within(panel()).getByText(question)).toBeInTheDocument());
    };
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    When('he taps {string}', async (_, label: string) => {
      await user.click(within(sheet()).getByRole('button', { name: label }));
    });
    And('he lets the tutor do it above the form', async () => {
      tutor('Where should these go: a new list, or one you have?', 'where');
      await user.click(within(sheet()).getByRole('button', { name: 'Let the tutor do it' }));
    });
    Then('the tutor asks one question: {string}', asks);
    When('he answers {string} and the tutor fills where with {string}', async (_, said: string, value: string) => {
      tutor('What should the list be called?', 'name', [{ field: 'where', value }]);
      await user.type(within(panel()).getByRole('textbox', { name: 'Your answer' }), said);
      await user.click(within(panel()).getByRole('button', { name: 'Reply' }));
    });
    Then('the field {string} holds {string} and is ringed', async (_, label: string, value: string) => {
      const select = await within(form()).findByRole('combobox', { name: label });
      expect(within(select as HTMLElement).getByRole('option', { name: value, selected: true })).toBeInTheDocument();
      expect(select.className).toMatch(/ring-accent/);
    });
    And('the tutor asks one question: {string}', asks);
    When('he answers {string} and the tutor fills name with {string}', async (_, said: string, value: string) => {
      tutor('That is everything I need.', undefined, [{ field: 'name', value }]);
      await user.type(within(panel()).getByRole('textbox', { name: 'Your answer' }), said);
      await user.click(within(panel()).getByRole('button', { name: 'Reply' }));
    });
    Then('the field {string} holds {string}', async (_, label: string, value: string) => {
      await waitFor(() => expect(within(form()).getByRole('textbox', { name: label })).toHaveValue(value));
    });
    And('the panel shows {string} with a Send button', async (_, offer: string) => {
      await waitFor(() => expect(within(panel()).getByText(offer)).toBeInTheDocument());
      expect(within(panel()).getByRole('button', { name: 'Send' })).toBeEnabled();
    });
    And('no list is kept yet', async () => {
      expect(await listVerseLists()).toHaveLength(0);
    });
    When('he taps Send in the panel', async () => {
      await user.click(within(panel()).getByRole('button', { name: 'Send' }));
    });
    Then('the sheet shows {string} with Open', async (_, line: string) => {
      const status = await within(sheet()).findByTestId('saved-as-list');
      expect(status).toHaveTextContent(line);
      expect(within(status).getByRole('button', { name: 'Open' })).toBeInTheDocument();
    });
    And('one list {string} holds {string} then {string}', async (_, name: string, a: string, b: string) => {
      const lists = await listVerseLists();
      expect(lists).toHaveLength(1);
      expect(lists[0]).toMatchObject({ name, refs: [a, b] });
    });
  });
});
