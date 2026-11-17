// features/steps/hands-free-audible.steps.tsx — runs features/hands-free-audible.feature: 'read John 3 in Audible' (src/handsFree/audible.ts, mw-rl10piw.11) through the whole app, on the kit's
// fake wake (tests/support/fake-wake.ts), the recogniser driven by hand (tests/support/fake-recognizer.ts) and the honest speech fake (tests/support/fake-speech.ts). The link is opened through
// an OpenEnv the test works by hand (audibleSeam.env), and the time of opening is a clock the test sets (Date.now), so what the link was stamped with can be told.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { audibleSeam, forgetAudible, TOUCH_WINDOW_MS } from '../../src/handsFree/audible';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { forgetTrail } from '../../src/nav/lastRoute';
import { forgetRead } from '../../src/nav/readerRequest';
import { AUDIO_BIBLES, audibleListen } from '../../src/resources/audioBible';
import type { OpenEnv } from '../../src/resources/openApp';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../../tests/support/fake-wake';
import { ManualClock } from '../../tests/support/manual-clock';
import { closeDatabase } from './close-database';

const feature = await loadFeature('features/hands-free-audible.feature');
const user = userEvent.setup();

/** The time the link is made at when it opens, and at the touch ten seconds on. */
const OPENED_AT = 1_800_000_000_000;
const WORD_OF_PROMISE = AUDIO_BIBLES[0]!;
const johnThree = (now: number): string => audibleListen(WORD_OF_PROMISE, 'jhn', 3, now).href;

/** The OpenEnv of the scenario: what it was told to open, and the page going away or the wait running out when the step says so. */
class HandEnv implements OpenEnv {
  waitMs = 1500;
  opened: string[] = [];
  private afters = new Set<() => void>();
  private aways = new Set<() => void>();
  after(fn: () => void): () => void {
    this.afters.add(fn);
    return () => void this.afters.delete(fn);
  }
  onAway(fn: () => void): () => void {
    this.aways.add(fn);
    return () => void this.aways.delete(fn);
  }
  open(url: string): void {
    this.opened.push(url);
  }
  wait(): void {
    [...this.afters].forEach((fn) => fn());
    this.afters.clear();
  }
  away(): void {
    [...this.aways].forEach((fn) => fn());
  }
}

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  let synth: FakeSynth | undefined;
  let wake: WakeFake | undefined;
  let clock = new ManualClock();
  let env = new HandEnv();
  let now: ReturnType<typeof vi.spyOn> | undefined;
  let place = '';

  const hide = (state: 'hidden' | 'visible'): void => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  AfterEachScenario(() => {
    cleanup();
    stopReading();
    resetHandsFree();
    forgetAudible();
    wake?.uninstall();
    now?.mockRestore();
    delete (document as unknown as { visibilityState?: unknown }).visibilityState;
    delete audibleSeam.env;
    delete audibleSeam.clock;
    vi.unstubAllGlobals();
  });
  afterAll(async () => {
    cleanup();
    stopReading();
    resetHandsFree();
    delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
    await closeDatabase();
  });

  const engine = (): FakeSynth => {
    if (!synth) throw new Error('the phone has no speech engine');
    return synth;
  };
  const theWake = (): WakeFake => {
    if (!wake) throw new Error('no wake is installed');
    return wake;
  };
  const mark = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-hands-free-mark] [data-state]');
  const title = (): string => screen.getByRole('heading', { level: 1 }).textContent ?? '';
  const spoken = (): string[] => engine().spoken.map((s) => `${s.lang}:${s.text}`);

  async function open(at: string, audio: 'On' | 'Off'): Promise<void> {
    place = at;
    const [name, chapter] = [at.slice(0, at.lastIndexOf(' ')), at.slice(at.lastIndexOf(' ') + 1)];
    const code = BOOKS.find((b) => b.name === name)?.code;
    cleanup();
    stopReading();
    clearBus();
    forgetTrail();
    forgetRead();
    forgetAudible();
    vi.unstubAllGlobals();
    resetHandsFree();
    clock = new ManualClock();
    handsFreeSeam.clock = clock;
    env = new HandEnv();
    audibleSeam.env = env;
    audibleSeam.clock = clock;
    wake = stubWake();
    stubRecognizer();
    synth = stubSpeech([ENGLISH_VOICE]);
    stubChapterFetch();
    serveWakeModel();
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => ({ addEventListener: () => {}, release: async () => {} }) },
    });
    window.localStorage.clear();
    window.localStorage.setItem('lampas.welcome', 'done');
    window.history.replaceState(null, '', '/');
    await db.open();
    await Promise.all([db.settings.clear(), db.words.clear(), db.meta.clear()]);
    await setReaderView('english');
    await setWeave('off');
    await db.settings.put({ key: 'handsFree', value: 'on' });
    if (audio === 'On') await db.settings.put({ key: 'audioBible', value: WORD_OF_PROMISE.id });
    window.location.hash = `#/?b=${code}&c=${chapter}`;
    render(<App />);
    await screen.findByRole('heading', { name: at, level: 1 });
    await waitFor(() => expect(document.querySelectorAll('[data-reader] [data-verse]').length).toBeGreaterThan(0));
    now = vi.spyOn(Date, 'now').mockReturnValue(OPENED_AT);
  }

  const waiting = async (): Promise<void> => {
    await waitFor(() => {
      expect(theWake().listening).toBe(true);
      expect(mark()?.getAttribute('data-state')).toBe('waiting');
    });
  };

  async function sayWake(): Promise<void> {
    await waiting();
    const before = FakeRecognizer.instances.length;
    act(() => {
      expect(theWake().say()).toBe(true);
    });
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
    await waitFor(() => expect(FakeRecognizer.last().startFn).toHaveBeenCalled());
    act(() => FakeRecognizer.last().open());
  }

  async function command(words: string): Promise<void> {
    act(() => FakeRecognizer.last().say([result(words, false)]));
    act(() => clock.advance(1500));
    await act(async () => {});
  }

  async function readingAt(verse: number): Promise<void> {
    await user.click(screen.getByRole('button', { name: 'Read from the top' }));
    await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse: 1 }));
    for (let n = 1; n < verse; n++) act(() => engine().finish());
    await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse }));
    await waitFor(() => expect(engine().speaking).toBe(true));
  }

  const saysInEnglish = (text: string): Promise<void> => waitFor(() => expect(spoken()).toContain(`en-US:${text}`));
  const hasSaid = (): void => {
    act(() => engine().finish());
  };
  /** What is waited for after the page was left: the wait runs out (the fake's `after`), and what it does is done. */
  const waitPasses = async (): Promise<void> => {
    act(() => env.wait());
    await act(async () => {});
  };
  const touch = async (): Promise<void> => {
    fireEvent.pointerUp(document.body);
    await act(async () => {});
  };
  const timesSaid = (text: string): number => spoken().filter((s) => s === `en-US:${text}`).length;

  const givenOn = 'Hands-free is On with Audio Bible On and {string} is open in English on a phone that speaks English';
  const givenOff = 'Hands-free is On with Audio Bible Off and {string} is open in English on a phone that speaks English';
  const john1 = 'John 1 is being read aloud at verse {int}';
  const says = 'he says {string} and is quiet for 1.5 seconds';
  const phoneSays = 'the phone says {string} in English';
  const TOUCH = 'Touch the screen once to open Audible';

  Scenario("'read John 3 in Audible' while John 1 is read: the Reader opens at John 3, the place is said, the reading stops and Audible is opened once", ({ Given, And, When, Then }) => {
    Given(givenOn, (_, at: string) => open(at, 'On'));
    And(john1, (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then(phoneSays, (_, text: string) => saysInEnglish(text));
    When('the phone has said it', hasSaid);
    Then('the Reader is at John 3 and Lampas is reading nothing', async () => {
      await screen.findByRole('heading', { name: 'John 3', level: 1 });
      // the close finds nothing to go on with: no reading starts, now or later
      act(() => clock.advance(10_000));
      await act(async () => {});
      await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
      expect(title()).toBe('John 3');
      expect(getReading().status).toBe('idle');
      expect(engine().speaking).toBe(false);
      // the last thing the phone was handed is the sentence: no verse of any chapter came after it
      expect(spoken()[spoken().length - 1]).toBe('en-US:John 3, in Audible');
    });
    And("the one link opened is Audible's for John 3, made at the moment it opened", async () => {
      await waitFor(() => expect(env.opened).toEqual([johnThree(OPENED_AT)]));
    });
    When('the page goes away and the wait passes', async () => {
      const before = engine().spoken.length;
      act(() => env.away());
      await waitPasses();
      expect(engine().spoken.length).toBe(before);
    });
    Then('nothing more is said', async () => {
      act(() => clock.advance(TOUCH_WINDOW_MS + 1000));
      await touch();
      expect(spoken().filter((s) => s.includes('Touch'))).toEqual([]);
      expect(env.opened).toEqual([johnThree(OPENED_AT)]);
    });
  });

  Scenario('The page is still in front: it asks for one touch, and a touch within 30 seconds opens the link made at that touch', ({ Given, When, And, Then }) => {
    Given(givenOn, (_, at: string) => open(at, 'On'));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    And('the phone says {string} in English and has said it', async (_, text: string) => {
      await saysInEnglish(text);
      hasSaid();
      await waitFor(() => expect(env.opened).toHaveLength(1));
    });
    And('the wait passes with the page still in front', waitPasses);
    Then(phoneSays, (_, text: string) => saysInEnglish(text));
    When('10 seconds later he touches the screen', async () => {
      act(() => clock.advance(10_000));
      now?.mockReturnValue(OPENED_AT + 10_000);
      await touch();
    });
    Then("the links opened are Audible's for John 3, made at the moment it opened and again at the touch", () => {
      expect(env.opened).toEqual([johnThree(OPENED_AT), johnThree(OPENED_AT + 10_000)]);
    });
    And('{string} was said once', (_, text: string) => {
      expect(timesSaid(text)).toBe(1);
    });
  });

  Scenario('With no touch for 30 seconds it lets go', ({ Given, When, And, Then }) => {
    Given(givenOn, (_, at: string) => open(at, 'On'));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    And('the phone says {string} in English and has said it', async (_, text: string) => {
      await saysInEnglish(text);
      hasSaid();
      await waitFor(() => expect(env.opened).toHaveLength(1));
    });
    And('the wait passes with the page still in front', waitPasses);
    And('30 seconds pass', async () => {
      await saysInEnglish(TOUCH);
      act(() => clock.advance(TOUCH_WINDOW_MS));
      await act(async () => {});
    });
    And('he touches the screen', touch);
    Then("the one link opened is Audible's for John 3, made at the moment it opened", () => {
      expect(env.opened).toEqual([johnThree(OPENED_AT)]);
    });
  });

  Scenario('Audio Bible Off: it says to turn it on, opens nothing and the reading goes on', ({ Given, And, When, Then }) => {
    Given(givenOff, (_, at: string) => open(at, 'Off'));
    And(john1, (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then(phoneSays, (_, text: string) => saysInEnglish(text));
    When('the phone has said it', hasSaid);
    Then('no link was opened and the Reader is still at John 1', async () => {
      act(() => env.wait());
      await act(async () => {});
      expect(env.opened).toEqual([]);
      expect(title()).toBe(place);
    });
    And('the reading of John 1 goes on at verse {int}', async (_, verse: number) => {
      await waitFor(() => {
        expect(getReading()).toMatchObject({ status: 'reading', verse });
        expect(engine().speaking).toBe(true);
      });
    });
  });

  Scenario('Back in front after the page was hidden: the wake listening runs again and the mark shows', ({ Given, When, Then }) => {
    Given(givenOn, (_, at: string) => open(at, 'On'));
    When('the page is hidden', async () => {
      await waiting();
      act(() => hide('hidden'));
      await act(async () => {});
    });
    Then('the wake is not listening', async () => {
      await waitFor(() => expect(theWake().listening).toBe(false));
    });
    When('the page is in front again', async () => {
      act(() => hide('visible'));
      await act(async () => {});
    });
    Then('the wake is listening and the mark shows that Hands-free is waiting', async () => {
      await waiting();
      expect(mark()).not.toBeNull();
    });
  });
});
