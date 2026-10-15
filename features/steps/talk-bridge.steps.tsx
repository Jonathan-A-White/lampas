// features/steps/talk-bridge.steps.tsx — runs features/talk-bridge.feature: an answer that bridges a question he is not ready for shows 'Take me there: <title>';
// a tap or a spoken yes opens that idea's sheet over the talk, and Back returns to it (mw-1vuvq6.5). Postern is the fake (tests/support/fake-postern.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { itemsOf } from '../../src/data/grammar/ladder';
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
const bridgeAnswer = (missing: string[]) => ({
  answer: 'Briefly: the genitive shows belonging. It rests on the sounds and spelling of Greek, so start with the pairs of vowels.',
  words: [],
  bridge: { missing, next: missing[0], why: 'The genitive rests on spelling you have not met.' },
});
const LACKS = bridgeAnswer(['diphthongs', 'consonant-pairs', 'syllables']);
/** he lacks ten, and the device names the eight lowest: the model lists the three of those the genitive most directly rests on and names the nearest of them to start with; the app opens the lowest unmet need of them all */
const LACKS_MOST_DIRECT = bridgeAnswer(['number-singular', 'noun', 'iota-subscript']);
let fake: FakePostern;

async function openWith(answer: Record<string, unknown>): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/?b=1jn&c=1');
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
  // only the letters are solid: the alphabet and its 24 letters
  await db.grammarLevels.bulkPut(['alphabet', ...itemsOf('alphabet').map((i) => i.id)].map((id) => ({ id, level: 'solid' as const, since: Date.now(), how: 'placement' as const })));
  await db.meta.put({ key: 'grammarLevelsSeeded', value: '1' });
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const talkGrists = (): ReceivedGrist[] => fake.received.filter((g) => g.grist.kind === 'bible-talk');
const ideaSheets = (name: string) => screen.queryAllByRole('dialog', { name: 'Idea' }).filter((d) => within(d).queryByRole('heading', { name }));

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
const asks = async (_: unknown, question: string) => {
  await openTalk();
  await send(question);
  await waitFor(() => expect(turns()).toHaveLength(1));
};
const offerButton = (name: string) => within(sheet()).queryByRole('button', { name });

const feature = await loadFeature('features/talk-bridge.feature');

describeFeature(feature, ({ Scenario }) => {
  const opens = (answer: Record<string, unknown>) => () => openWith(answer);
  const shows = async (_: unknown, name: string) => {
    expect(await within(sheet()).findByRole('button', { name })).toBeInTheDocument();
  };
  const taps = async (_: unknown, name: string) => {
    await user.click(await within(sheet()).findByRole('button', { name }));
  };
  const sheetOpen = async (_: unknown, name: string) => {
    await waitFor(() => expect(ideaSheets(name).length).toBeGreaterThan(0));
    expect(screen.getByRole('dialog', { name: /^Talk about / })).toBeInTheDocument();
  };
  const back = async () => {
    window.history.back();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Idea' })).toBeNull());
  };
  const talkAgain = async (_: unknown, name: string) => {
    expect(turns()).toHaveLength(1);
    expect(within(turns()[0]).getByText(/Briefly: the genitive/)).toBeInTheDocument();
    expect(await within(sheet()).findByRole('button', { name })).toBeInTheDocument();
  };
  const FOUNDATIONS = 'only the letters are solid and Lampas is opened on 1 John 1 behind a fake Postern whose tutor names the foundations he lacks';
  const WHEN_ASKS = 'he opens the talk and asks {string}';

  Scenario('The tutor takes him to the foundation he lacks', ({ Given, When, And, Then }) => {
    Given(FOUNDATIONS, opens(LACKS));
    When(WHEN_ASKS, asks);
    Then('the request carried the foundations he lacks, the lowest first, {string}', (_, first: string) => {
      const sent = talkGrists()[0].input as { missing_foundations?: { ideas: { id: string }[]; total: number } };
      expect(sent.missing_foundations?.ideas[0].id).toBe(first);
      expect(sent.missing_foundations?.total).toBe(10);
    });
    And('the talk shows the button {string}', shows);
    When('he taps {string}', taps);
    Then('the idea sheet {string} is open over the talk', sheetOpen);
    When('he goes Back', back);
    Then('the talk is shown again with its first turn and the button {string}', talkAgain);
  });

  Scenario("Back from an example word on the bridge's idea sheet shows the idea sheet, then the talk", ({ Given, When, And, Then }) => {
    Given(FOUNDATIONS, opens(LACKS));
    When(WHEN_ASKS, asks);
    And('he taps {string}', taps);
    And('he taps the first example on the idea sheet', async () => {
      const sheetNow = await waitFor(() => {
        const found = ideaSheets('Pairs of vowels')[0];
        if (!found) throw new Error('the idea sheet is not open yet');
        return found;
      });
      await user.click((await within(sheetNow).findAllByTestId('idea-example'))[0]);
    });
    Then('the word sheet is open over the idea sheet {string} and the talk', async (_, name: string) => {
      await screen.findByRole('dialog', { name: 'Word' });
      expect(ideaSheets(name)).toHaveLength(1);
      expect(screen.getByRole('dialog', { name: /^Talk about / })).toBeInTheDocument();
    });
    When('he goes Back', async () => {
      window.history.back();
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
    });
    Then('the word sheet is closed and the idea sheet {string} is open over the talk', sheetOpen);
    When('he goes Back once more', back);
    Then('the talk is shown again with its first turn and the button {string}', talkAgain);
  });

  Scenario('A spoken yes takes him there as the tap does, once', ({ Given, When, And, Then }) => {
    Given(FOUNDATIONS, opens(LACKS));
    When(WHEN_ASKS, asks);
    Then('the talk shows the button {string}', shows);
    When('the tutor will take his next words as a yes', () => {
      fake.autoReply = { status: 'answered', answer: { answer: 'Opening it for you.', words: [], offer_reply: 'confirm' } };
    });
    And('he says {string}', async (_, words: string) => {
      await send(words);
    });
    Then('the second bible-talk grist carries the pending offer of kind bridge with the text {string}', async (_, text: string) => {
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      expect((talkGrists()[1].input as { pending_offer?: unknown }).pending_offer).toEqual({ kind: 'bridge', text });
    });
    And('exactly one idea sheet {string} is open over the talk', async (_, name: string) => {
      await waitFor(() => expect(ideaSheets(name)).toHaveLength(1));
      expect(screen.getAllByRole('dialog', { name: 'Idea' })).toHaveLength(1);
    });
    When('he goes Back', back);
    Then('the talk is shown again with its first turn and the button {string}', async (_, name: string) => {
      await waitFor(() => expect(turns()).toHaveLength(2));
      expect(within(turns()[0]).getByText(/Briefly: the genitive/)).toBeInTheDocument();
      expect(await within(sheet()).findByRole('button', { name })).toBeInTheDocument();
    });
  });

  Scenario('Missing quite a bit, he is shown three and taken to the next step', ({ Given, When, And, Then }) => {
    Given('only the letters are solid and Lampas is opened on 1 John 1 behind a fake Postern whose tutor lists the three most direct of those he lacks', opens(LACKS_MOST_DIRECT));
    When(WHEN_ASKS, asks);
    Then('the talk lists exactly {int} foundations he is missing and says there is more', async (_, count: number) => {
      const list = await waitFor(() => {
        const found = sheet().querySelector<HTMLElement>('[data-bridge-missing]');
        if (!found) throw new Error('the list is not drawn yet');
        return found;
      });
      expect(list.querySelectorAll('li')).toHaveLength(count);
      const offer = list.closest<HTMLElement>('[data-bridge-offer]') as HTMLElement;
      expect(within(offer).getByText(/missing quite a bit/)).toBeInTheDocument();
      expect(within(offer).getByText(/and more/)).toBeInTheDocument();
    });
    And('the talk shows the button {string}', shows);
    When('he taps {string}', taps);
    Then('the idea sheet {string} is open over the talk', sheetOpen);
  });

  Scenario('A question about no grammar gets no bridge', ({ Given, When, And, Then }) => {
    Given(FOUNDATIONS, opens(LACKS));
    When(WHEN_ASKS, asks);
    Then('the request carried no foundations', () => {
      expect('missing_foundations' in talkGrists()[0].input).toBe(false);
    });
    And('the talk shows no button {string}', (_, name: string) => {
      expect(offerButton(name)).toBeNull();
    });
  });
});
