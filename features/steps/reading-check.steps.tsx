// features/steps/reading-check.steps.tsx — runs features/reading-check.feature: the Verse view's Read it aloud bar, held to record and let go to send; the verse-read grist through a fake Postern
// (tests/support/fake-postern.ts) that opens its audio attachment; the answer marked in the verse; the walk through the
// marked words. The recorder is a fake (tests/support/fake-recorder.ts); the press is user-event pointer input.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { GREEK_READING_ANSWER, INCOMPLETE_ANSWER, makeFakePostern, POSTERN_ORIGIN, READING_ANSWER, WELL_READ_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse28 = chapter.verses.find((v) => v.n === 28);
if (!verse28) throw new Error('no verse 28');
const ENGLISH_28 = verse28.e.map((c) => c.t.trim()).join(' ');
const GREEK_28 = verse28.g.map((w) => w.t).join(' ');

/** A reading that marks the second 'who' of 8:28 (word 16 of the English), not the first (word 13). */
const SECOND_WHO_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [{ word: 'who', index: 16, chunks: ['who'], tip: 'Say it as in who are called.' }],
  note: 'Nearly there: one word to say again.',
};

/** A word whose tip spells the sound in capitals and gives no `say` (mw-5r3p30.140): the speaker must say the tip's respelling. */
const LEVITES_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [
    { word: 'together', index: 7, chunks: ['to', 'geth', 'er'], tip: 'Stress the second part: say it as tuh-GETH-er.' },
    READING_ANSWER.focus_words[1],
  ],
  note: 'Nearly there: two words to say again.',
};

/** The same, but the tip names the wrong sound first: 'Not TOG-ether; say tuh-GETH-er.' (mw-5r3p30.166): the speaker must skip the run after 'Not'. */
const NOT_FIRST_ANSWER = {
  ...LEVITES_ANSWER,
  focus_words: [
    { word: 'together', index: 7, chunks: ['to', 'geth', 'er'], tip: 'Not TOG-ether; say tuh-GETH-er.' },
    READING_ANSWER.focus_words[1],
  ],
};

/** The grind's model once escaped quotes inside a string the JSON already escapes: the note and tip arrive with backslash-quote (mw-5r3p30.110). */
const ESCAPED_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [{ word: 'who', index: 16, chunks: ['who'], tip: 'Say it as in \\"who\\" are called.' }],
  note: 'It sounded like \\"laff\\" ... \\"to us\\".',
};

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
const AWAY = { clientX: 100, clientY: 500 };
let fake: FakePostern;
let synth: FakeSynth;

interface Options {
  reply?: 'reading' | 'well-read' | 'incomplete' | 'held' | 'second-who' | 'escaped' | 'tip-respelling' | 'tip-not-first';
  view?: 'english' | 'greek';
  denied?: boolean;
  down?: boolean;
}

async function open({ reply = 'reading', view = 'english', denied = false, down = false }: Options = {}): Promise<void> {
  cleanup();
  clearBus();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  stubRecorder();
  FakeRecorder.denied = denied;
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  if (reply !== 'held') fake.autoReply = { status: 'answered', answer: reply === 'reading' ? READING_ANSWER : reply === 'second-who' ? SECOND_WHO_ANSWER : reply === 'escaped' ? ESCAPED_ANSWER : reply === 'tip-respelling' ? LEVITES_ANSWER : reply === 'tip-not-first' ? NOT_FIRST_ANSWER : reply === 'incomplete' ? INCOMPLETE_ANSWER : WELL_READ_ANSWER };
  fake.greekReply = { status: 'answered', answer: GREEK_READING_ANSWER };
  fake.down = down;
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear()]);
  await setReaderView(view);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

async function selectVerse28(): Promise<void> {
  const number = await screen.findByRole('button', { name: 'Verse 28', exact: true });
  if (number.getAttribute('aria-pressed') !== 'true') await user.click(number);
  const view = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(view).getByRole('button', { name: 'Read it aloud', exact: true }));
  await screen.findByRole('region', { name: 'Reading check' });
}

const panel = () => screen.getByRole('region', { name: 'Reading check' });
/** A marked word of the result or the walk: the verse above them (the sheet's own text) has tappable words of the same names. */
const markedWord = async (name: string) =>
  (await within(panel()).findAllByRole('button', { name, exact: true })).filter((b) => !b.closest('[data-sheet-verse]'))[0];
/** The Verse view's one hold bar, while it is the Read it aloud one. */
const readButton = () => screen.getByRole('button', { name: 'Hold to read verse 28', exact: true });

/** Presses a button and lets go; the clip says it lasted `ms` (the app's 500 ms rule reads that). */
async function holdAndLetGo(el: HTMLElement, ms: number): Promise<void> {
  FakeRecorder.durationMs = ms;
  await user.pointer([
    { keys: '[MouseLeft>]', target: el, coords: AT },
    { keys: '[/MouseLeft]', target: el, coords: AT },
  ]);
}

const received = () => {
  expect(fake.received).toHaveLength(1);
  return fake.received[0];
};

const marked = () => Array.from(panel().querySelectorAll<HTMLElement>('[data-fix]'));
const markedShow = async () => {
  await waitFor(() => expect(marked().map((m) => m.textContent)).toEqual(['together', 'purpose']));
};
const greekMarkedSteps = async () => {
  await waitFor(() => expect(marked().map((m) => m.textContent)).toEqual(['συνεργεῖ', 'πρόθεσιν']));
};
const noGrist = async () => {
  await new Promise((r) => setTimeout(r, 150));
  expect(fake.received).toHaveLength(0);
};
const says = (text: string) => async () => {
  await waitFor(() => expect(panel()).toHaveTextContent(text));
};
const walk = () => within(panel()).getByRole('group', { name: 'Read these again' });

/** The speaker beside a marked word (named for the word it is beside), tapped. */
const tapSpeakerBeside = async (_: unknown, word: string) => {
  const button = marked().find((m) => m.textContent === word);
  expect(button, `a marked word ${word}`).toBeDefined();
  await user.click(within(panel()).getByRole('button', { name: `Hear ${word}`, exact: true }));
};
/** The last thing the engine was asked to say is exactly `text`, in `lang`; neither the tip nor the note was spoken. */
const saysOnly = (lang: string) => (_: unknown, text: string) => {
  // the verdict read before the tap was cut off by it: what is asked of the engine since its last cancel is the word alone
  expect(synth.since.map((u) => u.text)).toEqual([text]);
  expect(synth.since[0].lang).toBe(lang);
};

const feature = await loadFeature('features/reading-check.feature');

describeFeature(feature, ({ Scenario }) => {
  const given = 'Lampas is opened on Romans 8 in English with a reading check behind a fake Postern';
  const greekGiven = 'Lampas is opened on Romans 8 in Greek with a reading check behind a fake Postern';
  const holdRead = 'he holds the bar for 2 seconds and lets go';
  const millOne = 'the mill received one grist for the lampas app, kind verse-read';
  const millOneSteps = async () => {
    await waitFor(() => expect(fake.received).toHaveLength(1));
    expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'verse-read', v: '1' });
  };
  const verseMarked = 'the verse in the reading check shows {string} and {string} marked to fix';
  const verseMarkedSteps = async () => markedShow();

  Scenario("Holding the bar on 8:28 and releasing sends a verse-read grist with the verse's English and one audio attachment", ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then(millOne, millOneSteps);
    And('its input carries the reference {string}, the English of verse 28 as target_text, and the language {string}', (_, reference: string, lang: string) => {
      expect(received().input).toEqual({ reference, target_text: ENGLISH_28, lang });
    });
    And('the grist carries one audio attachment of type {string}', (_, mime: string) => {
      const { attachments } = received();
      expect(attachments).toHaveLength(1);
      expect(attachments[0].mime).toBe(mime);
    });
    And('the fake Postern was sent that recording', () => {
      expect(fake.blobs).toHaveLength(1);
      expect(received().attachments[0]).toMatchObject(fake.blobs[0]);
      expect(FakeRecorder.last().started && FakeRecorder.last().stopped).toBe(true);
    });
  });

  Scenario('The answer marks the focus words in the verse and a tap shows their chunks', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then(verseMarked, verseMarkedSteps);
    And('the other words of the verse are not marked', () => {
      expect(panel().querySelector('[data-reading-verse]')).toHaveTextContent(ENGLISH_28);
      expect(marked()).toHaveLength(2);
    });
    When('he taps the marked word {string}', async (_, word: string) => {
      await user.click(await markedWord(word));
    });
    Then('its chunks show as {string} with a speaker to hear it', (_, chunks: string) => {
      const detail = panel().querySelector<HTMLElement>('[data-fix-detail]');
      expect(detail).not.toBeNull();
      expect(detail?.querySelector('[data-chunks]')).toHaveTextContent(chunks);
      expect(within(detail as HTMLElement).getByRole('button', { name: 'Hear it' })).toBeInTheDocument();
    });
  });

  Scenario('A note and a tip that arrive with backslash-quote show plain quote marks', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check whose note and tip carry backslash-quote', () => open({ reply: 'escaped' }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then('the note shows plain quote marks and no backslash', async () => {
      await waitFor(() => expect(panel()).toHaveTextContent('It sounded like "laff" ... "to us".'));
      expect(panel().textContent).not.toContain('\\');
    });
    When('he taps the marked word "who"', async () => {
      await user.click(marked()[0]);
    });
    Then('the tip shows plain quote marks and no backslash', () => {
      const detail = panel().querySelector('[data-fix-detail]');
      expect(detail).toHaveTextContent('Say it as in "who" are called.');
      expect(detail?.textContent).not.toContain('\\');
    });
  });

  Scenario('Each flagged word has a speaker right beside it that says only how the word should sound', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    And(holdRead, async () => holdAndLetGo(readButton(), 2000));
    And(verseMarked, verseMarkedSteps);
    Then('each marked word has a speaker right beside it', () => {
      for (const word of marked()) {
        const beside = word.nextElementSibling;
        expect(beside).toBeInstanceOf(HTMLButtonElement);
        expect(beside).toHaveAccessibleName(`Hear ${word.textContent}`);
      }
    });
    When('he taps the speaker beside {string}', tapSpeakerBeside);
    Then('the phone says only {string}, the respelling the answer gave, in the English voice', saysOnly('en-US'));
    When('he then taps the speaker beside {string}', tapSpeakerBeside);
    Then('the phone says only {string}, the word itself, in the English voice', saysOnly('en-US'));
  });

  Scenario("A flagged word whose tip spells the sound in capitals is spoken as the tip spells it, without a say", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check whose tip spells the sound and gives no say', () => open({ reply: 'tip-respelling' }));
    And('he opens the reading check of verse 28', selectVerse28);
    And(holdRead, async () => holdAndLetGo(readButton(), 2000));
    And(verseMarked, verseMarkedSteps);
    When('he taps the speaker beside {string}', tapSpeakerBeside);
    Then('the phone says only {string}, the respelling its tip spelled in capitals, in the English voice', saysOnly('en-US'));
  });

  Scenario("A tip that names the wrong sound first is spoken as the right one", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check whose tip says "Not TOG-ether; say tuh-GETH-er." and gives no say', () => open({ reply: 'tip-not-first' }));
    And('he opens the reading check of verse 28', selectVerse28);
    And(holdRead, async () => holdAndLetGo(readButton(), 2000));
    And(verseMarked, verseMarkedSteps);
    When('he taps the speaker beside {string}', tapSpeakerBeside);
    Then('the phone says only {string}, the right respelling and not the wrong one the tip names first, in the English voice', saysOnly('en-US'));
  });

  Scenario("A flagged Greek word's speaker says the Greek word in the Greek voice", ({ Given, And, When, Then }) => {
    Given(greekGiven, () => open({ view: 'greek' }));
    And('he opens the reading check of verse 28', selectVerse28);
    And(holdRead, async () => holdAndLetGo(readButton(), 2000));
    And(verseMarked, greekMarkedSteps);
    When('he taps the speaker beside {string}', tapSpeakerBeside);
    Then('the phone says only {string}, the Greek word itself, in the Greek voice', saysOnly('el-GR'));
  });

  Scenario('Only the instance of a word that he misread is marked, not every word spelled the same', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check whose answer marks the second "who"', () => open({ reply: 'second-who' }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then('one word is marked to fix, the "who" of "who are called"', async () => {
      await waitFor(() => expect(marked()).toHaveLength(1));
      const button = marked()[0];
      expect(button).toHaveTextContent('who');
      const before = document.createRange();
      before.setStart(panel().querySelector('[data-reading-verse]') as HTMLElement, 0);
      before.setEndBefore(button);
      expect(before.toString()).toContain('those who love Him, ');
      expect(panel().querySelector('[data-reading-verse]')).toHaveTextContent(ENGLISH_28);
    });
    When('he taps the marked word "who"', async () => {
      await user.click(marked()[0]);
    });
    Then('its chunks show as "who" with a speaker to hear it', () => {
      expect(panel().querySelector('[data-fix-detail] [data-chunks]')).toHaveTextContent('who');
    });
  });

  Scenario('Read these again walks the marked words and then the whole verse', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    And(holdRead, async () => holdAndLetGo(readButton(), 2000));
    When('he taps {string}', async (_, name: string) => {
      await user.click(await markedWord(name));
    });
    Then('the walk shows the word {string} as word 1 of 2 in chunks {string}', async (_, word: string, chunks: string) => {
      await waitFor(() => expect(walk()).toHaveTextContent('Word 1 of 2'));
      expect(walk().querySelector('[data-walk-word]')).toHaveTextContent(word);
      expect(walk().querySelector('[data-chunks]')).toHaveTextContent(chunks);
    });
    When('he taps {string} again', async (_, name: string) => {
      await user.click(within(walk()).getByRole('button', { name, exact: true }));
    });
    Then('the walk shows the word {string} as word 2 of 2 in chunks {string}', async (_, word: string, chunks: string) => {
      await waitFor(() => expect(walk()).toHaveTextContent('Word 2 of 2'));
      expect(walk().querySelector('[data-walk-word]')).toHaveTextContent(word);
      expect(walk().querySelector('[data-chunks]')).toHaveTextContent(chunks);
    });
    When('he goes on with {string}', async (_, name: string) => {
      await user.click(within(walk()).getByRole('button', { name, exact: true }));
    });
    Then('the walk shows the whole verse with the bar {string}', async (_, name: string) => {
      await waitFor(() => expect(walk()).toHaveTextContent(ENGLISH_28));
      expect(screen.getByRole('button', { name, exact: true })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-hold-bar]')).toHaveLength(1);
    });
    When('he holds the bar {string} for 2 seconds and lets go', async (_, name: string) => {
      await holdAndLetGo(screen.getByRole('button', { name, exact: true }), 2000);
    });
    Then('the mill received {int} grists for the lampas app, kind verse-read', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      for (const got of fake.received) expect(got.grist).toMatchObject({ app: 'lampas', kind: 'verse-read' });
      expect(fake.received[1].input).toMatchObject({ target_text: ENGLISH_28 });
    });
  });

  Scenario('A reading with nothing to fix says it is well read', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check that finds nothing to fix', () => open({ reply: 'well-read' }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then('the reading check says {string}', (_, text: string) => says(text)());
    And('there is no Read these again button', () => {
      expect(within(panel()).queryByRole('button', { name: 'Read these again' })).toBeNull();
      expect(marked()).toHaveLength(0);
    });
  });

  Scenario('A reading that covers only part of the verse is headed Read the whole verse, not Well read', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check that heard only part of the verse', () => open({ reply: 'incomplete' }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then('the reading check says {string}', (_, text: string) => says(text)());
    And('the reading check says {string}', (_, text: string) => says(text)());
    And('the reading check does not say {string}', async (_, text: string) => {
      await new Promise((r) => setTimeout(r, 50));
      expect(panel()).not.toHaveTextContent(text);
    });
    And('there is no Read these again button', () => {
      expect(within(panel()).queryByRole('button', { name: 'Read these again' })).toBeNull();
      expect(marked()).toHaveLength(0);
    });
  });

  Scenario('A reading with words to fix is headed Words to fix', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then('the reading check says {string}', (_, text: string) => says(text)());
    And('the reading check does not say {string}', async (_, text: string) => {
      await new Promise((r) => setTimeout(r, 50));
      expect(panel()).not.toHaveTextContent(text);
    });
  });

  Scenario('A hold under about one second sends nothing and says Hold the bar for the whole verse', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    When('he holds the bar for 800 milliseconds and lets go', async () => holdAndLetGo(readButton(), 800));
    Then('the reading check says {string}', (_, text: string) => says(text)());
    And('the mill received no grist', noGrist);
  });

  Scenario('A press under 500 ms sends nothing and says Hold while you read', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    When('he presses the bar for a fifth of a second and lets go', async () => holdAndLetGo(readButton(), 200));
    Then('the reading check says {string}', (_, text: string) => says(text)());
    And('the mill received no grist', noGrist);
  });

  Scenario('Sliding off the bar drops the reading', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    When('he holds the bar and slides off the button', async () => {
      FakeRecorder.durationMs = 2000;
      await user.pointer([
        { keys: '[MouseLeft>]', target: readButton(), coords: AT },
        { target: readButton(), coords: AWAY },
        { keys: '[/MouseLeft]', target: readButton(), coords: AWAY },
      ]);
    });
    Then('the reading check says {string}', (_, text: string) => says(text)());
    And('the mill received no grist', async () => {
      await noGrist();
      expect(FakeRecorder.last().cancelled).toBe(true);
    });
  });

  Scenario('While the mill has not answered the box says Waiting with the seconds', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check behind a fake Postern that holds its answers', () => open({ reply: 'held' }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then('the reading check says it is waiting, with seconds', async () => {
      await waitFor(() => expect(panel()).toHaveTextContent(/Waiting for the tutor… \d+ s/));
    });
    And('the bar cannot be held while it waits', () => expect(readButton()).toBeDisabled());
    When('the mill answers', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      fake.answer({ status: 'answered', answer: READING_ANSWER });
    });
    Then(verseMarked, verseMarkedSteps);
  });

  Scenario('A microphone that is turned off says so', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check and the microphone turned off', () => open({ denied: true }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then('the reading check says {string}', (_, text: string) => says(text)());
    And('the mill received no grist', noGrist);
  });

  Scenario('A backend that cannot be reached shows Could not reach with Retry, and Retry sends the same recording', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English with a reading check behind a fake Postern that cannot be reached', () => open({ down: true }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then('the reading check says {string} with a Retry button', async (_, title: string) => {
      await waitFor(() => expect(within(panel()).getByRole('alert')).toHaveTextContent(title));
      expect(within(panel()).getByRole('button', { name: 'Retry', exact: true })).toBeInTheDocument();
    });
    When('the backend comes back and he taps Retry', async () => {
      fake.down = false;
      await user.click(within(panel()).getByRole('button', { name: 'Retry', exact: true }));
    });
    Then(verseMarked, verseMarkedSteps);
  });

  Scenario('The result is still there after reopening', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    And(holdRead, async () => holdAndLetGo(readButton(), 2000));
    And('the reading of verse 28 has arrived', async () => {
      await waitFor(async () => expect(await db.readings.count()).toBe(1));
    });
    When('he reopens Lampas and opens the reading check of verse 28', async () => {
      cleanup();
      clearBus();
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      await selectVerse28();
    });
    Then(verseMarked, verseMarkedSteps);
    And(millOne, millOneSteps);
  });

  Scenario("Holding the bar on 8:28 in the Greek view sends a verse-read grist with the verse's Greek as target_text and lang el", ({ Given, And, When, Then }) => {
    Given(greekGiven, () => open({ view: 'greek' }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then(millOne, millOneSteps);
    And('its input carries the reference {string}, the Greek of verse 28 as target_text, and the language {string}', (_, reference: string, lang: string) => {
      expect(received().input).toEqual({ reference, target_text: GREEK_28, lang });
    });
    And('the grist carries one audio attachment of type {string}', (_, mime: string) => {
      expect(received().attachments).toHaveLength(1);
      expect(received().attachments[0].mime).toBe(mime);
    });
  });

  Scenario('A Greek answer marks the Greek words and a tap shows their syllables with a Greek speaker', ({ Given, And, When, Then }) => {
    Given(greekGiven, () => open({ view: 'greek' }));
    And('he opens the reading check of verse 28', selectVerse28);
    When(holdRead, async () => holdAndLetGo(readButton(), 2000));
    Then(verseMarked, greekMarkedSteps);
    And('the other words of the Greek verse are not marked', () => {
      expect(panel().querySelector('[data-reading-verse]')).toHaveTextContent(GREEK_28);
      expect(marked()).toHaveLength(2);
    });
    When('he taps the marked word {string}', async (_, word: string) => {
      await user.click(await markedWord(word));
    });
    Then('its chunks show as {string} with a Greek speaker to hear it', (_, chunks: string) => {
      const detail = panel().querySelector<HTMLElement>('[data-fix-detail]');
      expect(detail).not.toBeNull();
      expect(detail?.querySelector('[data-chunks]')).toHaveTextContent(chunks);
      expect(detail?.querySelector('[data-chunks]')).toHaveAttribute('lang', 'grc');
      expect(within(detail as HTMLElement).getByRole('button', { name: 'Hear it' })).toBeInTheDocument();
    });
    And('the speaker says the word in Greek, el-GR', async () => {
      const detail = panel().querySelector<HTMLElement>('[data-fix-detail]') as HTMLElement;
      await user.click(within(detail).getByRole('button', { name: 'Hear it' }));
      const last = synth.spoken[synth.spoken.length - 1];
      expect(last.text).toBe('συνεργεῖ');
      expect(last.lang).toBe('el-GR');
    });
  });

  Scenario('Read these again works in the Greek view', ({ Given, And, When, Then }) => {
    Given(greekGiven, () => open({ view: 'greek' }));
    And('he opens the reading check of verse 28', selectVerse28);
    And(holdRead, async () => holdAndLetGo(readButton(), 2000));
    When('he taps {string}', async (_, name: string) => {
      await user.click(await markedWord(name));
    });
    Then('the walk shows the word {string} as word 1 of 2 in chunks {string}', async (_, word: string, chunks: string) => {
      await waitFor(() => expect(walk()).toHaveTextContent('Word 1 of 2'));
      expect(walk().querySelector('[data-walk-word]')).toHaveTextContent(word);
      expect(walk().querySelector('[data-chunks]')).toHaveTextContent(chunks);
    });
    When('he taps {string} again', async (_, name: string) => {
      await user.click(within(walk()).getByRole('button', { name, exact: true }));
    });
    Then('the walk shows the word {string} as word 2 of 2 in chunks {string}', async (_, word: string, chunks: string) => {
      await waitFor(() => expect(walk()).toHaveTextContent('Word 2 of 2'));
      expect(walk().querySelector('[data-walk-word]')).toHaveTextContent(word);
      expect(walk().querySelector('[data-chunks]')).toHaveTextContent(chunks);
    });
    When('he goes on with {string}', async (_, name: string) => {
      await user.click(within(walk()).getByRole('button', { name, exact: true }));
    });
    Then('the walk shows the whole Greek verse with the bar {string}', async (_, name: string) => {
      await waitFor(() => expect(walk()).toHaveTextContent(GREEK_28));
      expect(walk().querySelector('[data-walk-verse]')).toHaveAttribute('lang', 'grc');
      expect(screen.getByRole('button', { name, exact: true })).toBeInTheDocument();
    });
    When('he holds the bar {string} for 2 seconds and lets go', async (_, name: string) => {
      await holdAndLetGo(screen.getByRole('button', { name, exact: true }), 2000);
    });
    Then('the mill received {int} grists for the lampas app, kind verse-read', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      for (const got of fake.received) expect(got.grist).toMatchObject({ app: 'lampas', kind: 'verse-read' });
    });
    And('the second grist is in Greek with lang {string}', (_, lang: string) => {
      expect(fake.received[1].input).toMatchObject({ target_text: GREEK_28, lang });
    });
  });

  Scenario('The English and Greek results of a verse are kept apart', ({ Given, And, When, Then }) => {
    Given(given, () => open());
    And('he opens the reading check of verse 28', selectVerse28);
    And(holdRead, async () => holdAndLetGo(readButton(), 2000));
    And(verseMarked, verseMarkedSteps);
    When('he closes the Verse view, switches to the Greek view and opens the reading check again', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull());
      await user.click(screen.getByRole('button', { name: 'Greek', exact: true }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Greek', exact: true })).toHaveAttribute('aria-pressed', 'true'));
      await selectVerse28();
    });
    Then('the reading check has no result yet', async () => {
      await new Promise((r) => setTimeout(r, 100));
      expect(panel().querySelector('[data-reading-result]')).toBeNull();
    });
    When('he holds the bar again in Greek for 2 seconds and lets go', async () => holdAndLetGo(readButton(), 2000));
    Then(verseMarked, greekMarkedSteps);
    When('he closes the Verse view, switches to the English view and opens the reading check again', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull());
      await user.click(screen.getByRole('button', { name: 'English', exact: true }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true'));
      await selectVerse28();
    });
    Then('the English result is still there with {string} and {string} marked to fix', verseMarkedSteps);
  });
});
