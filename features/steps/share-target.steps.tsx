// features/steps/share-target.steps.tsx — runs features/share-target.feature: Share > Lampas opens the 'Share to Lampas' sheet, which places the shared
// pictures and words in a talk's composer (src/share/). The share is a row in Dexie, as the worker parks it (tests/unit/sw-share.test.ts proves that half);
// the talk is the Talk sheet over its own scope. The mill is the fake Postern of tests/support/fake-postern.ts, the canvas the image seam of src/images/shrink.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { addTurn, parkShare } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { imageSeam } from '../../src/images/shrink';
import { dateText } from '../../src/share/talkPlace';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';
import { ASYNC_WAIT_MS } from '../../tests/support/timeouts';

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
const SHARE_ID = 'share-1';
const SHARED_WORDS = 'ἀγάπη in BDAG';
const HOUR = 3_600_000;
let fake: FakePostern;

const picture = (name: string): { name: string; type: string; bytes: ArrayBuffer } => ({ name, type: 'image/png', bytes: new Uint8Array([1, 2, 3]).buffer });

/** Opens the app at the Share screen with the share parked and the past talks kept, as the worker and earlier sessions leave them. */
async function open(options: { talks: boolean; files: number; text: string; other?: { name: string; type: string } }): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  Object.assign(imageSeam, realSeam);
  stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/#/share?s=${SHARE_ID}`);
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'Noted.', words: [] } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  imageSeam.decode = async () => ({ width: 1200, height: 800, source: null });
  imageSeam.encode = async () => new Blob([new Uint8Array(50_000).fill(7)], { type: 'image/jpeg' });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.talkPictures.clear(), db.shares.clear()]);
  const now = Date.now();
  if (options.talks) {
    await addTurn('rom.8', 'What is this chapter about?', 'It is about life in the Spirit.', [], now - 3 * 24 * HOUR);
    await addTurn('rom.8.28', 'Why do all things work together?', 'Because God works in them.', [], now - 2.5 * HOUR);
  }
  await parkShare({
    id: SHARE_ID,
    createdAt: now,
    text: options.text || undefined,
    files: options.other ? [{ ...options.other, bytes: new Uint8Array([71, 73, 70, 56, 57, 97]).buffer }] : Array.from({ length: options.files }, (_, i) => picture(`shared-${i + 1}.png`)),
  });
  render(<App />);
  await screen.findByRole('dialog', { name: 'Share to Lampas' });
}

const chooser = () => screen.getByRole('dialog', { name: 'Share to Lampas' });
const field = (sheet: HTMLElement) => within(sheet).getByRole('textbox', { name: 'Your message' });
const thumbs = (sheet: HTMLElement): HTMLElement[] => {
  const group = within(sheet).queryByRole('group', { name: 'Pictures to send' });
  return group ? within(group).queryAllByRole('img') : [];
};

/** The phone's Back: waits for the open sheet's history entry, presses Back, and waits for the popstate it makes, however late the host delivers it. */
async function back(): Promise<void> {
  await waitFor(() => expect((window.history.state as { sheet?: number } | null)?.sheet ?? 0).toBeGreaterThan(0));
  await act(async () => {
    const popped = new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ASYNC_WAIT_MS);
      window.addEventListener(
        'popstate',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
    window.history.back();
    await popped;
  });
}

const feature = await loadFeature('features/share-target.feature');

describeFeature(feature, ({ Scenario }) => {
  const TWO_AND_WORDS = 'the Share screen is opened with two past talks and a share of two pictures and some words';
  const openFull = () => open({ talks: true, files: 2, text: SHARED_WORDS });
  const talkOpen = async (_: unknown, name: string): Promise<void> => {
    const sheet = await screen.findByRole('dialog', { name });
    await within(sheet).findByText(/^(What is this chapter about\?|Why do all things work together\?)$/);
  };
  const composer = async (_: unknown, count: string, words: string): Promise<void> => {
    const sheet = screen.getByRole('dialog', { name: /^(Talk about |Talk with the tutor)/ });
    await waitFor(() => expect(thumbs(sheet)).toHaveLength(count === 'two' ? 2 : 0));
    expect(field(sheet)).toHaveValue(words);
  };
  const nothingSent = async (): Promise<void> => {
    // the mill has had time to be called, and was sent nothing of the talk (the pictures are read for Bible references by the find-refs grind, mw-s1dc0n.2: that is no message)
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fake.received.filter((r) => r.grist.kind !== 'find-refs')).toHaveLength(0);
    await waitFor(async () => expect(await db.shares.count()).toBe(0));
  };
  const readerIsOpen = async (): Promise<void> => {
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    await waitFor(async () => expect(await db.shares.count()).toBe(0));
    expect(window.location.hash).not.toContain('share');
  };

  Scenario('The sheet offers Continue first, then New talk, then Choose a talk', ({ Given, Then }) => {
    Given(TWO_AND_WORDS, openFull);
    Then('the sheet "Share to Lampas" offers, in order, {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      const names = within(chooser())
        .getAllByRole('button')
        .map((b) => b.textContent);
      expect(names.slice(0, 3)).toEqual([a, b, c]);
    });
  });

  Scenario('Continue opens the newest talk with the share waiting in its composer', ({ Given, When, Then, And }) => {
    Given(TWO_AND_WORDS, openFull);
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    Then('the talk sheet {string} is open with his earlier question in it', talkOpen);
    And('the composer shows {word} thumbnails and the field holds {string}', composer);
    And('the mill received no message of the talk and no share is waiting', nothingSent);
  });

  Scenario('New talk opens an empty talk with the share', ({ Given, When, Then, And }) => {
    Given(TWO_AND_WORDS, openFull);
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    Then('the talk sheet {string} is open with nothing said yet', async (_, name: string) => {
      const sheet = await screen.findByRole('dialog', { name });
      expect(await within(sheet).findByText(/^Nothing said yet/)).toBeInTheDocument();
    });
    And('the composer shows {word} thumbnails and the field holds {string}', composer);
    And('the mill received no message of the talk and no share is waiting', nothingSent);
  });

  Scenario('Choose a talk lists the talks newest first and opens the picked one', ({ Given, When, Then, And }) => {
    Given(TWO_AND_WORDS, openFull);
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    Then('the talks listed are {string} then {string}, each with its first question and its date', (_, first: string, second: string) => {
      const items = within(within(chooser()).getByRole('list', { name: 'Recent talks' })).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent(first);
      expect(items[0]).toHaveTextContent('Why do all things work together?');
      expect(items[1]).toHaveTextContent(second);
      expect(items[1]).toHaveTextContent('What is this chapter about?');
      // the date, day and month, of each talk's last turn
      const dateOf = (daysAgo: number) => dateText(Date.now() - daysAgo * 24 * HOUR);
      expect(items[1]).toHaveTextContent(dateOf(3));
    });
    When('he picks {string}', async (_, label: string) => {
      const list = within(chooser()).getByRole('list', { name: 'Recent talks' });
      await user.click(within(list).getByRole('button', { name: new RegExp(`^${label}(?![:\\d])`) }));
    });
    Then('the talk sheet {string} is open with his earlier question in it', talkOpen);
    And('the composer shows {word} thumbnails and the field holds {string}', composer);
  });

  Scenario('Cancel drops the share', ({ Given, When, Then }) => {
    Given(TWO_AND_WORDS, openFull);
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    Then('no share is waiting and the Reader is open', readerIsOpen);
  });

  Scenario("The phone's Back drops the share", ({ Given, When, Then }) => {
    Given(TWO_AND_WORDS, openFull);
    When("he presses the phone's Back", back);
    Then('no share is waiting and the Reader is open', readerIsOpen);
  });

  Scenario("The phone's Back drops the share on a slow host", ({ Given, And, When, Then }) => {
    Given(TWO_AND_WORDS, openFull);
    And('the host is slow to deliver Back and to forget the share', () => {
      // a loaded host: the Back lands long after it was pressed, and the write that drops the share after that
      const realBack = window.history.back.bind(window.history);
      vi.spyOn(window.history, 'back').mockImplementationOnce(() => void setTimeout(realBack, 300));
      const clear = db.shares.clear.bind(db.shares);
      vi.spyOn(db.shares, 'clear').mockImplementationOnce(() => new Promise<void>((resolve) => setTimeout(() => void clear().then(() => resolve()), 300)));
    });
    When("he presses the phone's Back", back);
    Then('no share is waiting and the Reader is open', readerIsOpen);
  });

  Scenario('A share of words alone works the same', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with two past talks and a share of words alone', () => open({ talks: true, files: 0, text: 'https://example.org/entry' }));
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    Then('the talk sheet {string} is open with his earlier question in it', talkOpen);
    And('the composer shows no thumbnails and the field holds {string}', async (_, words: string) => {
      const sheet = screen.getByRole('dialog', { name: /^Talk about / });
      await waitFor(() => expect(field(sheet)).toHaveValue(words));
      expect(thumbs(sheet)).toHaveLength(0);
    });
  });

  Scenario('With no past talk the sheet offers New talk alone', ({ Given, Then }) => {
    Given('the Share screen is opened with no past talk and a share of two pictures and some words', () => open({ talks: false, files: 2, text: SHARED_WORDS }));
    Then('the sheet "Share to Lampas" offers, in order, {string}', (_, only: string) => {
      const names = within(chooser())
        .getAllByRole('button')
        .map((b) => b.textContent);
      expect(names).toEqual([only, 'Cancel']);
    });
  });

  Scenario('After leaving the app and coming back, the talk he was in is where he left it', ({ Given, When, And, Then }) => {
    Given(TWO_AND_WORDS, openFull);
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    And('he leaves the app and comes back', async () => {
      await screen.findByRole('dialog', { name: 'Talk about Romans 8:28' });
      const hash = window.location.hash;
      cleanup();
      window.history.replaceState(null, '', `/${hash}`);
      render(<App />);
    });
    Then('the talk sheet {string} is open with his earlier question in it', talkOpen);
    And('the composer shows no thumbnails', async () => {
      const sheet = screen.getByRole('dialog', { name: 'Talk about Romans 8:28' });
      expect(thumbs(sheet)).toHaveLength(0);
      expect(field(sheet)).toHaveValue('');
    });
  });

  Scenario('Back from the talk leaves the share screen for the Reader', ({ Given, When, And, Then }) => {
    Given(TWO_AND_WORDS, openFull);
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    And("he presses the phone's Back", async () => {
      await screen.findByRole('dialog', { name: 'Talk with the tutor' });
      await back();
    });
    Then('no share is waiting and the Reader is open', readerIsOpen);
  });

  const GIF = { name: 'shared.gif', type: 'image/gif' };
  const onlyCancel = (_: unknown, ...left: string[]) => {
    const names = within(chooser())
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(names).toEqual(['Cancel']);
    // the buttons the sheet does not offer are the ones the feature names
    for (const label of left.slice(0, -1)) expect(names).not.toContain(label);
    expect(chooser().querySelector('[data-share-continue]')).toBeNull();
    expect(chooser()).not.toHaveTextContent('Where should they go?');
  };
  const leftOut = (_: unknown, line: string) => expect(within(chooser()).getByText(line)).toBeInTheDocument();

  Scenario('A shared GIF is not counted as a picture to read, and the sheet says so', ({ Given, Then, And }) => {
    Given('the Share screen is opened with two past talks and a shared GIF', () => open({ talks: true, files: 0, text: '', other: GIF }));
    Then('the sheet says Lampas leaves the GIF out because it reads only JPEG, PNG or WebP, and does not count it as a picture', () => {
      const sheet = chooser();
      expect(within(sheet).getByText('1 picture left out: Lampas reads only JPEG, PNG or WebP.')).toBeInTheDocument();
      expect(sheet).not.toHaveTextContent(/1 picture from another app/);
    });
    And('the sheet offers no {string}, {string} or {string}, only {string}', (_, a: string, b: string, c: string, d: string) => onlyCancel(_, a, b, c, d));
    And('no picture was sent to the mill to be read', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(fake.received).toHaveLength(0);
    });
  });

  Scenario('A share of nothing Lampas can read offers only Cancel, whatever the file is', ({ Given, Then, And }) => {
    Given('the Share screen is opened with two past talks and a shared PDF', () => open({ talks: true, files: 0, text: '', other: { name: 'shared.pdf', type: 'application/pdf' } }));
    Then('the sheet says {string}', leftOut);
    And('the sheet offers no {string}, {string} or {string}, only {string}', (_, a: string, b: string, c: string, d: string) => onlyCancel(_, a, b, c, d));
  });

  Scenario('A share of a file of an unknown type offers only Cancel', ({ Given, Then, And }) => {
    Given('the Share screen is opened with two past talks and a shared file of no known type', () => open({ talks: true, files: 0, text: '', other: { name: 'shared', type: '' } }));
    Then('the sheet says {string}', leftOut);
    And('the sheet offers no {string}, {string} or {string}, only {string}', (_, a: string, b: string, c: string, d: string) => onlyCancel(_, a, b, c, d));
  });

  Scenario('With no past talk a shared GIF offers only Cancel', ({ Given, Then }) => {
    Given('the Share screen is opened with no past talk and a shared GIF', () => open({ talks: false, files: 0, text: '', other: GIF }));
    Then('the sheet offers no {string} or {string}, only {string}', (_, a: string, b: string, c: string) => onlyCancel(_, a, b, c));
  });

  Scenario('Cancel on a share of nothing readable drops it', ({ Given, When, Then }) => {
    Given('the Share screen is opened with two past talks and a shared GIF', () => open({ talks: true, files: 0, text: '', other: GIF }));
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    Then('no share is waiting and the Reader is open', readerIsOpen);
  });

  Scenario('A shared GIF with some words still offers the talks, and leaves the GIF out', ({ Given, Then, When, And }) => {
    Given('the Share screen is opened with two past talks and a shared GIF with some words', () => open({ talks: true, files: 0, text: SHARED_WORDS, other: GIF }));
    Then('the sheet "Share to Lampas" offers, in order, {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      const names = within(chooser())
        .getAllByRole('button')
        .map((b) => b.textContent);
      expect(names.slice(0, 3)).toEqual([a, b, c]);
    });
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    Then('the talk sheet {string} is open with nothing said yet', async (_, name: string) => {
      const sheet = await screen.findByRole('dialog', { name });
      expect(await within(sheet).findByText(/^Nothing said yet/)).toBeInTheDocument();
    });
    And('the composer shows no thumbnails and the field holds {string}', async (_, words: string) => {
      const sheet = screen.getByRole('dialog', { name: 'Talk with the tutor' });
      await waitFor(() => expect(field(sheet)).toHaveValue(words));
      expect(thumbs(sheet)).toHaveLength(0);
    });
  });
});
