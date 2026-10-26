// features/steps/old-testament.steps.tsx — runs features/old-testament.feature: the Reader reads the Old Testament in English (Jonah 1 is the copy in tests/fixtures/data/jon/1.json,
// scripts/fixture-chapter.mjs): the picker lists the 66 books, the chapter opens with no English | Greek switch and no weave, a tap on a chunk opens the English word sheet, Listen and Read
// from the top speak English, Malachi 4 runs into Matthew 1, and Read in Logos / Listen in Audible stand at the foot of the chapter (the Logos app's own link, ref.ly only when the page stays in front).
// Settings > Bible in Logos picks the Bible. Speech is voice-kit's honest fake (tests/support/fake-speech.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { BOOKS, bookOf } from '../../src/data/books';
import { db } from '../../src/data/db';
import { getStudyChapter } from '../../src/data/readerChapter';
import { createVerseList } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { audibleStartOf } from '../../src/resources/audioBible';
import { englishDictionaryLink } from '../../src/resources/logos';
import { chapterLink } from '../../src/resources/logosBible';
import { browserEnv } from '../../src/resources/openApp';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { LONG_PRESS_MS } from '../../src/ui/longPress';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';
import { openSettingsGroup } from '../../tests/support/settings-pages';

const user = userEvent.setup();

let timers: (() => void)[] = [];
let opened: string[] = [];
let asked: string[] = [];
let synth: FakeSynth | undefined;
let fake: FakePostern | undefined;
const PHONE_KEY = '00'.repeat(31) + '02';

/** What a phone can be given besides settings: a licence (a tutor behind a fake Postern, a recogniser), navigator.share, the action the Verse view kept. */
interface Phone {
  licensed?: boolean;
  share?: boolean;
  kept?: string;
}

// The scenario's steps are tests of their own, so the stubs live until the file ends rather than until each step does.
const real = { ...browserEnv };

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** Opens the app on a chapter (the address names it), with these settings saved and, when asked, a phone that speaks. */
async function openOn(title: string, settings: Record<string, string> = {}, speaks = false, phone: Phone = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window.navigator, 'share');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--lp-scale');
  stubChapterFetch();
  fake = undefined;
  if (phone.licensed) {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
    tutorTimings.pollMs = 20;
    const postern = makeFakePostern();
    postern.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
    fake = postern;
    stubRecognizer();
    const chapterFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? postern.fetch(input, init) : chapterFetch(input, init)));
  }
  if (phone.share) Object.defineProperty(window.navigator, 'share', { configurable: true, value: () => Promise.resolve() });
  if (phone.kept) localStorage.setItem('lampas.verseAction', phone.kept);
  synth = speaks ? stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]) : undefined;
  timers = [];
  opened = [];
  asked = [];
  browserEnv.after = (fn) => {
    timers.push(fn);
    return () => {
      timers = timers.filter((t) => t !== fn);
    };
  };
  browserEnv.onAway = () => () => {};
  browserEnv.open = (url) => void opened.push(url);
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const withLogos = (on: boolean): Record<string, string> => (on ? { 'resource.logos': 'on' } : {});
const withAudio = (on: boolean): Record<string, string> => (on ? { audioBible: 'word-of-promise' } : {});
const openRomans = (settings: Record<string, string>): Promise<void> => openOn('Romans 8', settings);

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const chunkEl = (verse: number, text: string): HTMLElement => {
  const found = [...verseEl(verse).querySelectorAll<HTMLElement>('[data-chunk]')].find((el) => squash(el.textContent) === text);
  if (!found) throw new Error(`no chunk "${text}" in verse ${verse}`);
  return found;
};
const reader = (): HTMLElement => document.querySelector<HTMLElement>('[data-reader]') as HTMLElement;
const foot = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-chapter-actions]');
/** The foot's actions are drawn when the settings they rest on have loaded. */
const footDrawn = async (): Promise<HTMLElement> => {
  await waitFor(() => expect(foot()).not.toBeNull());
  return foot() as HTMLElement;
};
const nav = (): Promise<HTMLElement> => screen.findByRole('navigation', { name: 'Chapters' });
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'English word' });
const speakingBar = (): HTMLElement => screen.getByRole('region', { name: 'Speaking' });
const onBar = (name: string): HTMLElement | null => within(speakingBar()).queryByRole('button', { name });
const speakingBarShows = (_: unknown, a: string, b: string, c: string): void => {
  for (const name of [a, b, c]) expect(onBar(name), name).not.toBeNull();
};
const lastSpoken = () => {
  const spoken = synth?.spoken ?? [];
  return spoken[spoken.length - 1];
};

/** The phone has just been given a sentence of verse `n` (the reading is cut into sentences, and a verse is queued whole) in this language. */
const saysVerse = (n: number, lang: string): void => {
  const verse = squash(verseEl(n).querySelector('[data-text]')?.textContent);
  expect(lastSpoken().lang).toBe(lang);
  expect(verse).toContain(lastSpoken().text);
};

const openPicker = async (): Promise<void> => {
  await user.click(within(screen.getByRole('heading', { level: 1 })).getByRole('button'));
  await screen.findByRole('dialog', { name: 'Choose a chapter' });
};
const picker = (): HTMLElement => screen.getByRole('dialog', { name: 'Choose a chapter' });
const chooseBook = async (name: string): Promise<void> => {
  await user.click(within(picker()).getByRole('button', { name: new RegExp(`^${name}`) }));
};
const chapters = (): number[] => [...picker().querySelectorAll('[data-chapter]')].map((el) => Number(el.getAttribute('data-chapter')));
const pickChapter = (n: number) => async (): Promise<void> => {
  await user.click(await within(picker()).findByRole('button', { name: `Chapter ${n}` }));
};
const headed = (_: unknown, title: string): void => {
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
};
const link = async (name: string): Promise<HTMLElement> => within(await footDrawn()).getByRole('link', { name: new RegExp(name) });

const openSettings = async (): Promise<void> => {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await openSettingsGroup(user, 'study');
};

const reopen = async (): Promise<void> => {
  cleanup();
  clearBus();
  render(<App />);
  // the page he was on, Library > Bibles, is what reopens
  await screen.findByRole('heading', { name: 'Bibles', level: 1 });
};
const resourceId = (): HTMLInputElement => screen.getByRole('textbox', { name: 'Resource ID' });

const feature = await loadFeature('features/old-testament.feature');

describeFeature(feature, ({ Scenario }) => {
  const romansLogos = 'Lampas is opened on Romans 8 with Logos on';
  const jonahLogos = 'Lampas is opened on Jonah 1 with Logos on';
  const phone = 'Lampas is opened on Jonah 1 on a phone with an English, a Greek and a Hebrew voice';
  const tapChunk = (_: unknown, text: string, verse: number) => user.click(chunkEl(verse, text));
  const readFromTop = () => user.click(screen.getByRole('button', { name: 'Read from the top' }));

  Scenario('The picker lists the 66 books and opens Jonah 1 in the Reader', ({ Given, When, Then, And }) => {
    Given(romansLogos, () => openRomans(withLogos(true)));
    When('he taps the title', openPicker);
    Then('the picker lists the 66 books from {string} to {string} in order, {string} before {string}', (_, first: string, last: string, before: string, after: string) => {
      const rows = [...picker().querySelectorAll('[data-book]')];
      expect(rows.map((r) => r.querySelector('[data-book-name]')?.textContent)).toEqual(BOOKS.map((b) => b.name));
      expect(rows).toHaveLength(66);
      expect(rows[0].querySelector('[data-book-name]')?.textContent).toBe(first);
      expect(rows[65].querySelector('[data-book-name]')?.textContent).toBe(last);
      const names = rows.map((r) => r.querySelector('[data-book-name]')?.textContent);
      expect(names.indexOf(after) - names.indexOf(before)).toBe(1);
      expect(picker().querySelector('[data-in-logos]')).toBeNull();
    });
    When('he chooses the book {string}', (_, name: string) => chooseBook(name));
    Then('the picker lists chapters {int} to {int}', async (_, from: number, to: number) => {
      await waitFor(() => expect(chapters()).toEqual(Array.from({ length: to - from + 1 }, (_, i) => from + i)));
    });
    When('he picks chapter {int}', async (_, n: number) => pickChapter(n)());
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    And('the picker is closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Choose a chapter' })).toBeNull());
    });
  });

  Scenario('The English shows with its verse numbers and headings', ({ Given, Then, And }) => {
    Given(jonahLogos, () => openOn('Jonah 1', withLogos(true)));
    Then('the reader shows verses {int} to {int} with their numbers', (_, from: number, to: number) => {
      const numbers = [...document.querySelectorAll('[data-verse]')].map((el) => Number(el.getAttribute('data-verse')));
      expect(numbers).toEqual(Array.from({ length: to - from + 1 }, (_, i) => from + i));
      for (const n of numbers) expect(within(verseEl(n)).getByRole('button', { name: `Verse ${n}` })).toBeInTheDocument();
    });
    And('verse {int} reads {string}', (_, n: number, text: string) => {
      expect(squash(verseEl(n).querySelector('[data-text]')?.textContent)).toBe(text);
    });
    And('the heading {string} stands before verse {int}', (_, text: string) => {
      const heading = screen.getByText(text);
      expect(heading.compareDocumentPosition(verseEl(1)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  Scenario('The switch reads English | Hebrew, and his saved view opens Jonah 1 in Hebrew and Matthew 1 in Greek', ({ Given, Then, And, When }) => {
    Given('Lampas is opened on Jonah 1 with the Greek view and the Weave on Solid words saved', () =>
      openOn('Jonah 1', { readerView: 'greek', weave: 'solid' }),
    );
    Then('the reader is in the {string} view', async (_, view: string) => {
      await waitFor(() => expect(reader().getAttribute('data-view')).toBe(view));
    });
    And('the language switch offers {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      expect(within(screen.getByRole('group', { name: 'Language' })).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b, c]);
    });
    And('the saved view is still {string} and the saved Weave is still {string}', async (_, view: string, weave: string) => {
      expect((await db.settings.get('readerView'))?.value).toBe(view);
      expect((await db.settings.get('weave'))?.value).toBe(weave);
    });
    When('he opens Matthew 1 from the picker', async () => {
      await openPicker();
      await chooseBook('Matthew');
      await pickChapter(1)();
      await screen.findByRole('heading', { name: 'Matthew 1', level: 1 });
    });
    Then('Matthew 1 is in the {string} view', async (_, view: string) => {
      await waitFor(() => expect(reader().getAttribute('data-view')).toBe(view));
    });
    And('its switch reads {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      expect(within(screen.getByRole('group', { name: 'Language' })).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b, c]);
    });
  });

  Scenario('His other settings apply to an Old Testament chapter', ({ Given, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with Theme Dark, Text size Largest and Turn pages', () =>
      openOn('Jonah 1', { theme: 'dark', textSize: '160', readingMode: 'pages' }),
    );
    Then('the page is dark', () => waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark')));
    And("the page text is at {int}% of the phone's size", (_, percent: number) =>
      waitFor(() => expect(Math.round(Number.parseFloat(document.documentElement.style.getPropertyValue('--lp-scale')) * 100)).toBe(percent)),
    );
    And('the reader turns pages', () => expect(reader().getAttribute('data-paging')).toBe('pages'));
  });

  Scenario('A tap on "fish" opens the English word sheet with a Webster\'s row for it', ({ Given, When, Then, And }) => {
    Given(jonahLogos, () => openOn('Jonah 1', withLogos(true)));
    When('he taps the chunk {string} of verse {int}', tapChunk);
    Then('the English word sheet opens headed {string}', async (_, word: string) => {
      await screen.findByRole('dialog', { name: 'English word' });
      expect(within(sheet()).getByTestId('english-word')).toHaveTextContent(word);
    });
    And('it has one {string} link to {string} in Webster\'s 1828', (_, name: string, word: string) => {
      const links = within(sheet()).getAllByRole('link', { name });
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toBe(englishDictionaryLink(word)?.url);
    });
    And('the Greek word sheet is not opened', () => {
      expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull();
    });
  });

  Scenario('A chunk of two words lists two rows', ({ Given, When, Then, And }) => {
    Given(jonahLogos, () => openOn('Jonah 1', withLogos(true)));
    When('he taps the chunk {string} of verse {int}', tapChunk);
    Then('the English word sheet opens headed {string}', async (_, word: string) => {
      await screen.findByRole('dialog', { name: 'English word' });
      expect(within(sheet()).getByTestId('english-word')).toHaveTextContent(word);
    });
    And('it lists the words {string} and {string}, each with its Listen', (_, a: string, b: string) => {
      const items = within(sheet()).getAllByRole('listitem');
      expect(items.map((li) => squash(li.querySelector('[lang="en"]')?.textContent))).toEqual([a, b]);
      for (const [i, word] of [a, b].entries()) expect(within(items[i]).getByRole('button', { name: `Listen: ${word}` })).toBeInTheDocument();
    });
    And('it has the links {string} and {string}', (_, a: string, b: string) => {
      const links = within(sheet()).getAllByRole('link');
      expect(links.map((l) => l.textContent)).toEqual([a, b]);
      expect(links[1].getAttribute('href')).toBe(englishDictionaryLink('amittai')?.url);
    });
  });

  Scenario('With Logos off the English word sheet offers to turn it on', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with Logos off', () => openOn('Jonah 1', withLogos(false)));
    When('he taps the chunk {string} of verse {int}', tapChunk);
    Then('the English word sheet opens headed {string}', async (_, word: string) => {
      await screen.findByRole('dialog', { name: 'English word' });
      expect(within(sheet()).getByTestId('english-word')).toHaveTextContent(word);
    });
    And('it says {string}', (_, text: string) => {
      expect(sheet()).toHaveTextContent(text);
    });
  });

  Scenario('A long press on a chunk says it in English', ({ Given, When, Then, And }) => {
    Given(phone, () => openOn('Jonah 1', {}, true));
    When('he long presses the chunk {string} of verse {int}', async (_, text: string, verse: number) => {
      const target = chunkEl(verse, text);
      await user.pointer({ keys: '[MouseLeft>]', target });
      await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 150));
      await user.pointer({ keys: '[/MouseLeft]', target });
    });
    Then('the phone says {string} in {string}', (_, text: string, lang: string) => {
      expect(lastSpoken()).toMatchObject({ text, lang });
    });
    And('no English word sheet opens', () => {
      expect(screen.queryByRole('dialog', { name: 'English word' })).toBeNull();
    });
  });

  Scenario('Read from the top reads the English in an English voice and never asks for the Greek one', ({ Given, When, Then, And }) => {
    Given(phone, () => openOn('Jonah 1', {}, true));
    When('he taps Read from the top', readFromTop);
    Then('the phone speaks the English of verse {int} in {string}', (_, n: number, lang: string) => saysVerse(n, lang));
    And('verse {int} is highlighted as being read', (_, n: number) => expect(verseEl(n).hasAttribute('data-reading')).toBe(true));
    And('the speaking bar shows Pause, Restart and Stop', () => speakingBarShows(null, 'Pause', 'Restart', 'Stop'));
    When('the phone finishes speaking verse {int}', () => {
      synth?.finish();
    });
    Then('the phone goes on to the English of verse {int} in {string}', (_, n: number, lang: string) => saysVerse(n, lang));
    And('every voice asked for so far is English', () => {
      expect(synth?.spoken.length).toBeGreaterThan(1);
      for (const u of synth?.spoken ?? []) {
        expect(u.lang).toBe('en-US');
        expect(u.voice).toBe(ENGLISH_VOICE);
      }
    });
  });

  Scenario('Pause keeps the verse and Resume goes on from it', ({ Given, And, When, Then }) => {
    Given(phone, () => openOn('Jonah 1', {}, true));
    And('he taps Read from the top', readFromTop);
    And('the phone finishes speaking verse {int}', () => {
      synth?.finish();
    });
    When('he taps Pause on the speaking bar', () => user.click(onBar('Pause') as HTMLElement));
    Then('the speaking bar shows Resume, Restart and Stop', () => speakingBarShows(null, 'Resume', 'Restart', 'Stop'));
    When('he taps Resume on the speaking bar', () => user.click(onBar('Resume') as HTMLElement));
    Then('the phone speaks the English of verse {int} in {string}', (_, n: number, lang: string) => saysVerse(n, lang));
    And('the speaking bar shows Pause, Restart and Stop', () => speakingBarShows(null, 'Pause', 'Restart', 'Stop'));
  });

  Scenario('A word he has the phone say pauses the reading and Resume goes on from it', ({ Given, And, When, Then }) => {
    Given(phone, () => openOn('Jonah 1', {}, true));
    And('he taps Read from the top', readFromTop);
    And('the phone finishes speaking verse {int}', () => {
      synth?.finish();
    });
    When('he taps the chunk {string} of verse {int}', tapChunk);
    And('he taps Listen on the English word sheet', async () => {
      await screen.findByRole('dialog', { name: 'English word' });
      await user.click(within(sheet()).getByRole('button', { name: 'Listen' }));
    });
    Then('the reading is paused', () => expect(getReading().status).toBe('paused'));
    And('the phone is saying {string} alone', (_, word: string) => expect(lastSpoken()).toMatchObject({ text: word, lang: 'en-US' }));
    When('the phone finishes the word', () => {
      synth?.finish();
    });
    Then('the speaking bar shows Resume, Restart and Stop', () => speakingBarShows(null, 'Resume', 'Restart', 'Stop'));
    When('he taps Resume on the speaking bar', () => user.click(onBar('Resume') as HTMLElement));
    Then('the reading goes on from verse {int}', async (_, n: number) => {
      await waitFor(() => expect(getReading().status).toBe('reading'));
      saysVerse(n, 'en-US');
    });
    And('the speaking bar shows Pause, Restart and Stop', () => speakingBarShows(null, 'Pause', 'Restart', 'Stop'));
  });

  Scenario('Malachi 4 is followed by Matthew 1, and Matthew 1 is preceded by Malachi 4', ({ Given, Then, When, And }) => {
    Given('Lampas is opened on Malachi 4 with Logos on', () => openOn('Malachi 4', withLogos(true)));
    Then('the foot of the chapter has a button {string} and a button {string}', async (_, a: string, b: string) => {
      const foot = await nav();
      expect(within(foot).getByRole('button', { name: a })).toBeInTheDocument();
      expect(within(foot).getByRole('button', { name: b })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, name: string) => user.click(within(await nav()).getByRole('button', { name })));
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    And('the foot of the chapter has a button {string}', async (_, name: string) => {
      expect(await within(await screen.findByRole('navigation', { name: 'Chapters' })).findByRole('button', { name })).toBeInTheDocument();
    });
  });

  Scenario('Genesis 1 has no chapter before it', ({ Given, Then }) => {
    Given('Lampas is opened on Genesis 1 with Logos on', () => openOn('Genesis 1', withLogos(true)));
    Then('the foot of the chapter has a button {string} and no button before it', async (_, next: string) => {
      expect(within(await nav()).getAllByRole('button').map((b) => b.textContent)).toEqual([next]);
    });
  });

  Scenario('Read in Logos is at the foot of an opened chapter in his default Bible and the chapter stays open', ({ Given, Then, When, And }) => {
    Given(jonahLogos, () => openOn('Jonah 1', withLogos(true)));
    Then('{string} is at the foot of the chapter with the link {string}', async (_, name: string, url: string) => {
      expect((await link(name)).getAttribute('href')).toBe(url);
    });
    When('he taps {string}', async (_, name: string) => {
      const a = await link(name);
      asked.push(a.getAttribute('href') ?? '');
      await user.click(a);
    });
    Then('Logos is asked for {string}', (_, url: string) => {
      expect(asked).toEqual([url]);
    });
    And('the reader is headed {string}', headed);
  });

  Scenario('The https address is the fallback only when the phone cannot open the app', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Psalms 23 with Logos on', () => openOn('Psalms 23', withLogos(true)));
    When('he taps {string}', async (_, name: string) => user.click(await link(name)));
    And('the page stays in front for the wait', () => {
      for (const t of [...timers]) t();
    });
    Then('the address {string} was opened', (_, url: string) => {
      expect(opened).toEqual([url]);
    });
  });

  Scenario('The Bible he chose in Settings is the one that opens', ({ Given, When, Then }) => {
    Given('Lampas is opened on Malachi 4 with Logos on and the Bible in Logos {string}', (_, id: string) =>
      openOn('Malachi 4', { ...withLogos(true), logosBible: id }),
    );
    When('he taps {string}', async (_, name: string) => {
      const a = await link(name);
      asked.push(a.getAttribute('href') ?? '');
      await user.click(a);
    });
    Then('Logos is asked for {string}', (_, url: string) => {
      expect(asked).toEqual([url]);
    });
  });

  const judges = (logos: boolean, audio: boolean) => () => openOn('Judges 3', { ...withLogos(logos), ...withAudio(audio) });
  const offers = async (_: unknown, title: string, ...names: string[]): Promise<void> => {
    const actions = await footDrawn();
    expect(actions).toHaveAccessibleName(`${title}: read or listen`);
    expect([...actions.querySelectorAll('a')].map((l) => l.textContent)).toEqual(names);
  };

  Scenario('With Logos on and the Audio Bible on the chapter offers both, and Listen in Audible names the chapter to pick', ({ Given, Then, And }) => {
    Given('Lampas is opened on Judges 3 with Logos on and the Audio Bible on', judges(true, true));
    Then('the foot of Judges 3 offers {string} and {string}', (_, a: string, b: string) => offers(null, 'Judges 3', a, b));
    And('the foot says {string}', async (_, text: string) => {
      expect(await footDrawn()).toHaveTextContent(text);
    });
    And("{string} is the chapter's Logos link", async (_, name: string) => {
      expect((await link(name)).getAttribute('href')).toBe(chapterLink('jdg', 3, 'LLS:LGCYSTNDRDBBLSB')?.url);
    });
    And("{string} is Audible's link at the start of Judges 3", async (_, name: string) => {
      expect(new URL((await link(name)).getAttribute('href') ?? '').searchParams.get('position_from_start')).toBe(String(audibleStartOf('jdg', 3)));
    });
  });

  Scenario('With only Logos on the foot offers the one action', ({ Given, Then }) => {
    Given('Lampas is opened on Judges 3 with Logos on and the Audio Bible off', judges(true, false));
    Then('the foot of Judges 3 offers only {string}', (_, only: string) => offers(null, 'Judges 3', only));
  });

  Scenario('With only the Audio Bible on the foot offers the one action', ({ Given, Then }) => {
    Given('Lampas is opened on Judges 3 with Logos off and the Audio Bible on', judges(false, true));
    Then('the foot of Judges 3 offers only {string}', (_, only: string) => offers(null, 'Judges 3', only));
  });

  Scenario('With both off the foot offers neither', ({ Given, Then }) => {
    Given('Lampas is opened on Judges 3 with Logos off and the Audio Bible off', judges(false, false));
    Then('the foot of Judges 3 offers nothing outside Lampas', async () => {
      await nav();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(foot()).toBeNull();
      expect(bookOf('jdg')?.name).toBe('Judges');
    });
  });

  Scenario('A New Testament chapter has no Read in Logos at its foot', ({ Given, Then }) => {
    Given(romansLogos, () => openRomans(withLogos(true)));
    Then('there is no {string} at the foot of the chapter', async (_, name: string) => {
      await nav();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(foot()).toBeNull();
      expect(screen.queryByRole('link', { name })).toBeNull();
    });
  });

  const opensRow = async () => {
    await user.click(await screen.findByRole('button', { name: /^Bible in Logos:/ }));
    await screen.findByRole('heading', { name: 'Bibles', level: 1 });
  };
  const pageSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent(text));
  };

  Scenario('Settings has Bible in Logos, the Legacy Standard Bible to start, and it opens Library > Bibles', ({ Given, When, Then, And }) => {
    Given(romansLogos, () => openRomans(withLogos(true)));
    When("he taps the gear in the reader's header", openSettings);
    Then('the Bible in Logos row says {string}', async (_, text: string) => {
      expect(await screen.findByRole('button', { name: new RegExp(`^${text}`) })).toBeInTheDocument();
    });
    When('he opens the Bible in Logos row', opensRow);
    Then('the Bibles page says {string}', pageSays);
    And('the Resource ID field holds {string}', async (_, id: string) => {
      await waitFor(() => expect(resourceId().value).toBe(id));
    });
  });

  Scenario('A Bible chosen on the Bibles page is kept across a close', ({ Given, When, And, Then }) => {
    Given(romansLogos, () => openRomans(withLogos(true)));
    When("he taps the gear in the reader's header", openSettings);
    And('he opens the Bible in Logos row', opensRow);
    And('he chooses the Bible {string} on the Bibles page', async (_, short: string) => {
      await user.click(within(await screen.findByRole('radiogroup', { name: short })).getByRole('radio', { name: 'Chosen' }));
    });
    And('the app is closed and opened again', async () => {
      await waitFor(async () => expect((await db.settings.get('logosBible'))?.value).toBe('LLS:1.0.710'));
      await reopen();
    });
    Then('the Bibles page says {string}', pageSays);
  });

  Scenario('A typed Resource ID is kept across a close, and a malformed one is not', ({ Given, When, And, Then }) => {
    Given(romansLogos, () => openRomans(withLogos(true)));
    When("he taps the gear in the reader's header", openSettings);
    And('he opens the Bible in Logos row', opensRow);
    And('he types the Resource ID {string}', async (_, id: string) => {
      await user.clear(resourceId());
      await user.type(resourceId(), id);
    });
    Then('the Resource ID field says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent(text));
    });
    And('the setting {string} holds nothing', async (_, key: string) => {
      expect((await db.settings.get(key))?.value).toBeUndefined();
    });
    When('he types the Resource ID {string}', async (_, id: string) => {
      await user.clear(resourceId());
      await user.type(resourceId(), id);
    });
    And('the app is closed and opened again', async () => {
      await waitFor(async () => expect((await db.settings.get('logosBible'))?.value).toBe('LLS:1.0.9991'));
      await reopen();
    });
    Then('the Bibles page says {string}', pageSays);
    And('the Resource ID field holds {string}', async (_, id: string) => {
      await waitFor(() => expect(resourceId().value).toBe(id));
    });
  });

  const viewEl = (): HTMLElement => screen.getByRole('region', { name: 'Verse view' });
  const tapVerseNumber = async (_: unknown, n: number): Promise<void> => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const actionNames = (): string[] =>
    [...within(screen.getByRole('group', { name: 'Actions' })).getAllByRole('button')].map((b) => b.textContent?.trim() ?? '');
  const phoneLicensed = 'Lampas is opened on Jonah 1 with a licence';

  Scenario('The Verse view of Jonah 1:10 offers Listen, Read it aloud, Ask the tutor and Share', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with a licence and a phone that can share', () => openOn('Jonah 1', {}, false, { licensed: true, share: true }));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('the Verse view is headed {string}', async (_, reference: string) => {
      await waitFor(() => expect(within(viewEl()).getByRole('heading', { name: reference })).toBeInTheDocument());
    });
    And('the Verse view shows the verse in English', () => {
      const verse = viewEl().querySelector<HTMLElement>('[data-sheet-verse]') as HTMLElement;
      expect(squash(verse.textContent)).toContain('The men knew that he was fleeing from the presence of the LORD');
    });
    And('the Verse view offers the actions {string}, {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string, e: string) => {
      expect(actionNames()).toEqual([a, b, c, d, e]);
    });
    And('the Verse view has no {string} and no {string}', (_, a: string, b: string) => {
      for (const name of [a, b]) expect(within(viewEl()).queryByRole('button', { name, exact: true }), name).toBeNull();
    });
  });

  Scenario('Quiz me kept from a New Testament verse opens an Old Testament verse on Listen and is kept', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with a licence and the kept action {string}', (_, kept: string) => openOn('Jonah 1', {}, false, { licensed: true, kept }));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('the chosen action of the Verse view is {string}', (_, name: string) => {
      const pressed = within(screen.getByRole('group', { name: 'Actions' })).getAllByRole('button', { pressed: true });
      expect(pressed.map((b) => b.textContent?.trim())).toEqual([name]);
    });
    And('the kept action is still {string}', (_, kept: string) => {
      expect(localStorage.getItem('lampas.verseAction')).toBe(kept);
    });
  });

  Scenario('Ask the tutor about Jonah 1:10 sends the English verse and its reference', ({ Given, When, Then, And }) => {
    Given(phoneLicensed, () => openOn('Jonah 1', {}, false, { licensed: true }));
    When('he taps the number of verse {int}', tapVerseNumber);
    And('he chooses the action {string}', async (_, name: string) => {
      await user.click(within(viewEl()).getByRole('button', { name, exact: true }));
    });
    And('he types the question {string} and sends it', async (_, question: string) => {
      await user.click(await within(viewEl()).findByRole('button', { name: 'Type a question' }));
      await user.type(await within(viewEl()).findByRole('textbox', { name: 'Your question' }), question);
      await user.click(within(viewEl()).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received one verse-ask grist about {string} with the English {string} and no Greek', async (_, reference: string, english: string) => {
      await waitFor(() => expect(fake?.received).toHaveLength(1));
      const received = fake?.received[0];
      expect(received?.grist).toMatchObject({ app: 'lampas', kind: 'verse-ask' });
      expect(received?.input.reference).toBe(reference);
      expect(String(received?.input.english)).toContain(english);
      expect(received?.input.greek).toBe('');
      expect(received?.input.greek_words).toBeUndefined();
    });
  });

  Scenario('The Verse view of Jonah 1:10 opens the verse in his Bible in Logos', ({ Given, When, Then }) => {
    Given(jonahLogos, () => openOn('Jonah 1', withLogos(true)));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('{string} links to {string}', async (_, name: string, href: string) => {
      const door = await within(viewEl()).findByRole('link', { name: new RegExp(name) });
      expect(door.getAttribute('href')).toBe(href);
    });
  });

  Scenario('Copy link on an Old Testament verse writes its OSIS reference', ({ Given, When, Then }) => {
    Given(jonahLogos, () => openOn('Jonah 1', withLogos(true)));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then("the Verse view's link is {string}", async (_, url: string) => {
      const written: string[] = [];
      Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (text: string) => (written.push(text), Promise.resolve()) } });
      await user.click(within(viewEl()).getByRole('button', { name: 'Copy link' }));
      await waitFor(() => expect(written).toEqual([url]));
    });
  });

  Scenario('A verse list holding Jonah 1:10 shows its English text on the card', ({ Given, When, Then, And }) => {
    Given('a verse list {string} holding {string} and {string} is opened', async (_, name: string, a: string, b: string) => {
      await openOn('Romans 8', withLogos(true));
      const list = await createVerseList(name, [a, b], 1);
      cleanup();
      window.history.replaceState(null, '', `/#/lists/${list.id}`);
      render(<App />);
      await screen.findByRole('heading', { name, level: 1 });
    });
    When('he taps the reference {string} on the list', async (_, name: string) => {
      await user.click(await screen.findByRole('link', { name }));
    });
    Then('the card {string} shows {string}', async (_, heading: string, text: string) => {
      const card = await screen.findByRole('dialog', { name: heading });
      await waitFor(() => expect(squash(card.querySelector('[data-reference-text]')?.textContent)).toContain(text));
      expect(card.querySelector('[data-reference-text]')?.getAttribute('data-view')).toBe('english');
    });
    And('the list offers Memorize on the row of {string}', async (_, name: string) => {
      await user.keyboard('{Escape}');
      const row = screen.getByRole('link', { name }).closest('li') as HTMLElement;
      expect(await within(row).findByRole('button', { name: 'Memorize' })).toBeInTheDocument();
    });
  });

  Scenario('Jonah 1:10 is memorized in English', ({ Given, When, Then, And }) => {
    Given(jonahLogos, () => openOn('Jonah 1', withLogos(true)));
    When('he taps the number of verse {int}', tapVerseNumber);
    And('he taps Memorize on the Verse view', async () => {
      await user.click(await within(viewEl()).findByRole('button', { name: 'Memorize' }));
    });
    Then('the Verse view says {string}', async (_, text: string) => {
      await waitFor(() => expect(within(viewEl()).getByRole('button', { name: text })).toBeInTheDocument());
    });
    When('he opens the Memorize session of {string} in English', async (_, ref: string) => {
      cleanup();
      window.history.replaceState(null, '', `/#/memorize/${ref}/en`);
      render(<App />);
    });
    Then('the session says {string}', async (_, text: string) => {
      await waitFor(() => expect(document.body).toHaveTextContent(text));
    });
    And('the session shows {string}', async (_, text: string) => {
      await waitFor(() => expect(squash(document.body.textContent)).toContain(text));
    });
  });

  Scenario('Review, the Quick test and the Parsing drill say nothing about an open Old Testament chapter', ({ Given, When, Then }) => {
    Given(jonahLogos, () => openOn('Jonah 1', withLogos(true)));
    Then('the ladders, the quizzes and Review draw their forms from {string}, not from {string}', (_, studied: string, open: string) => {
      expect(getStudyChapter().title).toBe(studied);
      expect(JSON.parse(localStorage.getItem('lampas.chapter') ?? 'null')).toMatchObject({ book: 'jon', chapter: 1 });
      expect(studied).not.toBe(open);
    });
    When('he opens Review, the Quick test and the Parsing drill in turn', () => undefined);
    Then('each opens with its own heading and no error', async () => {
      for (const [name, hash] of [['Review', '#/review'], ['Quick test', '#/test'], ['Parsing drill', '#/drill']]) {
        window.location.hash = hash;
        await screen.findByRole('heading', { name, level: 1 });
        expect(screen.queryByText(/something went wrong|Reload/i), name).toBeNull();
      }
    });
  });
});
