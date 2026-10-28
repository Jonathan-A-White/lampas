// features/steps/send-to-makers.steps.tsx — runs features/send-to-makers.feature: 'Send to the makers' in the Talk sheet and in the Verse view's Ask files what is in the composer
// as a tutor-ask request (src/talk/makers.ts), with its pictures, and asks the tutor nothing. A fake Postern answers a feedback grist with {"status":"sent"}.
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
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
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
const ACTION = 'Send to the makers';
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
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
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
const tapMakers = async (root: HTMLElement) => {
  await user.click(within(root).getByRole('button', { name: ACTION, exact: true }));
};

const feature = await loadFeature('features/send-to-makers.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = 'Lampas is opened on the Reader behind a fake Postern whose tutor offers nothing';
  const askOpened = "Lampas is opened on Romans 8 with the Verse view's Ask open behind a fake Postern whose tutor offers nothing";
  const grists = (_: unknown, count: number) => {
    expect(feedbackGrists()).toHaveLength(count);
  };
  const tutorAsk = (_: unknown, words: string, screenName: string, reference: string) => {
    expect(feedbackGrist().input).toMatchObject({ kind: 'tutor-ask', text: words, screen: screenName, reference, app_version: __APP_VERSION__ });
  };
  const schemaOk = () => expect(validate(feedbackGrist().input, feedbackSchema)).toEqual([]);
  const onePicture = () => {
    expect(feedbackGrist().attachments).toHaveLength(1);
    expect(feedbackGrist().attachments[0]).toMatchObject({ mime: 'image/jpeg', name: 'picture-1.jpg' });
  };

  Scenario('In the Talk sheet Send to the makers files his words and the screen without asking the tutor', ({ Given, When, And, Then }) => {
    Given(opened, openReader);
    When('he opens the Talk sheet on the chapter and types {string} without sending it', async (_, words: string) => {
      await openSheet();
      await typeInSheet(words);
    });
    And('he taps Send to the makers', () => tapMakers(sheet()));
    Then('the mill received {int} grists for the lampas app, kind feedback', async (_, count: number) => {
      await waitFor(() => grists(_, count));
    });
    And('the feedback grist is a tutor-ask with his words {string}, the screen {string} and the reference {string}', tutorAsk);
    And('the feedback grist carries only fields the feedback input schema allows', schemaOk);
    And('the composer says {string} and has a link {string}', async (_, line: string, link: string) => {
      expect(await within(sheet()).findByText(new RegExp(line))).toBeInTheDocument();
      expect(within(sheet()).getByRole('button', { name: link })).toBeInTheDocument();
    });
    And('the Talk sheet shows no turn', () => {
      expect(sheet().querySelectorAll('[data-turn]')).toHaveLength(0);
      expect(fake.received.filter((g) => g.grist.kind === 'bible-talk')).toHaveLength(0);
    });
  });

  Scenario('A picture attached in the Talk sheet goes to the makers with the words', ({ Given, When, And, Then }) => {
    Given(opened, openReader);
    When('he opens the Talk sheet on the chapter, attaches a picture and types {string} without sending it', async (_, words: string) => {
      await openSheet();
      await user.upload(picker(sheet()), pictureFile());
      await waitFor(() => expect(within(sheet()).getByRole('group', { name: 'Pictures to send' })).toBeInTheDocument());
      await typeInSheet(words);
    });
    And('he taps Send to the makers', () => tapMakers(sheet()));
    Then('the mill received {int} grists for the lampas app, kind feedback', async (_, count: number) => {
      await waitFor(() => grists(_, count));
    });
    And('the feedback grist carries one picture', onePicture);
    And('the phone keeps one request row that says {int} picture went with it', async (_, count: number) => {
      await waitFor(async () => expect(await db.requests.toArray()).toMatchObject([{ txid: fake.txids[0], kind: 'tutor-ask', pictures: count }]));
    });
  });

  Scenario('In the Talk sheet Send to the makers shows once there is something to send', ({ Given, When, Then, And }) => {
    Given(opened, openReader);
    When('he opens the Talk sheet on the chapter', openSheet);
    Then('the Talk sheet shows no button {string}', (_, name: string) => {
      expect(within(sheet()).queryByRole('button', { name })).toBeNull();
    });
    When('he types {string} in the Talk sheet without sending it', (_, words: string) => typeInSheet(words));
    Then('the Talk sheet shows the button {string}', async (_, name: string) => {
      expect(await within(sheet()).findByRole('button', { name })).toBeInTheDocument();
    });
    And('the mill received {int} grists for the lampas app, kind feedback', grists);
  });

  Scenario("In the Verse view's Ask, Send to the makers with nothing in the composer sends nothing and says why", ({ Given, When, And, Then }) => {
    Given(askOpened, async () => {
      await openReader();
      await openAsk();
    });
    When('he taps Send to the makers', () => tapMakers(view()));
    Then('the mill received {int} grists for the lampas app, kind feedback', grists);
    And('the composer says {string}', async (_, line: string) => {
      expect(await within(view()).findByText(new RegExp(line))).toBeInTheDocument();
    });
  });

  Scenario("The Verse view's Ask has Attach a picture and Take a photo, and Send to the makers files words and a picture", ({ Given, When, And, Then }) => {
    Given(askOpened, async () => {
      await openReader();
      await openAsk();
    });
    Then('the Ask composer has the buttons {string} and {string} and {string}', (_, attach: string, camera: string, makers: string) => {
      const composer = composerIn(view());
      expect(within(composer).getByRole('button', { name: attach })).toBeInTheDocument();
      expect(within(composer).getByRole('button', { name: camera })).toBeInTheDocument();
      expect(within(view()).getByRole('button', { name: makers })).toBeInTheDocument();
    });
    When('he attaches a picture and types {string} in the Ask composer', async (_, words: string) => {
      await user.upload(picker(view()), pictureFile());
      await user.type(await questionField(user, view()), words);
    });
    And('he taps Send to the makers', () => tapMakers(view()));
    Then('the mill received {int} grists for the lampas app, kind feedback', async (_, count: number) => {
      await waitFor(() => grists(_, count));
    });
    And('the feedback grist is a tutor-ask with his words {string}, the screen {string} and the reference {string}', tutorAsk);
    And('the feedback grist carries one picture', onePicture);
    And('the composer says {string} and has a link {string}', async (_, line: string, link: string) => {
      expect(await within(view()).findByText(new RegExp(line))).toBeInTheDocument();
      expect(within(view()).getByRole('button', { name: link })).toBeInTheDocument();
    });
    And('the phone keeps one request row, kind tutor-ask, with his words as its line', async () => {
      await waitFor(async () => expect(await db.requests.toArray()).toMatchObject([{ txid: fake.txids[0], kind: 'tutor-ask', summary: 'The Greek is too small here', words: 'The Greek is too small here', pictures: 1 }]));
    });
    When('he opens Your requests', async () => {
      act(() => openRequests('settings'));
      await screen.findByRole('heading', { name: 'Your requests', level: 1 });
    });
    Then('Your requests lists {string}', async (_, words: string) => {
      expect(await screen.findByText(words)).toBeInTheDocument();
    });
  });

  Scenario("Send in the Verse view's Ask with a picture in the row asks the tutor nothing and says where pictures go", ({ Given, When, And, Then }) => {
    Given(askOpened, async () => {
      await openReader();
      await openAsk();
    });
    When('he attaches a picture and types {string} in the Ask composer', async (_, words: string) => {
      await user.upload(picker(view()), pictureFile());
      await user.type(await questionField(user, view()), words);
    });
    And('he taps Send in the Ask composer', async () => {
      await user.click(within(composerIn(view())).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received {int} grists for the lampas app, kind verse-ask', (_, count: number) => {
      expect(fake.received.filter((g) => g.grist.kind === 'verse-ask')).toHaveLength(count);
    });
    And('the composer says {string}', async (_, line: string) => {
      expect(await within(view()).findByText(new RegExp(line))).toBeInTheDocument();
    });
  });

  Scenario('Your requests lists a request sent from the Talk sheet', ({ Given, When, And, Then }) => {
    Given(opened, openReader);
    When('he opens the Talk sheet on the chapter and types {string} without sending it', async (_, words: string) => {
      await openSheet();
      await typeInSheet(words);
    });
    And('he taps Send to the makers', () => tapMakers(sheet()));
    And('he opens Your requests', async () => {
      await waitFor(async () => expect(await db.requests.count()).toBe(1));
      act(() => openRequests('settings'));
      await screen.findByRole('heading', { name: 'Your requests', level: 1 });
    });
    Then('Your requests lists {string}', async (_, words: string) => {
      expect(await screen.findByText(words)).toBeInTheDocument();
    });
  });
});
