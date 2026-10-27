// features/steps/hebrew-reading-ladder.steps.tsx — runs features/hebrew-reading-ladder.feature: the Reading ladder of the Old Testament (public/data/ladder/he.json), the reading check of a
// Hebrew verse (lang he, no Greek words), a flagged Hebrew word spoken in the Hebrew voice, and the drill of the words he missed. The readings go through a fake Postern whose mill opens the
// grist (tests/support/fake-postern.ts) and a fake recorder; speech is voice-kit's honest fake (tests/support/fake-speech.ts).
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
import { currentLadderPlace, forgetLadders, refParts, type LadderEntry } from '../../src/data/readingLadder';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { hebrewPointedForm } from '../../src/speech/pronunciation';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { makeFakePostern, POSTERN_ORIGIN, WELL_READ_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };

const hebrew = JSON.parse(readFileSync('public/data/ladder/he.json', 'utf8')) as LadderEntry[];
const greek = JSON.parse(readFileSync('public/data/ladder/el.json', 'utf8')) as LadderEntry[];

/** The Hebrew words of a ladder verse, as the reading check reads them (pointed, no cantillation). */
function hebrewWordsOf(ref: string): string[] {
  const { book, chapter, verse } = refParts(ref)!;
  const data = JSON.parse(readFileSync(`public/data/${book}/${chapter}.json`, 'utf8')) as { verses: { n: number; g: { t: string }[] }[] };
  return data.verses.find((v) => v.n === verse)!.g.map((w) => hebrewPointedForm(w.t));
}

let fake: FakePostern;
let synth: FakeSynth;
let played: HTMLMediaElement[] = [];
type Languages = 'greek' | 'hebrew' | 'both';
type Reply = 'well-read' | 'marked-timed';

async function open(languages: Languages, reply: Reply, extra: () => Promise<void> = async () => undefined): Promise<void> {
  cleanup();
  clearBus();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '#/goal';
  played = [];
  URL.createObjectURL = () => 'blob:lampas-test/1';
  URL.revokeObjectURL = () => undefined;
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    played.push(this);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  stubRecorder();
  FakeRecorder.denied = false;
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  const first = hebrewWordsOf(hebrew[0].ref)[0];
  fake.autoReply = {
    status: 'answered',
    answer: reply === 'well-read' ? WELL_READ_ANSWER : { verdict: 'some-to-fix', focus_words: [{ word: first, index: 0, chunks: [first.slice(0, 2), first.slice(2)], tip: 'Say the first syllable slowly.', start: 0.4, end: 0.9 }], note: 'Nearly there: one word to say again.' },
  };
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE, HEBREW_VOICE]);
  stubChapterFetch();
  forgetLadders();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear(), db.readingHistory.clear(), db.missTally.clear(), db.ladder.clear()]);
  await db.settings.put({ key: 'greekInterest', value: languages === 'hebrew' ? '0' : '5' });
  await db.settings.put({ key: 'hebrewInterest', value: languages === 'greek' ? '0' : '5' });
  await seedHisWords();
  await extra();
  render(<App />);
  await screen.findByRole('heading', { name: 'Goal', level: 1 });
}

const panel = () => screen.getByRole('region', { name: 'Reading check' });
const verseView = () => screen.getByRole('region', { name: 'Verse view' });
const goalButton = (name: string) => screen.queryByRole('button', { name, exact: true });

function referenceOf(ref: string): string {
  const { book, chapter, verse } = refParts(ref)!;
  return `${bookOf(book)!.name} ${chapter}:${verse}`;
}
const onVerse = async (ref: string) => {
  await screen.findByRole('region', { name: 'Verse view' });
  await waitFor(() => expect(within(verseView()).getByRole('heading', { level: 2 })).toHaveTextContent(referenceOf(ref)));
};

async function holdAndLetGo(ms: number): Promise<void> {
  const bar = await screen.findByRole('button', { name: /^Hold to read verse \d+$/ });
  FakeRecorder.durationMs = ms;
  await user.pointer([
    { keys: '[MouseLeft>]', target: bar, coords: AT },
    { keys: '[/MouseLeft]', target: bar, coords: AT },
  ]);
}

const offers = (name: string) => within(panel()).queryByRole('button', { name, exact: true });
const markedSpan = async (): Promise<HTMLElement> => {
  const word = hebrewWordsOf(hebrew[0].ref)[0];
  const mark = await waitFor(() => {
    const found = Array.from(panel().querySelectorAll<HTMLElement>('[data-fix]')).find((m) => m.textContent === word);
    if (!found) throw new Error('the marked word is not drawn yet');
    return found;
  });
  return mark.parentElement as HTMLElement;
};

const feature = await loadFeature('features/hebrew-reading-ladder.feature');

describeFeature(feature, ({ Scenario }) => {
  const goalOffers = async (_: unknown, a: string, b: string, not: string) => {
    await waitFor(() => expect(goalButton(a)).not.toBeNull());
    expect(goalButton(b)).not.toBeNull();
    expect(goalButton(not)).toBeNull();
  };
  const tapGoal = async (_: unknown, name: string) => {
    await user.click(await screen.findByRole('button', { name, exact: true }));
  };
  const hold = () => holdAndLetGo(2000);
  const panelSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(panel()).toHaveTextContent(text));
  };

  Scenario('With Hebrew chosen the Reading ladder opens the easiest Hebrew verse, in Hebrew, on Read it aloud', ({ Given, Then, When, And }) => {
    Given('Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern', () => open('hebrew', 'well-read'));
    Then('the Goal screen offers {string} and {string} and not {string}', goalOffers);
    When('he taps {string}', tapGoal);
    Then('the Verse view is on the first verse of the Hebrew list', () => onVerse(hebrew[0].ref));
    And('the verse is shown in Hebrew, right to left', async () => {
      const verse = verseView().querySelector<HTMLElement>('[data-sheet-verse]')!;
      expect(verse).toHaveAttribute('lang', 'he');
      expect(verse).toHaveAttribute('dir', 'rtl');
    });
    And('the Read it aloud action is chosen', () => {
      expect(within(verseView()).getByRole('button', { name: 'Read it aloud', exact: true })).toHaveAttribute('aria-pressed', 'true');
    });
    And('the reading panel says {string} and the number of verses on the Hebrew list', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(`${text} ${hebrew.length}`));
    });
  });

  Scenario('A reading sent is scored in Hebrew and carries no Greek words', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern that finds nothing to fix', () => open('hebrew', 'well-read'));
    When('he taps {string}', tapGoal);
    And('he reads the verse aloud for 2 seconds', hold);
    Then('the reading sent says lang {string} with the Hebrew words of the verse and no Greek words', async (_, lang: string) => {
      await waitFor(() => expect(fake.received.length).toBeGreaterThan(0));
      const input = fake.received[fake.received.length - 1].input;
      expect(input.lang).toBe(lang);
      expect(input.target_text).toBe(hebrewWordsOf(hebrew[0].ref).join(' '));
      expect(input.greek_words).toBeUndefined();
      expect(input.segments).toBeUndefined();
    });
    And('the reading panel says {string}', panelSays);
    And('the reading panel offers {string}', async (_, name: string) => {
      await waitFor(() => expect(offers(name)).not.toBeNull());
    });
  });

  Scenario('Next verse goes up the Hebrew list and the Greek place stays where it was', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern that finds nothing to fix', () => open('hebrew', 'well-read'));
    When('he taps {string}', tapGoal);
    And('he reads the verse aloud for 2 seconds', hold);
    And('he taps {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    Then('the Verse view is on the second verse of the Hebrew list', () => onVerse(hebrew[1].ref));
    And('the Hebrew place is the second verse of the Hebrew list', async () => {
      await waitFor(async () => expect(await currentLadderPlace('he')).toBe(hebrew[1].ref));
    });
    And('the Greek place is still the first verse of the Greek list', async () => {
      expect(await currentLadderPlace('el')).toBe(greek[0].ref);
    });
  });

  Scenario('A flagged Hebrew word has Me and its speaker, and the speaker says it in Hebrew', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern that marks the first word and times it', () => open('hebrew', 'marked-timed'));
    When('he taps {string}', tapGoal);
    And('he reads the verse aloud for 2 seconds', hold);
    Then('the first word of the verse is marked with its speaker and {string} right beside it', async (_, me: string) => {
      const span = await markedSpan();
      const word = hebrewWordsOf(hebrew[0].ref)[0];
      await waitFor(() => expect(Array.from(span.querySelectorAll('button')).map((b) => b.textContent)).toEqual([word, '', me]));
    });
    When('he taps the speaker of the marked word', async () => {
      const word = hebrewWordsOf(hebrew[0].ref)[0];
      await user.click(within(await markedSpan()).getByRole('button', { name: `Hear ${word}`, exact: true }));
    });
    Then("the phone's Hebrew voice says the marked word", async () => {
      const word = hebrewWordsOf(hebrew[0].ref)[0];
      await waitFor(() => expect(synth.spoken.some((s) => s.lang === HEBREW_VOICE.lang && s.text.includes(word))).toBe(true));
    });
    When('he taps {string} beside the marked word', async (_, text: string) => {
      const span = await markedSpan();
      await user.click(Array.from(span.querySelectorAll<HTMLElement>('button')).find((b) => b.textContent === text) as HTMLElement);
    });
    Then('the audio element plays his recording', async () => {
      await waitFor(() => expect(played).toHaveLength(1));
    });
  });

  Scenario('The words he missed are the drill', ({ Given, When, And, Then }) => {
    const missed = () => hebrewWordsOf(hebrew[0].ref).slice(0, 2);
    Given('Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern, two of his last five Hebrew readings having missed two words', () =>
      open('hebrew', 'well-read', async () => {
        await db.missTally.bulkPut(missed().map((unit) => ({ lang: 'he', unit, count: 2 })));
      }),
    );
    When('he taps {string}', tapGoal);
    Then('the reading panel offers {string}', async (_, name: string) => {
      await waitFor(() => expect(offers(name)).not.toBeNull());
    });
    When('he taps {string} in the reading panel', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    And('he taps {string} in the Reading drill', async (_, name: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'Reading drill' });
      await user.click(await within(dialog).findByRole('button', { name, exact: true }));
    });
    Then('the Reading drill shows the first missed word in Hebrew, right to left', async () => {
      const dialog = await screen.findByRole('dialog', { name: 'Reading drill' });
      const word = await waitFor(() => {
        const found = dialog.querySelector<HTMLElement>('[data-drill-word]');
        if (!found) throw new Error('the drill word is not drawn yet');
        return found;
      });
      expect(word).toHaveAttribute('lang', 'he');
      expect(word).toHaveAttribute('dir', 'rtl');
      expect(missed()).toContain(word.textContent);
    });
  });

  Scenario('With Greek only there is no Hebrew list', ({ Given, Then }) => {
    Given('Lampas is opened on the Goal screen with Greek chosen and a reading ladder behind a fake Postern', () => open('greek', 'well-read'));
    Then('the Goal screen offers {string} and {string} and not {string}', goalOffers);
  });

  Scenario('With both chosen the Greek | Hebrew segment picks the list', ({ Given, Then, When }) => {
    Given('Lampas is opened on the Goal screen with Greek and Hebrew chosen and a reading ladder behind a fake Postern', () => open('both', 'well-read'));
    Then('the Goal screen offers {string} and {string} and not {string}', goalOffers);
    When('he chooses {string} in the Goal language segment', async (_, name: string) => {
      await user.click(within(await screen.findByRole('group', { name: 'Goal language' })).getByRole('button', { name, exact: true }));
    });
    Then('the Goal screen then offers {string} and {string} and not {string}', goalOffers);
  });
});
