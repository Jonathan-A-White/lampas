// features/steps/immersive-reader.steps.tsx — runs features/immersive-reader.feature: the Immersive reader setting (src/immersive.ts, src/Away.tsx).
// jsdom has no layout, so the box's scroll position and size are stood in for by hand and "out of view" is what the app says of itself:
// the bars sit in a [data-away] wrapper, inert and hidden from the accessibility tree. How it looks at 412 px is tests/e2e/immersive-reader.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { act, fireEvent, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { ASK_TUTOR_LABEL } from '../../src/AskTutor';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech } from '../../tests/support/fake-speech';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** past the app's 500 ms hold */
const HOLD_MS = 650;
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
const SCROLL_HEIGHT = 5000;
const CLIENT_HEIGHT = 700;

async function open(options: { immersive: 'on' | 'off'; recogniser?: boolean; speaks?: boolean }): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  if (options.recogniser) stubRecognizer();
  FakeRecognizer.instances = [];
  if (options.speaks) stubSpeech([ENGLISH_VOICE]);
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  window.location.hash = '';
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.talks.clear(), db.tips.clear()]);
  if (options.immersive === 'on') await db.settings.put({ key: 'immersiveReader', value: 'on' });
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  // his nine learning words are due after the first open: the chips row is drawn
  await screen.findByTestId('reader-chips');
  await waitFor(() => expect(reader()).toHaveAttribute('data-immersive', options.immersive));
  // the box is given its size and sits at the top (the app takes this first scroll as a resize, as it would a real one)
  at = 0;
  scrollTo(0);
}

const reader = () => document.querySelector<HTMLElement>('[data-reader]') as HTMLElement;
const talkButton = () => screen.getByRole('button', { name: 'Talk', exact: true });

/** jsdom has no layout: the box is 700 px of a 5000 px text, and `top` is where it is scrolled to. */
function scrollTo(top: number): void {
  const box = reader();
  Object.defineProperty(box, 'clientHeight', { configurable: true, value: CLIENT_HEIGHT });
  Object.defineProperty(box, 'scrollHeight', { configurable: true, value: SCROLL_HEIGHT });
  Object.defineProperty(box, 'scrollTop', { configurable: true, writable: true, value: top });
  fireEvent.scroll(box);
}
let at = 0;
const scrollBy = (px: number) => scrollTo((at += px));

/** A touch event with the fingers on it: jsdom has no Touch, so the list is put on the event by hand. */
function touch(type: 'touchstart' | 'touchmove' | 'touchend', fingers: Array<{ x: number; y: number }>, target: Element = reader()): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: fingers.map((f, i) => ({ identifier: i, clientX: f.x, clientY: f.y })) });
  Object.defineProperty(event, 'changedTouches', { value: [] });
  act(() => void target.dispatchEvent(event));
}
const TWO = [
  { x: 120, y: 400 },
  { x: 220, y: 420 },
];
const twoFingerTap = () => {
  touch('touchstart', TWO);
  touch('touchend', []);
};
const firstWord = () => document.querySelector<HTMLElement>('[data-verse="1"] [role="button"][data-chunk], [data-verse="1"] [role="button"][data-word]') as HTMLElement;

const chips = () => screen.getByTestId('reader-chips');
const barsAway = () => {
  expect(chips().closest('[data-away]')).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Talk', exact: true })).toBeNull();
  expect(screen.queryByRole('button', { name: ASK_TUTOR_LABEL })).toBeNull();
};
const barsShown = () => {
  expect(document.querySelectorAll('[data-away]')).toHaveLength(0);
  expect(chips()).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Talk', exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: ASK_TUTOR_LABEL })).toBeInTheDocument();
};
const inView = async () => waitFor(barsShown);
const outOfView = async () => waitFor(barsAway);

const feature = await loadFeature('features/immersive-reader.feature');

describeFeature(feature, ({ Scenario }) => {
  const bars = 'the header, the chips, the Talk bar and the Ask button are all';

  Scenario('Immersive reader is Off by default and Off leaves the Reader alone when the text scrolls', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader Off', () => open({ immersive: 'off' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then(`${bars} in view`, async () => {
      await sleep(50);
      barsShown();
    });
  });

  Scenario('Scrolling down slides the bars away and scrolling up 24 px brings them back', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then(`${bars} out of view`, outOfView);
    When('he scrolls the text up {int} px', (_, px: number) => scrollBy(-px));
    Then(`${bars} still out of view`, outOfView);
    When('he scrolls the text up another {int} px', (_, px: number) => scrollBy(-px));
    Then(`${bars} in view`, inView);
  });

  Scenario('A two-finger tap brings the bars back and opens no word sheet', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he taps the text with two fingers, and the phone also sends a click on a word', async () => {
      await outOfView();
      twoFingerTap();
      await user.click(firstWord());
    });
    Then(`${bars} in view`, inView);
    And('no word sheet is open', () => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  Scenario('Two fingers that move are a gesture of their own, not a tap', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he puts two fingers on the text and drags them {int} px', async (_, px: number) => {
      await outOfView();
      touch('touchstart', TWO);
      touch('touchmove', TWO.map((f) => ({ x: f.x, y: f.y - px })));
      touch('touchend', []);
    });
    Then(`${bars} out of view`, outOfView);
  });

  Scenario('A one-finger tap on a word opens its sheet while the bars are away, and closing the sheet brings them back', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he taps the first word of verse {int}', async () => {
      await outOfView();
      await user.click(firstWord());
    });
    Then('the word sheet is open', async () => {
      await screen.findByRole('dialog');
    });
    When('he closes the word sheet', async () => {
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
    });
    Then(`${bars} in view`, inView);
  });

  Scenario('With the bars away, a two-finger tap and then holding Talk starts listening', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a recogniser', () => open({ immersive: 'on', recogniser: true }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he taps the text with two fingers', async () => {
      await outOfView();
      twoFingerTap();
      await inView();
    });
    And('he holds the Talk button', async () => {
      await user.pointer({ keys: '[MouseLeft>]', target: talkButton(), coords: AT });
      await sleep(HOLD_MS);
    });
    Then('the Talk sheet is open and the phone is listening', async () => {
      await screen.findByRole('dialog', { name: /^Talk about / });
      await waitFor(() => expect(FakeRecognizer.instances.length > 0 && FakeRecognizer.last().startFn.mock.calls.length > 0).toBe(true));
      await user.pointer({ keys: '[/MouseLeft]', target: talkButton(), coords: AT });
    });
  });

  Scenario('The bars come back at the end of the chapter', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he scrolls the text to its end', async () => {
      await outOfView();
      scrollTo((at = SCROLL_HEIGHT - CLIENT_HEIGHT));
    });
    Then(`${bars} in view`, inView);
  });

  Scenario('The bars come back when reading aloud stops', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone that speaks English', () => open({ immersive: 'on', speaks: true }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('verse {int} is being read aloud', async (_, n: number) => {
      await outOfView();
      await user.click(within(document.querySelector<HTMLElement>(`[data-verse="${n}"]`) as HTMLElement).getByRole('button', { name: 'Hear the verse' }));
      expect(getReading().status).toBe('reading');
    });
    And('the reading is stopped', () => act(() => stopReading()));
    Then(`${bars} in view`, inView);
  });

  Scenario('Settings switches it On and the choice survives a reload', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader Off', () => open({ immersive: 'off' }));
    When('he opens Settings and sets Immersive reader to On', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      const group = await screen.findByRole('group', { name: 'Immersive reader' });
      expect(within(group).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
      await user.click(within(group).getByRole('button', { name: 'On' }));
      await waitFor(async () => expect((await db.settings.get('immersiveReader'))?.value).toBe('on'));
    });
    And('the app is closed and opened again on Settings', async () => {
      cleanup();
      clearBus();
      expect(window.location.hash).toBe('#/settings');
      render(<App />);
    });
    Then('Immersive reader shows On in Settings', async () => {
      const group = await screen.findByRole('group', { name: 'Immersive reader' });
      await waitFor(() => expect(within(group).getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true'));
    });
  });
});
