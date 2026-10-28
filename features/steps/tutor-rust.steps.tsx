// features/steps/tutor-rust.steps.tsx — runs features/tutor-rust.feature: the phone works out which solid words and ideas are rusty and sends them as `rusty`; the tutor's
// `rusty_offer` is a button that moves them to Frontier and opens their practice (mw-1vuvq6.6). Postern is the fake (tests/support/fake-postern.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import type { RustyItem } from '../../src/data/rusty';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
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
const RUSTY_ANSWER = {
  answer: 'You are rusty on λόγος and the genitive case: they were solid before.',
  words: [],
  rusty_offer: { items: [{ kind: 'word', id: 'λόγος' }, { kind: 'idea', id: 'case-genitive' }] },
};
const HEBREW_RUSTY_ANSWER = {
  answer: 'You are rusty on אֶרֶץ and the Hebrew article: they were solid before.',
  words: [],
  rusty_offer: { items: [{ kind: 'word', id: 'אֶרֶץ' }, { kind: 'idea', id: 'he-article' }] },
};
let fake: FakePostern;

/** A solid word at the 14-day step, last answered `seen` days ago, with the answers it gave (a day count each, negative = wrong). */
const wordRow = (lemma: string, seen: number, answers: number[] = []) => ({
  kind: 'word',
  id: lemma,
  step: 3,
  due: Date.now() - seen * DAY + 14 * DAY,
  lastWhen: Date.now() - seen * DAY,
  lapses: answers.filter((a) => a < 0).length,
  rights: 0,
  recent: answers.map((a) => ({ when: Date.now() - Math.abs(a) * DAY, right: a > 0 })),
});

/** The phone of a reader of Hebrew alone, with a solid Hebrew word he slipped on and a solid Hebrew idea he has not met for 3 weeks, opened on Genesis 1. */
async function openHebrew(): Promise<void> {
  await openWith(false, '#/?b=gen&c=1');
  cleanup();
  const now = Date.now();
  await db.settings.bulkPut([{ key: 'greekInterest', value: '0' }, { key: 'hebrewInterest', value: '3' }]);
  await Promise.all([db.words.clear(), db.grammarLevels.clear(), db.reviews.clear()]);
  await db.words.bulkPut([{ lemma: 'אֶרֶץ', lang: 'hbo', lemmas: [], gloss: 'land', lesson: 1, state: 'solid', since: now - 60 * DAY }]);
  await db.grammarLevels.put({ id: 'he-article', level: 'solid', since: now - 60 * DAY, how: 'placement' });
  await db.reviews.bulkPut([wordRow('אֶרֶץ', 1, [-4, 2, -1]), { ...wordRow('he-article', 21), kind: 'grammar' }]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openWith(rusty: boolean, hash = '#/?b=rom&c=8'): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${hash}`);
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: RUSTY_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.requests.clear(), db.usage.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  const now = Date.now();
  await db.words.bulkPut([
    { lemma: 'λόγος', lemmas: [], gloss: 'word', lesson: 1, state: 'solid', since: now - 60 * DAY },
    { lemma: 'ἀγάπη', lemmas: [], gloss: 'love', lesson: 1, state: 'solid', since: now - 60 * DAY },
    { lemma: 'θεός', lemmas: [], gloss: 'God', lesson: 1, state: 'learning', since: now - 60 * DAY },
  ]);
  await db.grammarLevels.put({ id: 'case-genitive', level: 'solid', since: now - 60 * DAY, how: 'placement' });
  await db.reviews.bulkPut(
    rusty
      ? [wordRow('λόγος', 1, [-4, 2, -1]), wordRow('ἀγάπη', 1, [1]), { ...wordRow('case-genitive', 21), kind: 'grammar' }]
      : [wordRow('ἀγάπη', 1, [1])],
  );
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const talkGrists = (): ReceivedGrist[] => fake.received.filter((g) => g.grist.kind === 'bible-talk');

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

const feature = await loadFeature('features/tutor-rust.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN_RUSTY = 'he has a solid word he slipped on and a solid idea he has not met for 3 weeks, and Lampas is opened on Romans 8 behind a fake Postern whose tutor says he is rusty';
  const WHEN_ASKS = 'he opens the talk and asks {string}';
  const asks = async (_: unknown, question: string) => {
    await openTalk();
    await send(question);
    await waitFor(() => expect(turns()).toHaveLength(1));
  };
  const shows = async (_: unknown, name: string) => {
    expect(await within(sheet()).findByRole('button', { name })).toBeInTheDocument();
  };
  const noButton = async (_: unknown, name: string) => {
    await waitFor(() => expect(turns().length).toBeGreaterThan(0));
    await waitFor(() => expect(within(sheet()).queryByRole('button', { name })).toBeNull());
  };
  const unmoved = async () => {
    expect((await db.words.get('λόγος'))?.state).toBe('solid');
    expect((await db.grammarLevels.get('case-genitive'))?.level).toBe('solid');
  };
  const onFrontier = async (_: unknown, lemma: string, idea: string) => {
    await waitFor(async () => expect((await db.words.get(lemma))?.state).toBe('learning'));
    await waitFor(async () => expect((await db.grammarLevels.get(idea))?.level).toBe('frontier'));
    const word = await db.reviews.get(['word', lemma]);
    expect(word?.step).toBe(0);
    expect(word?.due).toBeLessThanOrEqual(Date.now());
  };
  const reviewOpen = async () => {
    await screen.findByRole('heading', { name: 'Review', level: 1 });
    expect(await screen.findByText('1 of 2')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull();
    expect(window.location.hash).toBe('#/review');
  };
  const answerFor = (reply: 'confirm' | 'decline') => () => {
    fake.autoReply = { status: 'answered', answer: { answer: 'Understood.', words: [], offer_reply: reply } };
  };
  const says = async (_: unknown, words: string) => {
    await send(words);
  };

  Scenario('The tutor notices rust', ({ Given, When, And, Then }) => {
    Given(GIVEN_RUSTY, () => openWith(true));
    When(WHEN_ASKS, asks);
    Then('the request carried 2 rusty items, {string} first because it {string}, then {string} because it was {string}', (_, first: string, why1: string, second: string, why2: string) => {
      const rusty = (talkGrists()[0].input as { rusty?: RustyItem[] }).rusty;
      expect(rusty).toEqual([
        { kind: 'word', id: first, title: first, why: why1 },
        { kind: 'idea', id: 'case-genitive', title: second, why: why2 },
      ]);
    });
    And('the talk shows the button {string}', shows);
    And('nothing has moved yet', unmoved);
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(sheet()).findByRole('button', { name }));
    });
    Then('the word {string} and the idea {string} are on the Frontier', onFrontier);
    And('Review is open with a round that asks {string} and {string}', reviewOpen);
  });

  Scenario('A spoken yes moves them as the tap does', ({ Given, When, And, Then }) => {
    Given(GIVEN_RUSTY, () => openWith(true));
    When(WHEN_ASKS, asks);
    Then('the talk shows the button {string}', shows);
    When('the tutor will take his next words as a yes', answerFor('confirm'));
    And('he says {string}', says);
    Then('the second bible-talk grist carries the pending offer of kind rusty with the text {string}', async (_, text: string) => {
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      expect((talkGrists()[1].input as { pending_offer?: unknown }).pending_offer).toEqual({ kind: 'rusty', text });
    });
    And('the word {string} and the idea {string} are on the Frontier', onFrontier);
    And('Review is open with a round that asks {string} and {string}', reviewOpen);
  });

  Scenario('A no leaves them where they are', ({ Given, When, And, Then }) => {
    Given(GIVEN_RUSTY, () => openWith(true));
    When(WHEN_ASKS, asks);
    Then('the talk shows the button {string}', shows);
    When('the tutor will take his next words as a no', answerFor('decline'));
    And('he says {string}', says);
    Then('the talk shows no button {string}', noButton);
    And('nothing has moved yet', unmoved);
  });

  Scenario('Nothing rusty, nothing sent', ({ Given, When, Then, And }) => {
    Given('he has only a solid word he reviewed yesterday, and Lampas is opened on Romans 8 behind a fake Postern whose tutor says he is rusty', () => openWith(false));
    When(WHEN_ASKS, asks);
    Then('the request carried no rusty items', () => {
      expect('rusty' in talkGrists()[0].input).toBe(false);
    });
    And('the talk shows no button {string}', noButton);
  });

  Scenario('The tutor notices rust in his Hebrew', ({ Given, When, And, Then }) => {
    Given('he has a solid Hebrew word he slipped on and a solid Hebrew idea he has not met for 3 weeks, and Lampas is opened on Genesis 1 behind a fake Postern whose tutor says he is rusty', async () => {
      fake.autoReply = { status: 'answered', answer: HEBREW_RUSTY_ANSWER };
      await openHebrew();
      fake.autoReply = { status: 'answered', answer: HEBREW_RUSTY_ANSWER };
    });
    When(WHEN_ASKS, asks);
    Then('the request carried 2 rusty Hebrew items, {string} first because it {string}, then {string} because it was {string}', (_, first: string, why1: string, second: string, why2: string) => {
      const rusty = (talkGrists()[0].input as { rusty?: RustyItem[] }).rusty;
      expect(rusty).toEqual([
        { kind: 'word', id: first, title: first, why: why1 },
        { kind: 'idea', id: 'he-article', title: second, why: why2 },
      ]);
    });
    And("the request's learner line says he last met a Hebrew item {string}", (_, ago: string) => {
      expect(String((talkGrists()[0].input as { learner?: string }).learner)).toContain(`last seen ${ago}`);
    });
    And('the talk shows the button {string}', shows);
    And('the talk draws {string} in the Hebrew face, right to left', (_, word: string) => {
      const item = [...sheet().querySelectorAll<HTMLElement>('[data-rusty-items] li')].find((li) => li.textContent === word);
      expect(item, word).toBeDefined();
      expect(item?.getAttribute('dir')).toBe('rtl');
      expect(item?.classList.contains('script-he')).toBe(true);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(sheet()).findByRole('button', { name }));
    });
    Then('the Hebrew word {string} and the Hebrew idea {string} are on the Frontier', async (_, lemma: string, idea: string) => {
      await waitFor(async () => expect((await db.words.get(lemma))?.state).toBe('learning'));
      await waitFor(async () => expect((await db.grammarLevels.get(idea))?.level).toBe('frontier'));
    });
    And('Review is open', async () => {
      await screen.findByRole('heading', { name: 'Review', level: 1 });
      expect(window.location.hash).toBe('#/review');
      // the offer is marked taken last: the scenario ends after it, not while it is being written
      await waitFor(async () => expect((await db.talks.toArray()).some((t) => t.rustyChoice === 'taken')).toBe(true));
    });
  });
});
