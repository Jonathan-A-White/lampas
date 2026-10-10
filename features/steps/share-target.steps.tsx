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
async function open(options: { talks: boolean; files: number; text: string }): Promise<void> {
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
    files: Array.from({ length: options.files }, (_, i) => picture(`shared-${i + 1}.png`)),
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

async function back(): Promise<void> {
  await act(async () => {
    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 30));
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
    // the mill has had time to be called, and was not
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fake.received).toHaveLength(0);
    expect(await db.shares.count()).toBe(0);
  };
  const readerIsOpen = async (): Promise<void> => {
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    expect(await db.shares.count()).toBe(0);
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
    And('the mill received nothing and no share is waiting', nothingSent);
  });

  Scenario('New talk opens an empty talk with the share', ({ Given, When, Then, And }) => {
    Given(TWO_AND_WORDS, openFull);
    When('he taps {string}', async (_, label: string) => user.click(within(chooser()).getByRole('button', { name: label })));
    Then('the talk sheet {string} is open with nothing said yet', async (_, name: string) => {
      const sheet = await screen.findByRole('dialog', { name });
      expect(within(sheet).getByText(/^Nothing said yet/)).toBeInTheDocument();
    });
    And('the composer shows {word} thumbnails and the field holds {string}', composer);
    And('the mill received nothing and no share is waiting', nothingSent);
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
});
