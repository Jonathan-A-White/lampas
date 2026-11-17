// features/steps/hands-free.steps.tsx — runs features/hands-free.feature: the Hands-free switch (src/handsFree/), its Settings row, the three-finger tap and the
// mic mark, over the honest speech fake and a fake wake lock. This story opens no microphone: a spy stands for getUserMedia and must never be called.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { threeFingerTap } from 'voice-kit/testing/handsfree';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { resetImmersive } from '../../src/immersive';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../../tests/support/fake-wake';
import { ManualClock } from '../../tests/support/manual-clock';
import { seedHisWords } from '../../tests/support/his-words';
import { leaveSettings, openSettingsGroup } from '../../tests/support/settings-pages';
import { openSettings } from '../../tests/unit/openSettings';
import { closeDatabase } from './close-database';

const feature = await loadFeature('features/hands-free.feature');
const user = userEvent.setup();

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

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let synth: FakeSynth | undefined;
  const getUserMedia = vi.fn();
  let map: HTMLElement | undefined;
  let hears: WakeFake | undefined;
  let clock = new ManualClock();

  BeforeEachScenario(async () => {
    cleanup();
    resetHandsFree();
    hears?.uninstall();
    hears = undefined;
    resetImmersive();
    stopReading();
    clearBus();
    forgetTrail();
    vi.unstubAllGlobals();
    synth = undefined;
    map = undefined;
    getUserMedia.mockClear();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    window.localStorage.clear();
    window.localStorage.setItem('lampas.welcome', 'done');
    window.history.replaceState(null, '', '/');
    window.location.hash = '';
    stubChapterFetch();
    await db.open();
    await Promise.all([db.settings.clear(), db.words.clear(), db.meta.clear(), db.reviews.clear()]);
    // his words, so the Reader draws words he can tap
    await seedHisWords();
  });
  AfterEachScenario(() => {
    // this story opens no microphone, in any scenario
    expect(getUserMedia).not.toHaveBeenCalled();
    map?.remove();
    cleanup();
    stopReading();
    resetHandsFree();
    hears?.uninstall();
    hears = undefined;
    vi.unstubAllGlobals();
  });
  afterAll(async () => {
    cleanup();
    resetImmersive();
    delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
    await closeDatabase();
  });

  const engine = (): FakeSynth => {
    if (!synth) throw new Error('the phone has no speech engine');
    return synth;
  };
  const phone = () => {
    synth = stubSpeech([ENGLISH_VOICE]);
    fakeWakeLock();
  };
  /** A phone whose wake word is heard (the kit's fake) and whose commands are heard by a recogniser the test drives, on a clock the test moves. */
  const listeningPhone = (): void => {
    phone();
    clock = new ManualClock();
    handsFreeSeam.clock = clock;
    hears = stubWake();
    stubRecognizer();
    serveWakeModel();
  };
  const sayWake = async (): Promise<void> => {
    await waitFor(() => expect(hears?.listening).toBe(true));
    const before = FakeRecognizer.instances.length;
    act(() => {
      expect(hears?.say()).toBe(true);
    });
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
    await waitFor(() => expect(FakeRecognizer.last().startFn).toHaveBeenCalled());
    act(() => FakeRecognizer.last().open());
  };
  const taken = (): boolean => FakeRecognizer.last().stopFn.mock.calls.length + FakeRecognizer.last().abortFn.mock.calls.length > 0;
  async function openApp(): Promise<void> {
    cleanup();
    clearBus();
    forgetTrail();
    window.history.replaceState(null, '', '/');
    render(<App />);
    await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    // the Reader has drawn and its effects (the tap's listener on the document) have run
    await act(async () => {});
  }
  const reader = (): HTMLElement => document.querySelector<HTMLElement>('[data-reader]') as HTMLElement;
  const markOf = (name: string) => screen.queryByRole('img', { name });
  const said = async (text: string): Promise<void> => {
    await waitFor(() => expect(engine().spoken.map((s) => `${s.lang}:${s.text}`)).toContain(`en-US:${text}`));
  };
  const noMark = async (): Promise<void> => {
    await waitFor(() => expect(screen.queryByRole('img', { name: 'Hands-free is on' })).toBeNull());
  };
  const chosenIn = async (name: string, row = 'Hands-free'): Promise<void> => {
    await waitFor(async () => {
      const group = await screen.findByRole('group', { name: row });
      expect(within(group).getAllByRole('button', { pressed: true }).map((c) => c.textContent)).toEqual([name]);
    });
  };

  Scenario('Hands-free is Off on a fresh install and no mark shows', ({ Given, And, Then }) => {
    Given('a phone that speaks English and keeps the screen awake', phone);
    And('Lampas is opened on Romans 8 for the first time', openApp);
    Then('the Hands-free mark is not on the screen', noMark);
    And('nothing has been said aloud', () => expect(engine().spoken).toEqual([]));
  });

  Scenario('A three-finger tap on the Reader turns Hands-free on, a second turns it off, and each says so', ({ Given, And, When, Then }) => {
    Given('a phone that speaks English and keeps the screen awake', phone);
    And('Lampas is opened on Romans 8 for the first time', openApp);
    When('he taps the Reader with three fingers', () => act(() => threeFingerTap(reader())));
    Then('the phone says {string} in English', (_, text: string) => said(text));
    And('the Hands-free mark named {string} is on the screen', async (_, name: string) => {
      await waitFor(() => expect(markOf(name)).toBeInTheDocument());
    });
    And('the screen is being kept awake for Hands-free', async () => {
      await waitFor(() => expect(wake.requests).toBeGreaterThan(0));
    });
    When('he taps the Reader with three fingers again', async () => {
      act(() => threeFingerTap(reader()));
    });
    Then('the phone then says {string} in English', (_, text: string) => said(text));
    And('the Hands-free mark is not on the screen', noMark);
    And('the screen is no longer kept awake for Hands-free', async () => {
      await waitFor(() => expect(wake.released).toBeGreaterThan(0));
    });
  });

  Scenario('Turned On in Settings it says so and the mark shows on the Reader, the Settings home and a word sheet', ({ Given, And, When, Then }) => {
    Given('a phone that speaks English and keeps the screen awake', phone);
    And('Lampas is opened on Romans 8 for the first time', openApp);
    When('he opens Settings > Listening', async () => {
      await openSettings(user);
      await openSettingsGroup(user, 'listening');
    });
    Then('Hands-free shows {string} as the one chosen', (_, name: string) => chosenIn(name));
    And('Hands-free is the first row of Reading voices', () => {
      const first = document.querySelector('[data-section="voices"] [data-setting]');
      expect(first?.getAttribute('data-setting')).toBe('handsFree');
    });
    When('he chooses {string} for Hands-free', async (_, name: string) => {
      const group = await screen.findByRole('group', { name: 'Hands-free' });
      await user.click(within(group).getByRole('button', { name }));
    });
    Then('the phone says {string} in English', (_, text: string) => said(text));
    And('the Hands-free mark named {string} is on the screen', async (_, name: string) => {
      await waitFor(() => expect(markOf(name)).toBeInTheDocument());
    });
    const toReader = async () => {
      await leaveSettings(user);
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    };
    const isOn = async () => {
      await waitFor(() => expect(markOf('Hands-free is on')).toBeInTheDocument());
    };
    When('he leaves Settings for the Reader', toReader);
    Then('the Hands-free mark is on the Reader', isOn);
    When('he opens Settings', async () => {
      await openSettings(user);
    });
    Then('the Hands-free mark is on the Settings home', isOn);
    When('he leaves Settings for the Reader again', toReader);
    And('he taps the first word of verse {int}', async (_, n: number) => {
      const word = document.querySelector<HTMLElement>(`[data-verse="${n}"] [role="button"][data-chunk], [data-verse="${n}"] [role="button"][data-word]`) as HTMLElement;
      await user.click(word);
    });
    Then('the word sheet is open', async () => {
      await screen.findByRole('dialog');
    });
    And("the Hands-free mark is on the word sheet's screen", isOn);
  });

  Scenario('Hands-free On survives a reload, in silence', ({ Given, And, Then }) => {
    // the wake is heard and its model served, or Hands-free would say, truthfully, that it could not start (mw-rl10piw.31)
    Given('a phone that speaks English and keeps the screen awake', listeningPhone);
    And('Lampas is opened on Romans 8 with Hands-free On', async () => {
      await db.settings.put({ key: 'handsFree', value: 'on' });
      await openApp();
    });
    Then('the Hands-free mark named {string} is on the screen', async (_, name: string) => {
      await waitFor(() => expect(markOf(name)).toBeInTheDocument());
    });
    And('nothing has been said aloud', () => expect(engine().spoken).toEqual([]));
    And('the screen is being kept awake for Hands-free', async () => {
      await waitFor(() => expect(wake.requests).toBeGreaterThan(0));
    });
  });

  Scenario('A three-finger tap over a map does nothing', ({ Given, And, When, Then }) => {
    Given('a phone that speaks English and keeps the screen awake', phone);
    And('Lampas is opened on Romans 8 for the first time', openApp);
    When('he taps a map with three fingers', () => {
      // a map (src/maps/MapView.tsx) and the ladder graph carry data-two-finger: the fingers on them are theirs
      map = document.createElement('div');
      map.setAttribute('data-two-finger', '');
      document.body.appendChild(map);
      act(() => threeFingerTap(map as HTMLElement));
    });
    Then('the Hands-free mark is not on the screen', noMark);
    And('nothing has been said aloud', async () => {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100)); // a real-time wait: nothing must happen in this window (a tap over a map is left alone)
      });
      expect(engine().spoken).toEqual([]);
    });
    And('Hands-free is still Off', async () => {
      expect((await db.settings.get('handsFree'))?.value ?? 'off').toBe('off');
    });
  });

  Scenario('Pause before it acts is 1.5 seconds on a fresh install, in the row under Hands-free', ({ Given, And, When, Then }) => {
    Given('a phone that speaks English and keeps the screen awake', phone);
    And('Lampas is opened on Romans 8 for the first time', openApp);
    When('he opens Settings > Listening', async () => {
      await openSettings(user);
      await openSettingsGroup(user, 'listening');
    });
    Then('Pause before it acts shows {string} as the one chosen', (_, name: string) => chosenIn(name, 'Pause before it acts'));
    And('Pause before it acts is the row under Hands-free', () => {
      const rows = [...document.querySelectorAll('[data-section="voices"] [data-setting]')].map((r) => r.getAttribute('data-setting'));
      expect(rows.slice(0, 2)).toEqual(['handsFree', 'handsFreePause']);
    });
  });

  const listeningOn = 'a phone that hears the wake word, speaks English and keeps the screen awake';
  const opened = 'Lampas is opened on Romans 8 with Hands-free On';
  const openOn = async (): Promise<void> => {
    await db.settings.put({ key: 'handsFree', value: 'on' });
    await openApp();
    await waitFor(() => expect(hears?.listening).toBe(true));
  };
  const says = (words: string): void => {
    act(() => FakeRecognizer.last().say([result(words, false)]));
  };
  const quiet = async (seconds: number): Promise<void> => {
    act(() => clock.advance(seconds * 1000));
    await act(async () => {});
  };
  const johnThree = (): boolean => document.querySelector('h1')?.textContent === 'John 3';

  Scenario('With 3 seconds chosen a pause to think is not the end of the command', ({ Given, And, When, Then }) => {
    Given(listeningOn, listeningPhone);
    And(opened, openOn);
    When('he chooses {string} for Pause before it acts and goes back to the Reader', async (_, name: string) => {
      await openSettings(user);
      await openSettingsGroup(user, 'listening');
      const group = await screen.findByRole('group', { name: 'Pause before it acts' });
      await user.click(within(group).getByRole('button', { name }));
      await leaveSettings(user);
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    });
    And('he says the wake word', sayWake);
    And('he says {string}', (_, words: string) => says(words));
    And('he is quiet for {number} seconds', (_, seconds: number) => quiet(seconds));
    Then('the command is not taken yet', () => expect(taken()).toBe(false));
    When('he goes on with {string}', (_, words: string) => says(words));
    And('he is then quiet for {number} seconds', (_, seconds: number) => quiet(seconds));
    Then('the phone says {string} in English', (_, text: string) => said(text));
    When('the phone has said it', () => act(() => engine().finish()));
    Then('the Reader is at John 3 and John 3 is read from verse 1', async () => {
      await screen.findByRole('heading', { name: 'John 3', level: 1 });
      await waitFor(() => expect(engine().speaking).toBe(true));
    });
  });

  Scenario("With 1.5 seconds chosen the same words are cut after 'read John'", ({ Given, And, When, Then }) => {
    Given(listeningOn, listeningPhone);
    And(opened, openOn);
    When('he says the wake word', sayWake);
    And('he says {string}', (_, words: string) => says(words));
    And('he is quiet for {number} seconds', (_, seconds: number) => quiet(seconds));
    Then('the command is taken before he says {string}', async (_, words: string) => {
      expect(words).toBe('3');
      await waitFor(() => expect(taken()).toBe(true));
      await waitFor(() => expect(engine().spoken.length).toBeGreaterThan(0));
    });
    And('John 3 is not opened', async () => {
      act(() => {
        // the late '3' is heard by nobody: the command is done
        says('read John 3');
        clock.advance(10_000);
        engine().advance(10_000);
      });
      await act(async () => {});
      expect(johnThree()).toBe(false);
      expect(engine().spoken.map((s) => s.text)).not.toContain('John 3');
    });
  });
});
