// features/steps/reading-ladder.steps.tsx — runs features/reading-ladder.feature: the Reading ladder of the Verse view's Read it aloud action and of the Goal
// screen (src/ReadingLadder.tsx, src/data/readingLadder.ts, src/data/repositories/ladder.ts). The ladder lists are the committed public/data/ladder/*.json; the
// readings go through a fake Postern whose mill opens the grist (tests/support/fake-postern.ts) and a fake recorder.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { bookOf } from '../../src/data/books';
import { currentLadderPlace, forgetLadders, refParts, type LadderEntry, type LadderLang } from '../../src/data/readingLadder';
import { getLadderRow, keepVerseReading, setReaderView } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { INCOMPLETE_ANSWER, makeFakePostern, POSTERN_ORIGIN, WELL_READ_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };

const ladders: Record<LadderLang, LadderEntry[]> = {
  el: JSON.parse(readFileSync('public/data/ladder/el.json', 'utf8')) as LadderEntry[],
  en: JSON.parse(readFileSync('public/data/ladder/en.json', 'utf8')) as LadderEntry[],
};
const LISTS: Record<string, LadderLang> = { Greek: 'el', English: 'en' };

/** The first word of a verse's Greek, which a reading with words to fix marks. */
function firstGreekWord(ref: string): string {
  const { book, chapter, verse } = refParts(ref)!;
  const data = JSON.parse(readFileSync(`public/data/${book}/${chapter}.json`, 'utf8')) as { verses: { n: number; g: { t: string }[] }[] };
  return data.verses.find((v) => v.n === verse)!.g[0].t;
}

let fake: FakePostern;
/** While set, a fetch of a ladder list waits for it: the list is on its way (a slow connection). */
let ladderHeld: Promise<void> | null = null;
let letLadderThrough: () => void = () => {};
type Reply = 'well-read' | 'two-words' | 'incomplete';

async function open(startView: 'english' | 'greek', reply: Reply, hash = ''): Promise<void> {
  cleanup();
  clearBus();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = hash;
  stubRecorder();
  FakeRecorder.denied = false;
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  const marks = (ref: string) => ({
    verdict: 'some-to-fix',
    focus_words: [{ word: firstGreekWord(ref), index: 0, chunks: ['one', 'two'], tip: 'Say it slowly.' }],
    note: 'Nearly there: one word to say again.',
  });
  const answer = reply === 'well-read' ? WELL_READ_ANSWER : reply === 'incomplete' ? INCOMPLETE_ANSWER : marks(ladders.el[0].ref);
  fake.autoReply = { status: 'answered', answer };
  stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  stubChapterFetch();
  forgetLadders();
  ladderHeld = null;
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith(POSTERN_ORIGIN)) return fake.fetch(input, init);
    if (ladderHeld && String(input).includes('/data/ladder/')) await ladderHeld;
    return chapterFetch(input, init);
  });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear(), db.readingHistory.clear(), db.missTally.clear(), db.ladder.clear()]);
  await setReaderView(startView);
  await seedHisWords();
  render(<App />);
  if (hash === '') {
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  } else {
    await screen.findByRole('button', { name: 'Reading ladder: Greek', exact: true });
  }
}

/** Closes the app and opens it again on the same phone: the storage stays, the screen starts afresh. */
async function reopen(): Promise<void> {
  cleanup();
  clearBus();
  window.location.hash = '';
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const panel = () => screen.getByRole('region', { name: 'Reading check' });
const verseView = () => screen.getByRole('region', { name: 'Verse view' });

async function openReadCheck(): Promise<void> {
  const number = await screen.findByRole('button', { name: 'Verse 28', exact: true });
  await user.click(number);
  const region = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(region).getByRole('button', { name: 'Read it aloud', exact: true }));
  await screen.findByRole('region', { name: 'Reading check' });
}

/** What the heading of the Verse view says for a ref: 'Romans 8:28'. */
function referenceOf(ref: string): string {
  const { book, chapter, verse } = refParts(ref)!;
  return `${bookOf(book)!.name} ${chapter}:${verse}`;
}

async function onVerse(ref: string): Promise<void> {
  await waitFor(() => expect(within(verseView()).getByRole('heading', { level: 2 })).toHaveTextContent(referenceOf(ref)));
}

async function holdAndLetGo(ms: number): Promise<void> {
  const bar = await screen.findByRole('button', { name: /^Hold to read verse \d+$/ });
  FakeRecorder.durationMs = ms;
  await user.pointer([
    { keys: '[MouseLeft>]', target: bar, coords: AT },
    { keys: '[/MouseLeft]', target: bar, coords: AT },
  ]);
}

const offers = (name: string) => within(panel()).queryByRole('button', { name, exact: true });
const wanted = (names: string[]) => async () => {
  for (const name of names) await waitFor(() => expect(offers(name)).not.toBeNull());
};
const notOffered = (names: string[]) => () => {
  for (const name of names) expect(offers(name)).toBeNull();
};

const feature = await loadFeature('features/reading-ladder.feature');

describeFeature(feature, ({ Scenario }) => {
  const opensGreek = 'Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern';
  const tapsLadder = 'he opens the reading check of verse 28 and taps {string}';
  const sayVerseView = (which: 'first' | 'second', lang: string) => async () => {
    await onVerse(ladders[LISTS[lang]][which === 'first' ? 0 : 1].ref);
  };
  const tapLadder = async (_: unknown, name: string) => {
    await openReadCheck();
    await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    // the ladder moves the Verse view to its verse a moment after the tap: the bar of verse 28 is replaced by the ladder verse's
    await waitFor(() => expect(panel()).toHaveTextContent(/Number \d+ of \d+/));
  };
  const panelSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(panel()).toHaveTextContent(text));
  };

  Scenario('A new reader opens the ladder in Greek on the first verse of the Greek list', ({ Given, When, Then, And }) => {
    Given(opensGreek, () => open('greek', 'well-read'));
    When(tapsLadder, tapLadder);
    Then('the Verse view is on the first verse of the Greek list', sayVerseView('first', 'Greek'));
    And('the reading panel says {string} and the number of verses on the Greek list', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(`${text} ${ladders.el.length}`));
    });
    And('the reading panel does not call the rank {string}, as it is not the verse\'s number in its chapter', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(`Number 1 of ${ladders.el.length}`));
      expect(panel()).not.toHaveTextContent(text);
    });
    And('the reading panel offers {string} and neither {string} nor {string}', async (_, offered: string, a: string, b: string) => {
      await wanted([offered])();
      notOffered([a, b])();
    });
  });

  Scenario('A well-read moves the place and Next verse opens the second verse', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern that finds nothing to fix', () => open('greek', 'well-read'));
    When(tapsLadder, tapLadder);
    And('he reads the verse aloud for 2 seconds', () => holdAndLetGo(2000));
    Then('the reading panel says {string}', panelSays);
    And('the reading panel offers {string} and neither {string} nor {string}', async (_, offered: string, a: string, b: string) => {
      await wanted([offered])();
      notOffered([a, b])();
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    Then('the Verse view is on the second verse of the Greek list', sayVerseView('second', 'Greek'));
    And('the reading panel says {string} and the number of verses on the Greek list', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(`${text} ${ladders.el.length}`));
    });
  });

  Scenario('Words to fix keep the place and offer Try again and Skip for now', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern that marks two words', () => open('greek', 'two-words'));
    When(tapsLadder, tapLadder);
    And('he reads the verse aloud for 2 seconds', () => holdAndLetGo(2000));
    Then('the reading panel says {string}', panelSays);
    And('the reading panel offers {string} and {string} and not {string}', async (_, a: string, b: string, c: string) => {
      await wanted([a, b])();
      notOffered([c])();
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    Then('the reading panel no longer shows the result and says {string} and the number of verses on the Greek list', async (_, text: string) => {
      await waitFor(() => expect(panel().querySelector('[data-reading-result]')).toBeNull());
      expect(panel()).toHaveTextContent(`${text} ${ladders.el.length}`);
    });
    And('the Greek place is still the first verse of the Greek list', async () => {
      expect(await currentLadderPlace('el')).toBe(ladders.el[0].ref);
    });
  });

  Scenario('A reading of only part of the verse keeps the place too', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern that heard only part of the verse', () => open('greek', 'incomplete'));
    When(tapsLadder, tapLadder);
    And('he reads the verse aloud for 2 seconds', () => holdAndLetGo(2000));
    Then('the reading panel says {string}', panelSays);
    And('the reading panel offers {string} and {string} and not {string}', async (_, a: string, b: string, c: string) => {
      await wanted([a, b])();
      notOffered([c])();
    });
  });

  Scenario('Skip for now moves on and remembers the verse', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern that marks two words', () => open('greek', 'two-words'));
    When(tapsLadder, tapLadder);
    And('he reads the verse aloud for 2 seconds', () => holdAndLetGo(2000));
    And('he taps {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    Then('the Verse view is on the second verse of the Greek list', sayVerseView('second', 'Greek'));
    And('the ladder remembers the first verse of the Greek list as skipped', async () => {
      expect((await getLadderRow('el')).skipped.map((s) => s.ref)).toEqual([ladders.el[0].ref]);
    });
  });

  Scenario("The English ladder's place is independent of the Greek", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading ladder behind a fake Postern', () => open('english', 'well-read'));
    And('he has read the first verse of the Greek list well', async () => {
      await keepVerseReading(ladders.el[0].ref, 'well-read', [], 'Well done.', 'el', Date.now() - 60_000);
    });
    When(tapsLadder, tapLadder);
    Then('the Verse view is on the first verse of the English list', sayVerseView('first', 'English'));
    And('the reading panel says {string} and the number of verses on the English list', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(`${text} ${ladders.en.length}`));
    });
    When('he reads the verse aloud for 2 seconds', () => holdAndLetGo(2000));
    Then('the reading panel says {string}', panelSays);
    And('the English place is the second verse of the English list', async () => {
      await waitFor(async () => expect(await currentLadderPlace('en')).toBe(ladders.en[1].ref));
    });
    And('the Greek place is the second verse of the Greek list', async () => {
      expect(await currentLadderPlace('el')).toBe(ladders.el[1].ref);
    });
  });

  Scenario('Reopening the app resumes the place', ({ Given, And, When, Then }) => {
    Given(opensGreek, () => open('greek', 'well-read'));
    And('he has read the first verse of the Greek list well', async () => {
      await keepVerseReading(ladders.el[0].ref, 'well-read', [], 'Well done.', 'el', Date.now() - 60_000);
    });
    When('Lampas is closed and opened again on Romans 8', reopen);
    And(tapsLadder, tapLadder);
    Then('the Verse view is on the second verse of the Greek list', sayVerseView('second', 'Greek'));
    And('the reading panel says {string} and the number of verses on the Greek list', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(`${text} ${ladders.el.length}`));
    });
  });

  Scenario('The Goal screen has a Reading ladder entry for each language', ({ Given, Then, When, And }) => {
    Given('Lampas is opened on the Goal screen in English with a reading ladder behind a fake Postern', () => open('english', 'well-read', '#/goal'));
    Then('the Goal screen offers {string} and {string}', async (_, a: string, b: string) => {
      await screen.findByRole('button', { name: a, exact: true });
      expect(screen.getByRole('button', { name: b, exact: true })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name, exact: true }));
    });
    Then('the Verse view is on the first verse of the Greek list', async () => {
      await screen.findByRole('region', { name: 'Verse view' });
      await onVerse(ladders.el[0].ref);
    });
    And('the Read it aloud action is chosen', () => {
      expect(within(verseView()).getByRole('button', { name: 'Read it aloud', exact: true })).toHaveAttribute('aria-pressed', 'true');
    });
    And('the reading panel says {string} and the number of verses on the Greek list', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(`${text} ${ladders.el.length}`));
    });
  });

  Scenario('While the list is on its way the Reading ladder button says it is loading', ({ Given, And, When, Then }) => {
    Given(opensGreek, () => open('greek', 'well-read'));
    And('the ladder list is slow to arrive', () => {
      ladderHeld = new Promise<void>((resolve) => {
        letLadderThrough = resolve;
      });
    });
    When('he opens the reading check of verse 28 and taps {string} before the list has come', async (_, name: string) => {
      await openReadCheck();
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    Then('the button reads {string} and cannot be tapped again', async (_, text: string) => {
      const button = await within(panel()).findByRole('button', { name: text, exact: true });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(within(panel()).queryByRole('button', { name: 'Reading ladder', exact: true })).toBeNull();
    });
    When('the ladder list arrives', () => {
      letLadderThrough();
    });
    Then('the Verse view is on the first verse of the Greek list', sayVerseView('first', 'Greek'));
    And('the reading panel says {string} and the number of verses on the Greek list', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(`${text} ${ladders.el.length}`));
    });
  });
});
