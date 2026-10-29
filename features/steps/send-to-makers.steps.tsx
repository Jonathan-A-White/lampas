// features/steps/send-to-makers.steps.tsx — runs features/send-to-makers.feature (mw-5r3p30.844): the Talk sheet and the Verse view's Ask have no 'Send to the makers' button; the tutor, asked for
// what Lampas cannot do, offers in the talk to pass it on (`feedback_offer`), and a tap, a typed yes or a spoken yes files it as a tutor-ask request (src/talk/offers.ts sendMakersOffer, with the
// pictures of the ask). A fake Postern answers a feedback grist with {"status":"sent"}.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { imageSeam } from '../../src/images/shrink';
import { forgetTrail } from '../../src/nav/lastRoute';
import { openRequests } from '../../src/nav/route';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { composerIn, questionField } from '../../tests/support/composer';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { validate, type Schema } from '../../tests/support/schema-validate';

const realSeam = { ...imageSeam };

afterAll(() => {
  Object.assign(imageSeam, realSeam);
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const OFFER = 'Send this to the makers';
const SUMMARY = 'He wants a Greek keyboard.';
const CANNOT = { answer: 'Lampas has no Greek keyboard. I can pass your wish to the makers; I cannot say what they will decide.', words: [], feedback_offer: { summary: SUMMARY } };
const SENT_REPLY = 'Done: I have sent that to the makers.';
const AT = { clientX: 100, clientY: 700 };
const feedbackSchema = JSON.parse(readFileSync('grinds/feedback.input.schema.json', 'utf8')) as Schema;
let fake: FakePostern;

async function openReader(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  Object.assign(imageSeam, realSeam);
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.localStorage.setItem('lampas.welcome', 'done');
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: CANNOT };
  FakeRecognizer.instances = [];
  fake.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  stubRecognizer();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  // jsdom has no canvas: a picture decodes to a size and every try at it is a small JPEG
  imageSeam.decode = async () => ({ width: 1200, height: 800, source: null });
  imageSeam.encode = async () => new Blob([new Uint8Array(120_000).fill(7)], { type: 'image/jpeg' });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.talkPictures.clear(), db.answers.clear(), db.requests.clear()]);
  await setReaderView('english');
  await setWeave('off');
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const view = () => screen.getByRole('region', { name: 'Verse view' });
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const pictureFile = (): File => new File([new Uint8Array(2_000)], 'shot-1.png', { type: 'image/png' });
const picker = (root: HTMLElement): HTMLInputElement => root.querySelector<HTMLInputElement>('input[type="file"]:not([capture])') as HTMLInputElement;
const feedbackGrists = () => fake.received.filter((g) => g.grist.kind === 'feedback');
const feedbackGrist = () => {
  const got = feedbackGrists()[0];
  if (!got) throw new Error('the mill received no feedback grist');
  return got;
};

async function openSheet(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Talk' }));
  await screen.findByRole('dialog', { name: /^Talk about / });
}
async function typeInSheet(words: string): Promise<void> {
  // The box is either already open or behind 'Type a message'; wait for whichever is drawn, not ten seconds for the box.
  const door = await waitFor(() => {
    const found = within(sheet()).queryByRole('textbox', { name: 'Your message' }) ?? within(sheet()).queryByRole('button', { name: 'Type a message' });
    if (!found) throw new Error('no box and no Type a message');
    return found;
  });
  if (door.getAttribute('role') === 'button' || door.tagName === 'BUTTON') await user.click(door);
  const box = within(sheet()).getByRole('textbox', { name: 'Your message' });
  await user.click(box);
  await user.paste(words);
}
async function openAsk(): Promise<void> {
  const heading = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === 'Walking by the Spirit');
  if (!heading) throw new Error('no heading');
  await user.click(within(heading).getByRole('button'));
  await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(view()).getByRole('button', { name: 'Ask the tutor', exact: true }));
}

const feature = await loadFeature('features/send-to-makers.feature');

const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const talkGrists = () => fake.received.filter((g) => g.grist.kind === 'bible-talk');
const FAILING_OPEN = 'Lampas is opened on the Reader behind a fake Postern whose tutor cannot do what he asks';

describeFeature(feature, ({ Scenario }) => {
  const openedAsk = "Lampas is opened on Romans 8 with the Verse view's Ask open behind a fake Postern whose tutor cannot do what he asks";
  const grists = (_: unknown, count: number) => waitFor(() => expect(feedbackGrists()).toHaveLength(count));
  const tutorAsk = (_: unknown, words: string, summary: string, screenName: string, reference: string) =>
    waitFor(() => expect(feedbackGrist().input).toMatchObject({ kind: 'tutor-ask', text: words, summary, screen: screenName, reference, app_version: __APP_VERSION__ }));
  const schemaOk = () => expect(validate(feedbackGrist().input, feedbackSchema)).toEqual([]);
  const onePicture = () => {
    expect(feedbackGrist().attachments).toHaveLength(1);
    expect(feedbackGrist().attachments[0]).toMatchObject({ mime: 'image/jpeg', name: 'picture-1.jpg' });
  };
  const attachesAndTypes = async (_: unknown, words: string) => {
    await openSheet();
    await user.upload(picker(sheet()), pictureFile());
    await waitFor(() => expect(within(sheet()).getByRole('group', { name: 'Pictures to send' })).toBeInTheDocument());
    await typeInSheet(words);
  };
  const noButton = (root: () => HTMLElement) => (_: unknown, name: string) => {
    expect(within(root()).queryByRole('button', { name, exact: true })).toBeNull();
  };
  const asksWithPicture = async (_: unknown, words: string) => {
    await attachesAndTypes(_, words);
    await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
  };
  const cannotAndOffers = async () => {
    expect(await within(sheet()).findByText(CANNOT.answer)).toBeInTheDocument();
    expect(within(sheet()).getByRole('button', { name: OFFER })).toBeInTheDocument();
  };
  const tapsOffer = async () => {
    await user.click(await within(sheet()).findByRole('button', { name: OFFER }));
  };
  const nextIsYes = () => {
    fake.autoReply = { status: 'answered', answer: { answer: SENT_REPLY, words: [], offer_reply: 'confirm' } };
  };
  const pending = (n: number) => (talkGrists()[n - 1].input as { pending_offer?: unknown }).pending_offer;
  const firstTurnSent = async () => {
    const first = await waitFor(() => turns()[0]);
    expect(await within(first).findByText('Sent')).toBeInTheDocument();
    expect(within(first).queryByRole('button', { name: OFFER })).toBeNull();
  };
  const sentOnce = async () => {
    await waitFor(() => expect(turns()).toHaveLength(talkGrists().length));
    expect(feedbackGrists()).toHaveLength(1);
  };
  const feedbackCount = (_: unknown, count: number) => expect(feedbackGrists()).toHaveLength(count);

  Scenario('The Talk sheet has no Send to the makers button, with words typed or a picture attached', ({ Given, When, Then, And }) => {
    Given(FAILING_OPEN, openReader);
    When('he opens the Talk sheet on the chapter, attaches a picture and types {string} without sending it', attachesAndTypes);
    Then('the Talk sheet shows no button {string}', noButton(sheet));
    And('the mill received {int} grists for the lampas app, kind feedback', feedbackCount);
  });

  Scenario("The Verse view's Ask has Attach a picture and Take a photo and no Send to the makers button", ({ Given, When, Then, And }) => {
    Given(openedAsk, async () => {
      await openReader();
      await openAsk();
    });
    When('he attaches a picture and types {string} in the Ask composer', async (_, words: string) => {
      await user.upload(picker(view()), pictureFile());
      await user.type(await questionField(user, view()), words);
    });
    Then('the Ask composer has the buttons {string} and {string}', (_, attach: string, camera: string) => {
      const composer = composerIn(view());
      expect(within(composer).getByRole('button', { name: attach })).toBeInTheDocument();
      expect(within(composer).getByRole('button', { name: camera })).toBeInTheDocument();
    });
    And('the Verse view shows no button {string}', noButton(view));
  });

  Scenario('When the tutor cannot do what he asks, the talk offers to pass it on and a tap sends it with the pictures', ({ Given, When, Then, And }) => {
    Given(FAILING_OPEN, openReader);
    When('he opens the Talk sheet on the chapter and asks {string} with a picture attached', asksWithPicture);
    Then('the talk answers that it cannot, and shows the button {string}', cannotAndOffers);
    And('the mill received {int} grists for the lampas app, kind feedback', feedbackCount);
    When('he taps Send this to the makers', tapsOffer);
    Then('the mill received {int} grists for the lampas app, kind feedback', grists);
    And('the feedback grist is a tutor-ask with his words {string}, the summary {string}, the screen {string} and the reference {string}', tutorAsk);
    And('the feedback grist carries only fields the feedback input schema allows', schemaOk);
    And('the feedback grist carries one picture', onePicture);
    And('the first turn shows {string} and no button {string}', firstTurnSent);
  });

  Scenario('Typing yes to the offer sends it as the tap does', ({ Given, When, Then, And }) => {
    Given(FAILING_OPEN, openReader);
    When('he opens the Talk sheet on the chapter and asks {string} with a picture attached', asksWithPicture);
    Then('the talk answers that it cannot, and shows the button {string}', cannotAndOffers);
    When('the tutor will take his next words as a yes', nextIsYes);
    And('he types {string} in the Talk sheet and sends it', async (_, words: string) => {
      await typeInSheet(words);
      await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
    });
    Then('the second bible-talk grist carries the pending offer of kind feedback with the summary {string}', async (_, summary: string) => {
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      expect(pending(2)).toEqual({ kind: 'feedback', text: summary });
    });
    And('the mill received {int} grists for the lampas app, kind feedback', grists);
    And('the feedback grist is a tutor-ask with his words {string}, the summary {string}, the screen {string} and the reference {string}', tutorAsk);
    And('the feedback grist carries one picture', onePicture);
    And('the first turn shows {string} and no button {string}', async () => {
      await firstTurnSent();
      await sentOnce();
    });
  });

  Scenario('Saying yes to the offer sends it as the tap does', ({ Given, When, Then, And }) => {
    const holdAndSay = async (words: string) => {
      const before = FakeRecognizer.instances.length;
      const bar = await within(sheet()).findByRole('button', { name: /^Hold to talk$/ });
      await user.pointer({ keys: '[MouseLeft>]', target: bar, coords: AT });
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
      act(() => {
        FakeRecognizer.last().open();
        FakeRecognizer.last().say([result(words, false)]);
      });
      await user.pointer({ keys: '[/MouseLeft]', target: bar, coords: AT });
    };
    Given(FAILING_OPEN, openReader);
    When('he opens the Talk sheet on the chapter and speaks {string}', async (_, words: string) => {
      await openSheet();
      await holdAndSay(words);
    });
    Then('the talk answers that it cannot, and shows the button {string}', cannotAndOffers);
    When('the tutor will take his next words as a yes', nextIsYes);
    And('he speaks {string} in the Talk sheet', (_, words: string) => holdAndSay(words));
    Then('the second bible-talk grist is marked as spoken and carries the pending offer of kind feedback with the summary {string}', async (_, summary: string) => {
      await waitFor(() => expect(talkGrists()).toHaveLength(2));
      expect(talkGrists()[1].input.spoken).toBe(true);
      expect(pending(2)).toEqual({ kind: 'feedback', text: summary });
    });
    And('the mill received {int} grists for the lampas app, kind feedback', grists);
    And('the first turn shows {string} and no button {string}', async () => {
      await firstTurnSent();
      await sentOnce();
    });
  });

  Scenario('Your requests lists a request sent from the offer', ({ Given, When, And, Then }) => {
    Given(FAILING_OPEN, openReader);
    When('he opens the Talk sheet on the chapter and asks {string} with a picture attached', asksWithPicture);
    Then('the talk answers that it cannot, and shows the button {string}', cannotAndOffers);
    When('he taps Send this to the makers', tapsOffer);
    And('he opens Your requests', async () => {
      await waitFor(() => expect(feedbackGrists()).toHaveLength(1));
      act(() => openRequests('settings'));
      await screen.findByRole('heading', { name: 'Your requests', level: 1 });
    });
    Then('Your requests lists {string}', async (_, words: string) => {
      expect(await screen.findByText(words)).toBeInTheDocument();
    });
    And('the phone keeps one request row, kind tutor-ask, that says {int} picture went with it', async (_, count: number) => {
      await waitFor(async () => expect(await db.requests.toArray()).toMatchObject([{ kind: 'tutor-ask', summary: SUMMARY, pictures: count }]));
    });
  });
});
