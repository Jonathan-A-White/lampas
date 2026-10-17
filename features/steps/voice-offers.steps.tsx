// features/steps/voice-offers.steps.tsx — runs features/voice-offers.feature: an offer waiting for a tap (Send this to the makers, a setting
// change) can be answered by voice (mw-5r3p30.186). The next turn carries `pending_offer`; the fake tutor's answer says confirm, decline or
// read_back in `offer_reply` (the decision is the grind's); the app does what the tap does. Postern is the fake (tests/support/fake-postern.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
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
const CONTROL = 'Ask the tutor about this screen';
const SEND = 'Send this to the makers';
const FIRST_WORDS = 'Can this work with Olive Tree?';
const SUMMARY = 'He wants Lampas to work with the Olive Tree app.';
const FEEDBACK_OFFER = {
  answer: 'Lampas does not work with Olive Tree. I can pass your wish to the makers; I cannot promise they will build it.',
  words: [],
  feedback_offer: { summary: SUMMARY },
};
const SETTING_OFFER = { answer: 'I can switch the theme to Dark for you.', words: [], setting_offer: { key: 'theme', value: 'dark' } };
const SUMMARY_B = 'He also wants Lampas to read aloud in Hebrew.';
const SENT_REPLY = 'Done: I have sent that to the makers.';
const READ_BACK_REPLY = `Here is exactly what I will send: ${SUMMARY} Shall I send it?`;
let fake: FakePostern;
let synth: FakeSynth;
let releaseFeedback: () => void = () => {};

async function openWith(offer: Record<string, unknown>): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/goal');
  tutorTimings.pollMs = 20;
  synth = stubSpeech([ENGLISH_VOICE]);
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: offer };
  releaseFeedback = () => {};
  fake.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.requests.clear()]);
  render(<App />);
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}

const sheet = () => screen.getByRole('dialog', { name: /^(Ask the tutor: |Talk about )/ });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const turn = (n: number) => turns()[n - 1];
const ORDINALS: Record<string, number> = { first: 1, second: 2, third: 3 };
const talkGrists = (): ReceivedGrist[] => fake.received.filter((g) => g.grist.kind === 'bible-talk');
const feedbackGrists = (): ReceivedGrist[] => fake.received.filter((g) => g.grist.kind === 'feedback');
const pendingOf = (n: number): unknown => (talkGrists()[n - 1].input as { pending_offer?: unknown }).pending_offer;

async function send(question: string): Promise<void> {
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}
/** waits until the sheet shows `count` answered turns */
const turnsShown = (count: number) => waitFor(() => expect(turns()).toHaveLength(count));
/** every talk grist sent has its answer shown: nothing is left in flight to land in the next scenario's talk */
const allAnswered = () => waitFor(() => expect(turns()).toHaveLength(talkGrists().length));
const answerNext = (answer: Record<string, unknown>): void => {
  fake.autoReply = { status: 'answered', answer };
};
const theme = async (): Promise<unknown> => (await db.settings.get('theme'))?.value;

const feature = await loadFeature('features/voice-offers.feature');

describeFeature(feature, ({ Scenario }) => {
  const opensFeedback = () => openWith(FEEDBACK_OFFER);
  const taps = async () => {
    await user.click(await screen.findByRole('button', { name: CONTROL }));
  };
  const sends = (_: unknown, question: string) => send(question);
  const offerShown = async (_: unknown, name: string) => {
    expect(await within(sheet()).findByRole('button', { name })).toBeInTheDocument();
  };
  const nextIsYes = () => answerNext({ answer: SENT_REPLY, words: [], offer_reply: 'confirm' });
  const feedbackSentWith = async () => {
    await waitFor(() => expect(feedbackGrists()).toHaveLength(1));
    expect(feedbackGrists()[0].input).toMatchObject({ kind: 'tutor-ask', text: FIRST_WORDS, summary: SUMMARY, screen: 'Goal' });
    await allAnswered();
  };
  const exactSummaryPending = (_: unknown, ordinal: string) => {
    expect(pendingOf(ORDINALS[ordinal])).toEqual({ kind: 'feedback', text: SUMMARY });
  };
  const firstTurnSent = async () => {
    const first = await waitFor(() => turn(1));
    expect(await within(first).findByText('Sent')).toBeInTheDocument();
    expect(within(first).queryByRole('button', { name: SEND })).toBeNull();
  };

  Scenario('A spoken yes sends the feedback offer exactly as the tap does', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the tutor will take his next words as a yes', nextIsYes);
    And('he says {string}', sends);
    Then('the second bible-talk grist carries the pending offer of kind feedback with the exact text of the summary', async () => {
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      exactSummaryPending(null, 'second');
    });
    And('the mill received a feedback grist carrying his first words, the summary and the screen {string}', feedbackSentWith);
    And('the first turn shows {string} and no button {string}', firstTurnSent);
    And("the tutor's answer to the yes is shown", async () => {
      await turnsShown(2);
      expect(within(turn(2)).getByText(SENT_REPLY)).toBeInTheDocument();
    });
  });

  const slowMill = () => {
    fake.holds.feedback = new Promise<void>((resolve) => {
      releaseFeedback = resolve;
    });
  };
  const tapsSend = async () => {
    await user.click(await within(sheet()).findByRole('button', { name: SEND }));
  };
  const sendingOff = async () => {
    await waitFor(() => expect(feedbackGrists()).toHaveLength(1));
    await waitFor(() => expect(within(turn(1)).getByRole('button', { name: SEND })).toBeDisabled());
    expect(within(turn(1)).getByText('Sending…')).toBeInTheDocument();
  };
  const exactlyOneFeedback = async () => {
    await allAnswered();
    expect(feedbackGrists()).toHaveLength(1);
  };
  const yesAnswerShown = async () => {
    await turnsShown(2);
    expect(within(turn(2)).getByText(SENT_REPLY)).toBeInTheDocument();
  };

  Scenario('A tap and a spoken yes send once', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the mill is slow to take the feedback', slowMill);
    And('he taps Send this to the makers', tapsSend);
    Then('the mill has the feedback grist and the button is off while it is sending', sendingOff);
    When('the tutor will take his next words as a yes', nextIsYes);
    And('he says {string}', async (_, words: string) => {
      await send(words);
      // the yes is answered (its grist reached the mill) while the tap is still sending
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
    And('the mill takes the feedback', () => releaseFeedback());
    Then('the mill received exactly {int} feedback grist', exactlyOneFeedback);
    And('the first turn shows {string} and no button {string}', firstTurnSent);
    And("the tutor's answer to the yes is shown", yesAnswerShown);
  });

  Scenario('A spoken yes and a tap send once', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the mill is slow to take the feedback', slowMill);
    And('the tutor will take his next words as a yes', nextIsYes);
    And('he says {string}', sends);
    Then('the mill has the feedback grist and the button is off while it is sending', sendingOff);
    When('he taps the disabled Send this to the makers', async () => {
      await user.click(within(turn(1)).getByRole('button', { name: SEND }));
    });
    And('the mill takes the feedback', () => releaseFeedback());
    Then('the mill received exactly {int} feedback grist', exactlyOneFeedback);
    And('the first turn shows {string} and no button {string}', firstTurnSent);
    And("the tutor's answer to the yes is shown", yesAnswerShown);
  });

  const slowTutor = () => {
    fake.autoReply = undefined;
  };
  const yesReachedTutor = async () => {
    await waitFor(() => expect(talkGrists()).toHaveLength(2));
    exactSummaryPending(null, 'second');
  };
  const yesComesAtLast = (extra: Record<string, unknown> = {}) =>
    fake.answer({ status: 'answered', answer: { answer: SENT_REPLY, words: [], offer_reply: 'confirm', ...extra } });
  const sentOnce = () => firstTurnSent();

  Scenario('A tap, then a spoken yes whose answer comes after the send finished, send once', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the mill is slow to take the feedback', slowMill);
    And('he taps Send this to the makers', tapsSend);
    Then('the mill has the feedback grist and the button is off while it is sending', sendingOff);
    When('the tutor is slow to answer his next words', slowTutor);
    And('he says {string}', sends);
    And('the second bible-talk grist has reached the tutor', yesReachedTutor);
    And('the mill takes the feedback', () => releaseFeedback());
    Then('the first turn shows {string} and no button {string}', sentOnce);
    When("the tutor's answer to the yes comes at last", () => yesComesAtLast());
    Then('the mill received exactly {int} feedback grist', exactlyOneFeedback);
    And("the tutor's answer to the yes is shown", yesAnswerShown);
  });

  Scenario('A spoken yes whose answer is slow, then a tap, send once', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the tutor is slow to answer his next words', slowTutor);
    And('he says {string}', sends);
    And('the second bible-talk grist has reached the tutor', yesReachedTutor);
    And('he taps Send this to the makers', tapsSend);
    Then('the first turn shows {string} and no button {string}', sentOnce);
    When("the tutor's answer to the yes comes at last", () => yesComesAtLast());
    Then('the mill received exactly {int} feedback grist', exactlyOneFeedback);
    And("the tutor's answer to the yes is shown", yesAnswerShown);
  });

  Scenario('A second offer after a tapped one and a slow yes reaches the makers once each', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the mill is slow to take the feedback', slowMill);
    And('he taps Send this to the makers', tapsSend);
    Then('the mill has the feedback grist and the button is off while it is sending', sendingOff);
    When('the tutor is slow to answer his next words', slowTutor);
    And('he says {string}', sends);
    And('the second bible-talk grist has reached the tutor', yesReachedTutor);
    And('the mill takes the feedback', () => releaseFeedback());
    Then('the first turn shows {string} and no button {string}', sentOnce);
    When("the tutor's answer to the yes comes at last with a second offer", () => yesComesAtLast({ feedback_offer: { summary: SUMMARY_B } }));
    And("he taps the second offer's Send this to the makers", async () => {
      await turnsShown(2);
      await user.click(await within(turn(2)).findByRole('button', { name: SEND }));
    });
    Then('each of the two summaries reached the mill exactly once', async () => {
      await waitFor(() => expect(within(turn(2)).getByText('Sent')).toBeInTheDocument());
      await allAnswered();
      expect(feedbackGrists().map((g) => (g.input as { summary: string }).summary)).toEqual([SUMMARY, SUMMARY_B]);
    });
  });

  Scenario('Two taps in a row on the button send once', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the mill is slow to take the feedback', slowMill);
    And('he taps Send this to the makers', tapsSend);
    And('he taps the disabled Send this to the makers', async () => {
      await user.click(within(turn(1)).getByRole('button', { name: SEND }));
    });
    And('the mill takes the feedback', () => releaseFeedback());
    Then('the mill received exactly {int} feedback grist', exactlyOneFeedback);
    And('the first turn shows {string} and no button {string}', firstTurnSent);
  });

  Scenario('Read it back speaks the exact text, keeps the offer, and a following yes sends it', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the tutor will take his next words as a request to read it back', () => answerNext({ answer: READ_BACK_REPLY, words: [], offer_reply: 'read_back' }));
    And('he says {string}', sends);
    Then('the answer to the request holds the exact text of the summary and asks for his yes', async () => {
      await turnsShown(2);
      expect(turn(2).querySelector('[data-answer-text]')?.textContent).toContain(SUMMARY);
      expect(turn(2).querySelector('[data-answer-text]')?.textContent).toContain('Shall I send it?');
    });
    And('the tutor speaks the exact text of the summary', async () => {
      await waitFor(() => {
        synth.finishAll();
        expect(synth.spoken.map((s) => s.text).join(' ')).toContain(SUMMARY);
      });
    });
    And('the first turn still shows the button {string}', async (_, name: string) => {
      expect(within(turn(1)).getByRole('button', { name })).toBeInTheDocument();
    });
    And('the mill received no feedback grist', () => {
      expect(feedbackGrists()).toHaveLength(0);
    });
    When('the tutor will take his next words as a yes', nextIsYes);
    And('he then asks {string}', sends);
    Then('the third bible-talk grist carries the pending offer of kind feedback with the exact text of the summary', async () => {
      await waitFor(() => expect(talkGrists()).toHaveLength(3));
      exactSummaryPending(null, 'third');
    });
    And('the mill received a feedback grist carrying his first words, the summary and the screen {string}', feedbackSentWith);
    And('the first turn shows {string} and no button {string}', firstTurnSent);
  });

  Scenario('A spoken no withdraws the offer and sends nothing', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the tutor will take his next words as a no', () => answerNext({ answer: 'Alright, I will not send it.', words: [], offer_reply: 'decline' }));
    And('he says {string}', sends);
    Then('the mill received no feedback grist', async () => {
      await turnsShown(2);
      expect(feedbackGrists()).toHaveLength(0);
    });
    And('the first turn shows {string} and no button {string}', async (_, shown: string) => {
      expect(await within(turn(1)).findByText(shown)).toBeInTheDocument();
      expect(within(turn(1)).queryByRole('button', { name: SEND })).toBeNull();
    });
    When('he then asks {string}', async (_, question: string) => {
      answerNext({ answer: 'You are on the Goal screen.', words: [] });
      await send(question);
    });
    Then('the third bible-talk grist carries no pending offer', async () => {
      await waitFor(() => expect(talkGrists()).toHaveLength(3));
      expect(pendingOf(3)).toBeUndefined();
      await allAnswered();
      expect('pending_offer' in (talkGrists()[2].input as object)).toBe(false);
    });
  });

  Scenario('An ordinary question with an offer waiting keeps the offer', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', opensFeedback);
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    When('the tutor will take his next words as an ordinary question', () => answerNext({ answer: 'You are on the Goal screen.', words: [] }));
    And('he says {string}', sends);
    Then('the second bible-talk grist carries the pending offer of kind feedback with the exact text of the summary', async () => {
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      exactSummaryPending(null, 'second');
    });
    And('the first turn still shows the button {string}', async (_, name: string) => {
      await turnsShown(2);
      expect(within(turn(1)).getByRole('button', { name })).toBeInTheDocument();
    });
    And('the mill received no feedback grist', () => {
      expect(feedbackGrists()).toHaveLength(0);
    });
    When('the tutor will take his next words as a yes', nextIsYes);
    And('he then asks {string}', sends);
    Then('the third bible-talk grist carries the pending offer of kind feedback with the exact text of the summary', async () => {
      await waitFor(() => expect(talkGrists()).toHaveLength(3));
      exactSummaryPending(null, 'third');
    });
    And('the mill received a feedback grist carrying his first words, the summary and the screen {string}', feedbackSentWith);
  });

  Scenario('A spoken yes makes the setting change the tap would make', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers to change the Theme to Dark', () => openWith(SETTING_OFFER));
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    Then('the answer shows the button {string}', offerShown);
    And('the Theme is not Dark', async () => {
      expect(await theme()).not.toBe('dark');
    });
    When('the tutor will take his next words as a yes', () => answerNext({ answer: 'Done: the theme is Dark.', words: [], offer_reply: 'confirm' }));
    And('he says {string}', sends);
    Then('the second bible-talk grist carries the pending offer of kind setting with the text {string}', async (_, text: string) => {
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      expect(pendingOf(2)).toEqual({ kind: 'setting', text });
    });
    And('the Theme is Dark', async () => {
      await waitFor(async () => expect(await theme()).toBe('dark'));
    });
    And('the second turn shows the change {string} with an Undo button', async (_, text: string) => {
      await turnsShown(2);
      const change = await waitFor(() => {
        const found = turn(2).querySelector('[data-talk-change]');
        if (!found) throw new Error('no change row yet: ' + turns().map((t) => t.textContent).join(' // '));
        return found as HTMLElement;
      });
      expect(change.textContent).toContain(text);
      expect(within(change).getByRole('button', { name: /^Undo/ })).toBeInTheDocument();
    });
    And('the first turn shows {string} and no button {string}', async (_, shown: string, name: string) => {
      expect(await within(turn(1)).findByText(shown)).toBeInTheDocument();
      expect(within(turn(1)).queryByRole('button', { name })).toBeNull();
      await allAnswered();
    });
  });

  Scenario('The button still does what a yes does for a setting change', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers to change the Theme to Dark', () => openWith(SETTING_OFFER));
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    And('he taps Change Theme: Dark', async () => {
      await user.click(await within(sheet()).findByRole('button', { name: 'Change Theme: Dark' }));
    });
    Then('the Theme is Dark', async () => {
      await waitFor(async () => expect(await theme()).toBe('dark'));
      // the tap also keeps the change on its turn, with Undo
      expect(await within(turn(1)).findByRole('button', { name: /^Undo/ })).toBeInTheDocument();
    });
    And('the mill received {int} bible-talk grist', async (_, count: number) => {
      expect(talkGrists()).toHaveLength(count);
      await allAnswered();
    });
  });

  Scenario('A tapped setting offer shows its change once, and after Undo only that it was put back', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers to change the Theme to Dark', () => openWith(SETTING_OFFER));
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', sends);
    And('he taps Change Theme: Dark', async () => {
      await user.click(await within(sheet()).findByRole('button', { name: 'Change Theme: Dark' }));
    });
    Then('the first turn shows the change {string} with an Undo button and no bare "Changed" line', async (_, text: string) => {
      const change = await waitFor(() => {
        const found = turn(1).querySelector('[data-talk-change]');
        if (!found) throw new Error('no change row yet');
        return found as HTMLElement;
      });
      expect(change.textContent).toContain(text);
      expect(within(change).getByRole('button', { name: /^Undo/ })).toBeInTheDocument();
      expect(within(turn(1)).queryAllByText('Changed')).toHaveLength(0);
    });
    When('he taps Undo on the first turn', async () => {
      await user.click(await within(turn(1)).findByRole('button', { name: /^Undo/ }));
    });
    Then('the first turn shows the change {string} and no bare "Changed" line', async (_, text: string) => {
      expect(await within(turn(1)).findByText(text)).toBeInTheDocument();
      expect(within(turn(1)).queryAllByText('Changed')).toHaveLength(0);
      await allAnswered();
    });
  });
});
