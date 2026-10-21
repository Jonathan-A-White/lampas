// features/steps/greek-offer.steps.tsx — runs features/greek-offer.feature: a reader not learning the Greek is offered it once, as a button on the Talk sheet; a tap opens the Greek
// word or the Greek view, a no is written to the memory index and ends the offers (mw-yrmkdf.4). Postern is the fake (tests/support/fake-postern.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getGreekInterest, getReaderView, getWeave, setGreekInterest } from '../../src/data/repositories';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { getIndex } from '../../src/data/repositories/memory';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedExampleWords } from '../../tests/support/his-words';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern, type ReceivedGrist } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const WORD_BUTTON = 'Want to try Curious: see this Greek word?';
const VIEW_BUTTON = 'Want to raise the Greek to Curious?';
const WORD_OFFER = { answer: 'It is the self-giving kind of love.', words: [], greek_offer: { kind: 'word', text: WORD_BUTTON, lemma: 'ἀγαπάω' } };
const VIEW_OFFER = { answer: 'The Greek is more exact than any one English word.', words: [], greek_offer: { kind: 'view', text: VIEW_BUTTON } };
let fake: FakePostern;

async function openWith(answer: Record<string, unknown>, seeded = false): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/?b=rom&c=8');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.requests.clear()]);
  // a phone placed at Just English, as the app places a new one (placeGreekInterest): the tutor offers one step up
  await setGreekInterest(0);
  if (seeded) {
    // a phone that was opened before a new install started empty (mw-5r3p30.385): the 63 example words and their schedule, none of them touched
    const opened = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await seedExampleWords(opened);
    await seedScheduleIfFirstOpen(opened);
  }
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const talkGrists = (): ReceivedGrist[] => fake.received.filter((g) => g.grist.kind === 'bible-talk');
const offerButtons = (name: string) => within(sheet()).queryAllByRole('button', { name });

async function openTalk(): Promise<void> {
  const bar = await waitFor(() => {
    const found = document.querySelector<HTMLElement>('[data-talk-bar]');
    if (!found) throw new Error('the Talk bar is not drawn yet');
    return found;
  });
  await user.click(await within(bar).findByRole('button', { name: 'Talk' }));
  await within(await screen.findByRole('dialog', { name: /^Talk about / })).findByRole('textbox', { name: 'Your message' });
}
async function send(question: string): Promise<void> {
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}

const feature = await loadFeature('features/greek-offer.feature');

describeFeature(feature, ({ Scenario }) => {
  const shows = async (_: unknown, name: string) => {
    expect(await within(sheet()).findByRole('button', { name })).toBeInTheDocument();
  };
  const taps = async (_: unknown, name: string) => {
    await user.click(await within(sheet()).findByRole('button', { name }));
  };
  const asks = async (_: unknown, question: string) => {
    await openTalk();
    await send(question);
    await waitFor(() => expect(turns()).toHaveLength(1));
  };
  const WHEN_ASKS = 'he opens the talk and asks {string}';
  const GIVEN_VIEW = 'Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view';
  const noButton = async (_: unknown, name: string) => {
    // the answer is drawn before the check: the turn count says it came
    await waitFor(() => expect(turns().length).toBeGreaterThan(0));
    expect(offerButtons(name)).toHaveLength(0);
  };

  Scenario('The offer is a button that opens the Greek word', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek word', () => openWith(WORD_OFFER));
    When(WHEN_ASKS, asks);
    Then('the request told the tutor the Reader shows English', () => {
      expect((talkGrists()[0].input as { reader_view?: string }).reader_view).toBe('english');
    });
    And('the request told the tutor the Greek dial is Just English, with Curious next', () => {
      expect((talkGrists()[0].input as { greek_interest?: unknown }).greek_interest).toEqual({ level: 0, name: 'Just English', next: { level: 1, name: 'Curious' } });
    });
    And('the talk shows the button {string}', shows);
    When('he taps {string}', taps);
    Then('the Greek dial is Curious', async () => {
      await waitFor(async () => expect(await getGreekInterest()).toBe(1));
    });
    And('the word sheet for {string} is open over the talk', async (_, lemma: string) => {
      const word = await screen.findByRole('dialog', { name: 'Word' });
      expect(within(word).getAllByText((text) => text.normalize('NFC').includes(lemma.normalize('NFC'))).length).toBeGreaterThan(0);
      expect(screen.getByRole('dialog', { name: /^Talk about / })).toBeInTheDocument();
    });
  });

  Scenario('The offer raises the Greek dial one step and nothing more', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view', () => openWith(VIEW_OFFER));
    When(WHEN_ASKS, asks);
    Then('the talk shows the button {string}', shows);
    When('he taps {string}', taps);
    Then('the Greek dial is Curious', async () => {
      await waitFor(async () => expect(await getGreekInterest()).toBe(1));
    });
    And('the Reader still shows English with the Weave off', async () => {
      expect(await getReaderView()).toBe('english');
      expect(await getWeave()).toBe('off');
    });
  });

  const confirmation = () => within(sheet()).queryByRole('status', { name: 'Greek offer' });
  const confirms = async (_: unknown, line: string) => {
    await waitFor(() => expect(confirmation()?.textContent).toBe(line));
  };

  Scenario('A tap on the view offer is confirmed in the Talk sheet', ({ Given, When, And, Then }) => {
    Given(GIVEN_VIEW, () => openWith(VIEW_OFFER));
    When(WHEN_ASKS, asks);
    Then('the talk shows the button {string}', shows);
    And('the talk shows no confirmation', () => {
      expect(confirmation()).toBeNull();
    });
    When('he taps {string}', taps);
    Then('the talk confirms {string}', confirms);
  });

  Scenario('A tap on the word offer is confirmed in the Talk sheet', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek word', () => openWith(WORD_OFFER));
    When(WHEN_ASKS, asks);
    And('he taps {string}', taps);
    Then('the talk confirms {string}', confirms);
  });

  Scenario('A no is remembered and nothing more is offered', ({ Given, When, And, Then }) => {
    Given(GIVEN_VIEW, () => openWith(VIEW_OFFER));
    When(WHEN_ASKS, asks);
    Then('the talk shows the button {string}', shows);
    When('the tutor will take his next words as a no', () => {
      fake.autoReply = { status: 'answered', answer: { answer: 'Understood, I will not offer it again.', words: [], offer_reply: 'decline' } };
    });
    And('he says {string}', async (_, words: string) => {
      await send(words);
    });
    Then('the second bible-talk grist carries the pending offer of kind greek with the text {string}', async (_, text: string) => {
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      expect((talkGrists()[1].input as { pending_offer?: unknown }).pending_offer).toEqual({ kind: 'greek', text });
    });
    And('the memory index says he said no to the Greek offer', async () => {
      await waitFor(async () => expect((await getIndex()).text).toMatch(/said no to the Greek offer \d{4}-\d{2}-\d{2}/));
    });
    And('the talk shows no button {string}', noButton);
    When('the tutor offers the Greek view again', () => {
      fake.autoReply = { status: 'answered', answer: VIEW_OFFER };
    });
    And('he asks again {string}', async (_, words: string) => {
      await waitFor(() => expect(turns()).toHaveLength(2));
      await send(words);
    });
    Then('the third bible-talk grist carries the memory line {string}', async (_, line: string) => {
      await waitFor(() => expect(talkGrists()).toHaveLength(3));
      expect((talkGrists()[2].input as { memory?: { index: string } }).memory?.index).toContain(line);
    });
    And('the talk still shows no button {string}', async (_, name: string) => {
      await waitFor(() => expect(turns()).toHaveLength(3));
      expect(offerButtons(name)).toHaveLength(0);
    });
  });

  Scenario('Only one offer is kept in a talk', ({ Given, When, Then }) => {
    Given(GIVEN_VIEW, () => openWith(VIEW_OFFER));
    When(WHEN_ASKS, asks);
    Then('the talk shows the button {string}', shows);
    When('he says {string}', async (_, words: string) => {
      await send(words);
      await waitFor(() => expect(turns()).toHaveLength(2));
    });
    Then('the talk shows exactly {int} button {string}', (_, count: number, name: string) => {
      expect(offerButtons(name)).toHaveLength(count);
    });
  });

  Scenario('A phone that holds only the example words is offered the Greek', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in English on a phone that still holds only the 63 example words, behind a fake Postern whose tutor offers the Greek word', () => openWith(WORD_OFFER, true));
    When(WHEN_ASKS, asks);
    Then('the request told the tutor the Reader shows English', () => {
      expect((talkGrists()[0].input as { reader_view?: string }).reader_view).toBe('english');
    });
    And('the request told the tutor he has no solid words and is learning none', () => {
      const learner = (talkGrists()[0].input as { learner?: string }).learner ?? '';
      expect(learner).toMatch(/^solid 0 words; learning: none; /);
    });
    And('the talk shows the button {string}', shows);
  });

  Scenario('Example words he has answered make him a Greek learner', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 in English on a phone that still holds only the 63 example words, behind a fake Postern whose tutor offers the Greek word', async () => {
      await openWith(WORD_OFFER, true);
      await db.words.update('ἀγαπάω', { state: 'learning', since: Date.now() });
    });
    When(WHEN_ASKS, asks);
    Then('the request told the tutor he knows 53 solid words', () => {
      const learner = (talkGrists()[0].input as { learner?: string }).learner ?? '';
      expect(learner).toMatch(/^solid 53 words; learning: ἀγαπάω/);
    });
  });
});
