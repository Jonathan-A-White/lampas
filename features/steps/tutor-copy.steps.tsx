// features/steps/tutor-copy.steps.tsx — runs features/tutor-copy.feature: the copy and share links of a Bible talk answer (mw-5r3p30.1075). Postern is the fake (tests/support/fake-postern.ts) whose mill answers
// every grist with the answer a scenario sets; the clipboard and the share view are fakes that keep what they were given; Hebrews 9 and 10 are the committed chapter files.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { answeredTurn, askAboutVerse, verseTalk } from './ask-verse';
import { closeDatabase } from './close-database';

// The App writes on its own after a tap (the usage count): db.close() with one in flight is a DatabaseClosedError.
afterAll(async () => {
  cleanup();
  stopReading();
  await usageWritesSettled();
  vi.unstubAllGlobals();
  await closeDatabase();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
let written: string[] = [];
let shared: ShareData[] = [];
let failTen = false;

async function open(_: unknown, kind: string, reference: string): Promise<void> {
  cleanup();
  await usageWritesSettled();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  written = [];
  shared = [];
  failTen = false;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: `Tap ${kind === 'copy' ? 'Copy' : 'Share'} for ${reference}.`, words: [], links: [{ kind, reference }] } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith(POSTERN_ORIGIN)) return fake.fetch(input, init);
    if (failTen && String(input).startsWith('/data/heb/10.json')) return Promise.resolve(new Response('no', { status: 500 }));
    return chapterFetch(input, init);
  });
  Object.defineProperty(window.navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (written.push(text), Promise.resolve()) },
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: undefined });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear()]);
  await setReaderView('english');
  await setWeave('off');
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  // the App seeds the grammar ideas at its first open: the ask step starts once that is written, not beside it (tutor-links waits the same way; mw-indx1x6.30)
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}

/** The answered turn of the open Talk sheet, read beside the sheet's own markup; throws until the sheet has settled on it (features/steps/ask-verse.ts). */
const turn = answeredTurn;

// the shared step (mw-indx1x6.30): it waits for the answered turn, so the chip step after it starts on a settled sheet
const askAboutVerse28 = async (): Promise<void> => {
  await askAboutVerse(user, 28, 'copy from verse 11 to chapter 10 verse 4');
};

const crossing = () => {
  expect(written).toHaveLength(1);
  return written[0];
};

const feature = await loadFeature('features/tutor-copy.feature');

describeFeature(feature, ({ Scenario }) => {
  const phoneShares = () => {
    Object.defineProperty(window.navigator, 'share', { configurable: true, value: (data: ShareData) => (shared.push(data), Promise.resolve()) });
  };
  const tapChip = async (_: unknown, name: string) => {
    // the turn is read again on each look, so the tap waits for the chip to be drawn in the answered turn (the role query is over the turn alone)
    await user.click(await waitFor(() => within(turn()).getByRole('button', { name, exact: true })));
  };
  const holdsTheVerses = async () => {
    await waitFor(() => expect(written).toHaveLength(1));
    const text = crossing();
    // verse 11 of Hebrews 9 leads, 28 ends the chapter, 10:1 begins the next and 4 ends the range
    expect(text.startsWith('11 ')).toBe(true);
    expect(text).toMatch(/ 28 .+ 10:1 .+ 2 .+ 3 .+ 4 /);
    expect(text).not.toMatch(/ 5 /);
  };
  const endsWith = (_: unknown, reference: string, link: string) => {
    const lines = crossing().split('\n');
    expect(lines.slice(-2)).toEqual([reference, link]);
  };
  const chipSays = async (_: unknown, words: string) => {
    await waitFor(() => {
      const links = turn().querySelector<HTMLElement>('[data-tutor-links]');
      if (!links) throw new Error('the answered turn has no links row');
      expect(within(links).getByRole('button')).toHaveTextContent(words);
    });
  };
  const stillOpen = () => {
    expect(verseTalk()).toBeInTheDocument();
  };

  Scenario('One tap on the copy chip puts a passage across a chapter boundary on the clipboard', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a {string} link to {string}', open);
    When('he asks the tutor about verse 28', askAboutVerse28);
    And('he taps the chip {string}', tapChip);
    Then("the phone's clipboard holds the verses of Hebrews 9:11 to 10:4 with 10:1 marking the new chapter", holdsTheVerses);
    And('the clipboard text ends with the reference {string} and the link {string}', endsWith);
    And('the chip says {string}', chipSays);
    And('the Talk sheet is still open', stillOpen);
  });

  Scenario("The share chip opens the phone's share view with the passage", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a {string} link to {string}', open);
    And('the phone has a share view', phoneShares);
    When('he asks the tutor about verse 28', askAboutVerse28);
    And('he taps the chip {string}', tapChip);
    Then("the phone's share view is handed the title {string} and the passage across the chapter boundary", async (_: unknown, title: string) => {
      await waitFor(() => expect(shared).toHaveLength(1));
      expect(shared[0].title).toBe(title);
      expect(shared[0].text).toMatch(/^11 .+ 28 .+ 10:1 .+ 4 /);
      expect(shared[0].url).toBe('https://lampas.allmymind.org/#/?ref=Heb.9.11');
    });
    And("the phone's clipboard holds nothing", () => expect(written).toEqual([]));
    And('the Talk sheet is still open', stillOpen);
  });

  Scenario('Where the phone has no share view the share chip copies and says so', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a {string} link to {string}', open);
    When('he asks the tutor about verse 28', askAboutVerse28);
    And('he taps the chip {string}', tapChip);
    Then("the phone's clipboard holds the verses of Hebrews 9:11 to 10:4 with 10:1 marking the new chapter", holdsTheVerses);
    And('the chip says {string}', chipSays);
  });

  Scenario('A chapter that cannot be read is said on the chip', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a {string} link to {string}', open);
    And('Hebrews 10 cannot be loaded', () => {
      failTen = true;
    });
    When('he asks the tutor about verse 28', askAboutVerse28);
    And('he taps the chip {string}', tapChip);
    Then('the chip says {string}', chipSays);
    And("the phone's clipboard holds nothing", () => expect(written).toEqual([]));
    And('the Talk sheet is still open', stillOpen);
  });
});
