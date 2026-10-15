// features/steps/immersive-reader.steps.tsx — runs features/immersive-reader.feature: the Immersive reader setting (src/immersive.ts, src/Away.tsx).
// jsdom has no layout, so the box's scroll position and size are stood in for by hand and "out of view" is what the app says of itself:
// the bars sit in a [data-away] wrapper, inert and hidden from the accessibility tree. How it looks at 412 px is tests/e2e/immersive-reader.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { act, fireEvent, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { ASK_TUTOR_LABEL } from '../../src/AskTutor';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { resetImmersive } from '../../src/immersive';
import { forgetTrail } from '../../src/nav/lastRoute';
import { forgetScrolls } from '../../src/nav/scrollMemory';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  // the Reader's unmount set a leave-full-screen timer: it must not fire after jsdom is torn down
  resetImmersive();
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

/** The Fullscreen API, which jsdom lacks, stood in for by hand: it counts the calls and keeps document.fullscreenElement as a browser does. */
const fs = { requests: 0, exits: 0 };
function fakeFullscreen(mode: 'works' | 'refuses'): void {
  fs.requests = 0;
  fs.exits = 0;
  let element: Element | null = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => element });
  Object.defineProperty(Element.prototype, 'requestFullscreen', {
    configurable: true,
    value: () => {
      fs.requests += 1;
      if (mode === 'refuses') return Promise.reject(new TypeError('Permissions check failed'));
      element = document.documentElement;
      return Promise.resolve();
    },
  });
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: () => {
      fs.exits += 1;
      element = null;
      return Promise.resolve();
    },
  });
}

/** The Screen Wake Lock API, which jsdom lacks, stood in for by hand: it counts the locks asked for and let go. */
const wake = { requests: 0, released: 0 };
function fakeWakeLock(): void {
  wake.requests = 0;
  wake.released = 0;
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: async () => {
        wake.requests += 1;
        return {
          addEventListener: () => {},
          release: async () => {
            wake.released += 1;
          },
        };
      },
    },
  });
}

async function open(options: { immersive: 'on' | 'off'; recogniser?: boolean; speaks?: boolean; fullscreen?: 'works' | 'refuses'; wakeLock?: boolean; slowSetting?: boolean; address?: string }): Promise<void> {
  cleanup();
  resetImmersive();
  stopReading();
  clearBus();
  forgetTrail();
  // the places the last scenario scrolled to would be restored in this Reader, at a moment that depends on the host, and read as a scroll
  forgetScrolls();
  vi.unstubAllGlobals();
  if (options.recogniser) stubRecognizer();
  FakeRecognizer.instances = [];
  if (options.speaks) stubSpeech([ENGLISH_VOICE]);
  if (options.fullscreen) fakeFullscreen(options.fullscreen);
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
  if (options.wakeLock) fakeWakeLock();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  window.location.hash = options.address ?? '';
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.talks.clear(), db.tips.clear()]);
  if (options.immersive === 'on') await db.settings.put({ key: 'immersiveReader', value: 'on' });
  // the Reader's box can be drawn, and its place restored, well before the saved setting is read: a loaded host does that on its own, this does it on purpose
  const realGet = db.settings.get;
  if (options.slowSetting) {
    db.settings.get = ((key: string) =>
      realGet.call(db.settings, key).then((row) => new Dexie.Promise((resolve) => setTimeout(() => resolve(row), 300)))) as unknown as typeof db.settings.get;
  }
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  // his nine learning words are due after the first open: the chips row is drawn
  await screen.findByTestId('reader-chips');
  await waitFor(() => expect(reader()).toHaveAttribute('data-immersive', options.immersive));
  // the box is given its size and sits at the top (the app takes this first scroll as a resize, as it would a real one)
  db.settings.get = realGet;
  // the Reader has attached its listeners (and taken the box's place as its last): the next scroll is measured from there, whichever came first
  await act(async () => {});
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
const THREE = [...TWO, { x: 320, y: 410 }];
const twoFingerTap = () => {
  touch('touchstart', TWO);
  touch('touchend', []);
};
/** The fingers of a real tap land one after another, a few milliseconds apart: the browser sends a touchstart for each. */
const twoFingerTapOneByOne = () => {
  touch('touchstart', TWO.slice(0, 1));
  touch('touchstart', TWO);
  touch('touchend', []);
};
const threeFingerTap = () => {
  touch('touchstart', THREE.slice(0, 1));
  touch('touchstart', THREE.slice(0, 2));
  touch('touchstart', THREE);
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

const oneFingerTap = () => {
  touch('touchstart', [{ x: 120, y: 400 }]);
  touch('touchend', []);
};

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

  Scenario('Scrolling down slides the bars away and scrolling up leaves them away', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then(`${bars} out of view`, outOfView);
    When('he scrolls the text up {int} px', (_, px: number) => scrollBy(-px));
    Then(`${bars} still out of view`, async () => {
      await sleep(50);
      await outOfView();
    });
    When('he scrolls the text up another {int} px', (_, px: number) => scrollBy(-px));
    Then(`${bars} out of view at the top of the text`, async () => {
      expect(at).toBe(0);
      await sleep(50);
      await outOfView();
    });
  });

  Scenario('A two-finger tap shows the bars, and a second two-finger tap puts them away again', ({ Given, When, And, Then }) => {
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
    When('he taps the text with two fingers again', async () => {
      // past the guard that drops the click after a tap
      await sleep(650);
      twoFingerTap();
    });
    Then(`${bars} out of view`, outOfView);
  });

  Scenario('Two fingers that arrive one after another are judged as one tap', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he puts two fingers on the text one after another and lifts them together', async () => {
      await outOfView();
      twoFingerTapOneByOne();
    });
    Then(`${bars} in view`, inView);
  });

  Scenario('A three-finger tap does nothing', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he taps the text with three fingers', async () => {
      await outOfView();
      threeFingerTap();
    });
    Then(`${bars} out of view`, async () => {
      await sleep(50);
      await outOfView();
    });
    When('he taps the text with two fingers', twoFingerTap);
    Then(`${bars} in view`, inView);
    When('he taps the text with three fingers again', async () => {
      await sleep(650);
      threeFingerTap();
    });
    Then(`${bars} still in view`, async () => {
      await sleep(50);
      await inView();
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

  Scenario('A one-finger tap on a word opens its sheet while the bars are away, and closing the sheet leaves them away', ({ Given, When, And, Then }) => {
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
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
    Then(`${bars} out of view`, async () => {
      await sleep(50);
      await outOfView();
    });
  });

  Scenario('Closing a sheet with the bars shown leaves them shown', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he taps the text with two fingers', async () => {
      await outOfView();
      twoFingerTap();
      await inView();
    });
    And('he taps the first word of verse {int}', async () => {
      // past the guard that drops the click after a tap
      await sleep(650);
      await user.click(firstWord());
    });
    Then('the word sheet is open', async () => {
      await screen.findByRole('dialog');
    });
    When('he closes the word sheet', async () => {
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
    Then(`${bars} in view`, async () => {
      await sleep(50);
      await inView();
    });
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

  Scenario('Scrolling to the end of the chapter and past the bottom leaves the bars away', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('he scrolls the text to its end', async () => {
      await outOfView();
      scrollTo((at = SCROLL_HEIGHT - CLIENT_HEIGHT));
    });
    And('he scrolls the text further down {int} px past the bottom', (_, px: number) => scrollBy(px));
    Then(`${bars} out of view`, async () => {
      await sleep(50);
      await outOfView();
    });
  });

  Scenario('Reading aloud stopping leaves the bars away', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone that speaks English', () => open({ immersive: 'on', speaks: true }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    And('verse {int} is being read aloud', async (_, n: number) => {
      await outOfView();
      await user.click(within(document.querySelector<HTMLElement>(`[data-verse="${n}"]`) as HTMLElement).getByRole('button', { name: 'Hear the verse' }));
      expect(getReading().status).toBe('reading');
    });
    And('the reading is stopped', () => act(() => stopReading()));
    Then(`${bars} out of view`, async () => {
      await sleep(50);
      await outOfView();
    });
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
      await seedHisWords();
      render(<App />);
    });
    Then('Immersive reader shows On in Settings', async () => {
      const group = await screen.findByRole('group', { name: 'Immersive reader' });
      await waitFor(() => expect(within(group).getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true'));
    });
  });

  Scenario('The first tap in the text asks for full screen, and switching Immersive reader Off leaves it', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone that can go full screen', () => open({ immersive: 'on', fullscreen: 'works' }));
    Then('the page has not asked for full screen', async () => {
      await sleep(50);
      expect(fs).toEqual({ requests: 0, exits: 0 });
    });
    When('he taps the text with one finger', async () => {
      oneFingerTap();
      await sleep(50);
    });
    Then('the page has asked for full screen once', () => {
      expect(fs).toEqual({ requests: 1, exits: 0 });
    });
    When('he taps the text with one finger again', async () => {
      oneFingerTap();
      await sleep(50);
    });
    Then('the page has still asked for full screen once', () => {
      expect(fs).toEqual({ requests: 1, exits: 0 });
    });
    When('Immersive reader is switched Off', async () => {
      await db.settings.put({ key: 'immersiveReader', value: 'off' });
    });
    Then('the page has left full screen', async () => {
      await waitFor(() => expect(fs.exits).toBe(1));
      expect(document.fullscreenElement).toBeNull();
    });
  });

  Scenario('A Reader opened again where he left it has not asked for full screen', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone that can go full screen', () => open({ immersive: 'on', fullscreen: 'works' }));
    let left = '';
    When('he scrolls the text down {int} px', (_, px: number) => {
      scrollBy(px);
      left = window.location.hash;
    });
    And('Lampas is opened again on Romans 8 with Immersive reader On, the saved setting slow to be read, and a phone that can go full screen', () =>
      open({ immersive: 'on', fullscreen: 'works', slowSetting: true, address: left }),
    );
    Then('the page has not asked for full screen', async () => {
      await sleep(50);
      expect(fs).toEqual({ requests: 0, exits: 0 });
    });
  });

  Scenario("Two-finger taps bring back Lampas's own bars but keep the page full screen", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone that can go full screen', () => open({ immersive: 'on', fullscreen: 'works' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then('the page has asked for full screen once', async () => {
      await sleep(50);
      expect(fs).toEqual({ requests: 1, exits: 0 });
    });
    When('he taps the text with two fingers', twoFingerTap);
    Then(`${bars} in view`, inView);
    And('the page has still asked for full screen once', async () => {
      await sleep(400);
      expect(fs).toEqual({ requests: 1, exits: 0 });
      expect(document.fullscreenElement).not.toBeNull();
    });
    When('he taps the text with two fingers again', twoFingerTap);
    Then(`${bars} out of view`, outOfView);
    And('the page has kept the one full screen it asked for', async () => {
      await sleep(400);
      expect(fs).toEqual({ requests: 1, exits: 0 });
      expect(document.fullscreenElement).not.toBeNull();
    });
  });

  Scenario('Leaving the Reader leaves full screen', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone that can go full screen', () => open({ immersive: 'on', fullscreen: 'works' }));
    When('he taps the text with one finger', async () => {
      oneFingerTap();
      await sleep(50);
    });
    Then('the page has asked for full screen once', () => {
      expect(fs).toEqual({ requests: 1, exits: 0 });
    });
    When('he opens Settings from the Reader', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
    });
    Then('the page has left full screen', async () => {
      await waitFor(() => expect(fs.exits).toBe(1));
      expect(document.fullscreenElement).toBeNull();
    });
  });

  Scenario('With Immersive reader Off the page never asks for full screen', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader Off and a phone that can go full screen', () => open({ immersive: 'off', fullscreen: 'works' }));
    When('he taps the text with one finger', oneFingerTap);
    And('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then('the page has not asked for full screen', async () => {
      await sleep(50);
      expect(fs).toEqual({ requests: 0, exits: 0 });
    });
  });

  Scenario('A phone that refuses full screen reads on as before', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone that refuses full screen', () => open({ immersive: 'on', fullscreen: 'refuses' }));
    When('he taps the text with one finger', oneFingerTap);
    And('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then(`${bars} out of view`, outOfView);
    When('he taps the text with two fingers', twoFingerTap);
    Then(`${bars} in view`, inView);
  });

  Scenario('One quiet place line at the foot while the bars are away', ({ Given, When, Then }) => {
    const placeLine = () => document.querySelector('[data-place-line]');
    const reads = async (_: unknown, text: string) => {
      await waitFor(() => expect(placeLine()).toHaveTextContent(text));
    };
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open({ immersive: 'on' }));
    Then('there is no place line', async () => {
      await sleep(50);
      expect(placeLine()).toBeNull();
    });
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then('the place line reads {string}', reads);
    When('he scrolls the text on down {int} px', (_, px: number) => scrollBy(px));
    Then('the place line now reads {string}', reads);
    When('he taps the text with two fingers', twoFingerTap);
    Then('there is no place line while the bars are shown', async () => {
      await waitFor(() => expect(placeLine()).toBeNull());
    });
    When('he taps the text with two fingers again', async () => {
      await sleep(650);
      twoFingerTap();
    });
    Then('the place line is back and reads {string}', reads);
  });

  const held = () => wake.requests - wake.released;

  Scenario('The screen stays awake while the Reader is open with Immersive reader On, and sleeps again when he leaves', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone with a screen wake lock', () => open({ immersive: 'on', wakeLock: true }));
    Then('the page holds the screen awake', async () => {
      await waitFor(() => expect(held()).toBe(1));
    });
    When('he opens Settings from the Reader', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
    });
    Then('the page has let the screen sleep', async () => {
      await waitFor(() => expect(held()).toBe(0));
      expect(wake.requests).toBe(1);
    });
  });

  Scenario('Switching Immersive reader Off lets the screen sleep', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone with a screen wake lock', () => open({ immersive: 'on', wakeLock: true }));
    Then('the page holds the screen awake', async () => {
      await waitFor(() => expect(held()).toBe(1));
    });
    When('Immersive reader is switched Off', async () => {
      await db.settings.put({ key: 'immersiveReader', value: 'off' });
    });
    Then('the page has let the screen sleep', async () => {
      await waitFor(() => expect(held()).toBe(0));
    });
  });

  Scenario('With Immersive reader Off the Reader does not hold the screen awake', ({ Given, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader Off and a phone with a screen wake lock', () => open({ immersive: 'off', wakeLock: true }));
    Then('the page does not hold the screen awake', async () => {
      await sleep(100);
      expect(wake.requests).toBe(0);
    });
  });

  Scenario('Reading aloud keeps its own hold when the Immersive reader lets go', ({ Given, And, Then, When }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone with a screen wake lock', () => open({ immersive: 'on', wakeLock: true, speaks: true }));
    And('he starts the chapter reading aloud', async () => {
      await user.click(screen.getByRole('button', { name: 'Read from the top' }));
      await waitFor(() => expect(getReading().status).toBe('reading'));
    });
    And('Immersive reader is switched Off', async () => {
      await db.settings.put({ key: 'immersiveReader', value: 'off' });
      await waitFor(() => expect(reader()).toHaveAttribute('data-immersive', 'off'));
      await sleep(100);
    });
    Then('the screen is still held awake for the reading', () => {
      expect(held()).toBe(1);
    });
    When('the reading is stopped', async () => {
      act(() => stopReading());
    });
    Then('the page has let the screen sleep', async () => {
      await waitFor(() => expect(held()).toBe(0));
    });
  });

  Scenario('A phone without a screen wake lock reads on', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On and a phone without a screen wake lock', () => open({ immersive: 'on' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then(`${bars} out of view`, outOfView);
  });

  Scenario('With Immersive reader Off there is no place line', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader Off', () => open({ immersive: 'off' }));
    When('he scrolls the text down {int} px', (_, px: number) => scrollBy(px));
    Then('there is no place line', async () => {
      await sleep(50);
      expect(document.querySelector('[data-place-line]')).toBeNull();
    });
  });
});
