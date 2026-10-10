// features/steps/talk-pictures.steps.tsx — runs features/talk-pictures.feature: the Talk sheet takes pictures (attach, camera, paste), cuts them down on the
// phone, sends them as the grist's attachments, shows them as thumbnails in his turn and keeps them with the talk. The mill is the fake Postern of
// tests/support/fake-postern.ts, speech the recording fake of tests/support/fake-speech.ts, the canvas the image seam of src/images/shrink.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { imageSeam } from '../../src/images/shrink';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

const realSeam = { ...imageSeam };

afterAll(() => {
  cleanup();
  stopReading();
  Object.assign(imageSeam, realSeam);
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
let synth: FakeSynth;
let picture = 0;
/** every size the canvas was asked to draw a picture at */
let drawn: { width: number; height: number }[] = [];
/** the size the next picture decodes to */
let decodedAs = { width: 1200, height: 800 };
/** how many bytes the canvas's JPEG has */
const JPEG_BYTES = 120_000;

const ANSWER = { answer: 'This is a lexicon entry. It explains a word and where it is used.', words: [] };

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const field = () => within(sheet()).getByRole('textbox', { name: 'Your message' });
const pictureFile = (type = 'image/png'): File => new File([new Uint8Array(2_000_000)], `shot-${++picture}.${type.split('/')[1]}`, { type });
const composerThumbs = (): HTMLElement[] => {
  const group = within(sheet()).queryByRole('group', { name: 'Pictures to send' });
  return group ? within(group).queryAllByRole('img') : [];
};
const turnThumbs = (): HTMLElement[] => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn] [data-turn-pictures] button'));

async function openTalk(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Talk' }));
  await screen.findByRole('dialog', { name: /^Talk about / });
}

async function open(answer: { answer: string; words: unknown[] } = ANSWER): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  Object.assign(imageSeam, realSeam);
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  // the canvas: jsdom has none. The picture decodes to `decodedAs` and every try at it is a JPEG of JPEG_BYTES.
  decodedAs = { width: 1200, height: 800 };
  drawn = [];
  imageSeam.decode = async () => ({ ...decodedAs, source: null });
  imageSeam.encode = async (_decoded, width, height) => {
    drawn.push({ width, height });
    return new Blob([new Uint8Array(JPEG_BYTES).fill(7)], { type: 'image/jpeg' });
  };
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.talkPictures.clear()]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await openTalk();
}

async function attach(file = pictureFile()): Promise<void> {
  await user.upload(within(sheet()).getByLabelText('Picture file'), file);
}

async function typeAndSend(text: string): Promise<void> {
  await user.type(field(), text);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}

async function sent(): Promise<void> {
  await waitFor(() => expect(sheet().querySelector('[data-turn]')).not.toBeNull());
}

const feature = await loadFeature('features/talk-pictures.feature');

describeFeature(feature, ({ Scenario }) => {
  const Given0 = 'Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern';

  Scenario('Attaching a picture shows its thumbnail in the composer with a remove x', ({ Given, When, Then, And }) => {
    Given(Given0, () => open());
    When('he attaches a picture', () => attach());
    Then('the composer shows one thumbnail, "Picture 1", with a remove x', async () => {
      await waitFor(() => expect(composerThumbs()).toHaveLength(1));
      expect(composerThumbs()[0]).toHaveAccessibleName('Picture 1');
      expect(within(sheet()).getByRole('button', { name: 'Remove picture 1' })).toBeInTheDocument();
    });
    And('the picture button and the camera button are there to add more', () => {
      expect(within(sheet()).getByRole('button', { name: 'Attach a picture' })).toBeInTheDocument();
      expect(within(sheet()).getByRole('button', { name: 'Take a photo' })).toBeInTheDocument();
    });
    When('he removes the first picture', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Remove picture 1' }));
    });
    Then('the composer shows no thumbnails', () => {
      expect(composerThumbs()).toHaveLength(0);
    });
  });

  Scenario("Send puts the picture in the grist's attachments and a thumbnail in his turn", ({ Given, When, Then, And }) => {
    Given(Given0, () => open());
    When('he attaches a picture', () => attach());
    And('he types {string} and taps Send', async (_, text: string) => {
      await waitFor(() => expect(composerThumbs()).toHaveLength(1));
      await typeAndSend(text);
    });
    Then('the mill received one grist for the lampas app, kind bible-talk, with the question {string} and one picture', async (_, question: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      const grist = fake.received[0];
      expect(grist.grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
      expect(grist.input.question).toBe(question);
      expect(grist.input.pictures).toBe(1);
    });
    And('the grist has one attachment of type {string}', (_, mime: string) => {
      expect(fake.received[0].attachments).toHaveLength(1);
      expect(fake.received[0].attachments[0].mime).toBe(mime);
    });
    And('his turn shows one thumbnail {string}', async (_, name: string) => {
      await sent();
      await waitFor(() => expect(turnThumbs()).toHaveLength(1));
      expect(turnThumbs()[0]).toHaveAccessibleName(name);
    });
    And('the composer shows no thumbnails', () => {
      expect(composerThumbs()).toHaveLength(0);
    });
  });

  Scenario('A picture alone can be sent', ({ Given, When, Then, And }) => {
    Given(Given0, () => open());
    When('he attaches a picture', () => attach());
    And('he taps Send', async () => {
      await waitFor(() => expect(composerThumbs()).toHaveLength(1));
      await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received one grist for the lampas app, kind bible-talk, with the question {string} and one picture', async (_, question: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].input.question).toBe(question);
      expect(fake.received[0].input.pictures).toBe(1);
    });
  });

  Scenario('A pasted picture becomes an attachment', ({ Given, When, Then }) => {
    Given(Given0, () => open());
    When('he pastes a picture into the message', async () => {
      fireEvent.paste(field(), { clipboardData: { files: [pictureFile('image/png')], items: [], types: ['Files'], getData: () => '' } });
    });
    Then('the composer shows one thumbnail, "Picture 1", with a remove x', async () => {
      await waitFor(() => expect(composerThumbs()).toHaveLength(1));
      expect(composerThumbs()[0]).toHaveAccessibleName('Picture 1');
      expect(within(sheet()).getByRole('button', { name: 'Remove picture 1' })).toBeInTheDocument();
    });
  });

  Scenario('Pasted text is left alone', ({ Given, When, Then }) => {
    Given(Given0, () => open());
    When('he pastes only text into the message', () => {
      fireEvent.paste(field(), { clipboardData: { files: [], items: [], types: ['text/plain'], getData: () => 'hello' } });
    });
    Then('the composer shows no thumbnails', () => {
      expect(composerThumbs()).toHaveLength(0);
    });
  });

  Scenario('A fifth picture is refused with a message', ({ Given, When, Then, And }) => {
    Given(Given0, () => open());
    When('he attaches {int} pictures', async (_, count: number) => {
      await user.upload(within(sheet()).getByLabelText('Picture file'), Array.from({ length: count }, () => pictureFile()));
      await waitFor(() => expect(composerThumbs()).toHaveLength(count));
    });
    And('he attaches one more picture', () => attach());
    Then('the sheet says {string}', async (_, line: string) => {
      expect(await within(sheet()).findByText(new RegExp(line))).toBeInTheDocument();
    });
    And('the composer shows {int} thumbnails', (_, count: number) => {
      expect(composerThumbs()).toHaveLength(count);
    });
  });

  Scenario('Something that is not a picture is refused', ({ Given, When, Then, And }) => {
    Given(Given0, () => open());
    When('he attaches a file of type {string}', (_, type: string) => {
      // the picker's own filter would not offer it; a pasted or dropped file can still be anything
      fireEvent.change(within(sheet()).getByLabelText('Picture file'), { target: { files: [pictureFile(type)] } });
    });
    Then('the sheet says {string}', async (_, line: string) => {
      expect(await within(sheet()).findByText(new RegExp(line))).toBeInTheDocument();
    });
    And('the composer shows no thumbnails', () => {
      expect(composerThumbs()).toHaveLength(0);
    });
  });

  Scenario('A 4000 px picture is sent at most 1600 px on the long edge', ({ Given, When, Then, And }) => {
    Given(Given0, () => open());
    When('he attaches a picture 4000 px wide and 3000 px high', async () => {
      decodedAs = { width: 4000, height: 3000 };
      await attach();
      await waitFor(() => expect(composerThumbs()).toHaveLength(1));
    });
    And('he types {string} and taps Send', (_, text: string) => typeAndSend(text));
    Then('no picture was drawn larger than 1600 px on its long edge', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(drawn.length).toBeGreaterThan(0);
      for (const size of drawn) expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(1600);
      expect(drawn[0]).toEqual({ width: 1600, height: 1200 });
    });
    And('the grist has one attachment of type {string}', (_, mime: string) => {
      expect(fake.received[0].attachments).toHaveLength(1);
      expect(fake.received[0].attachments[0].mime).toBe(mime);
    });
    And("the sent picture is under the grind's byte limit", () => {
      const grind = JSON.parse(readFileSync('grinds/bible-talk.json', 'utf8')) as { attachments: { maxBytes: number } };
      expect(fake.blobs).toHaveLength(1);
      expect(fake.blobs[0].size).toBeLessThan(grind.attachments.maxBytes + 200);
    });
  });

  Scenario('The talk grind takes up to four pictures of the three kinds', ({ Then }) => {
    Then('the bible-talk grind takes {int} to {int} attachments of {string}, {string} and {string}', (_, min: number, max: number, a: string, b: string, c: string) => {
      const grind = JSON.parse(readFileSync('grinds/bible-talk.json', 'utf8')) as { attachments: { min: number; max: number; mime: string[]; maxBytes: number } };
      expect(grind.attachments).toMatchObject({ min, max });
      expect(grind.attachments.mime).toEqual([a, b, c]);
      expect(grind.attachments.maxBytes).toBeGreaterThan(0);
    });
  });

  Scenario('A Greek word the tutor quotes is a word he can tap to hear', ({ Given, When, And, Then }) => {
    Given("Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern, and the tutor's answer quotes the Greek word {string}", (_, word: string) =>
      open({ answer: `The entry is for **${word}**, “I weep”. It is the root of the word used when Jesus wept.`, words: [] }),
    );
    When('he sends {string}', async (_, text: string) => {
      await typeAndSend(text);
      await sent();
    });
    And('he taps the Greek word {string} in the answer', async (_, word: string) => {
      const button = await waitFor(() => {
        const found = Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn] [data-answer-text] [lang="grc"]')).find((s) => s.textContent === word);
        const b = found?.closest('button');
        if (!b) throw new Error(`no Greek word button ${word}`);
        return b;
      });
      await user.click(button);
    });
    Then('the phone is told to speak {string} in {string}', (_, text: string, lang: string) => {
      expect(synth.spoken.at(-1)).toMatchObject({ text, lang });
    });
  });

  Scenario('A reopened talk still shows the pictures of his turn', ({ Given, When, And, Then }) => {
    Given(Given0, () => open());
    When('he attaches a picture', () => attach());
    And('he types {string} and taps Send', async (_, text: string) => {
      await waitFor(() => expect(composerThumbs()).toHaveLength(1));
      await typeAndSend(text);
    });
    And('his turn shows one thumbnail {string}', async (_, name: string) => {
      await sent();
      await waitFor(() => expect(turnThumbs()).toHaveLength(1));
      expect(turnThumbs()[0]).toHaveAccessibleName(name);
    });
    And('Lampas is closed and opened again on the same talk', async () => {
      cleanup();
      stopReading();
      db.close();
      await db.open();
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      await openTalk();
    });
    Then('his turn shows one thumbnail {string}', async (_, name: string) => {
      await waitFor(() => expect(turnThumbs()).toHaveLength(1));
      expect(turnThumbs()[0]).toHaveAccessibleName(name);
    });
  });

  Scenario('A tap on a thumbnail opens the picture full screen and Back closes it', ({ Given, When, And, Then }) => {
    Given(Given0, () => open());
    When('he attaches a picture', () => attach());
    And('he types {string} and taps Send', async (_, text: string) => {
      await waitFor(() => expect(composerThumbs()).toHaveLength(1));
      await typeAndSend(text);
    });
    And('he taps the thumbnail {string} in his turn', async (_, name: string) => {
      await sent();
      await waitFor(() => expect(turnThumbs()).toHaveLength(1));
      await user.click(within(sheet()).getByRole('button', { name }));
    });
    Then('the picture {string} is open full screen', async (_, name: string) => {
      const viewer = await screen.findByRole('dialog', { name });
      expect(within(viewer).getByRole('img', { name })).toBeInTheDocument();
    });
    When('he presses Back', async () => {
      await act(async () => {
        window.history.back();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    });
    Then('no picture is open full screen', () => {
      expect(screen.queryByRole('dialog', { name: 'Picture 1' })).toBeNull();
    });
    And('the Talk sheet is still open', () => {
      expect(sheet()).toBeInTheDocument();
    });
  });
});
