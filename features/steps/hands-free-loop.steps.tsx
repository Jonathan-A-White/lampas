// features/steps/hands-free-loop.steps.tsx — runs features/hands-free-loop.feature: the Hands-free session (src/handsFree/session.ts) on the kit's fake wake
// (tests/support/fake-wake.ts), the recogniser driven by hand (tests/support/fake-recognizer.ts) and the honest speech fake (tests/support/fake-speech.ts). The
// session's own waits (the 1.5 s pause, the 6 s with no words) run on a clock the test moves (handsFreeSeam.clock), so no step waits for them in real time.
// The hold is the bar every hold-to-talk of Lampas is (src/talk/Bars.tsx HeldTalkBar over useTalkHold), drawn beside the app.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { forgetTrail } from '../../src/nav/lastRoute';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { HeldTalkBar } from '../../src/talk/Bars';
import { useTalkHold } from '../../src/talk/useTalkHold';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../../tests/support/fake-wake';
import { ManualClock } from '../../tests/support/manual-clock';
import { closeDatabase } from './close-database';

const feature = await loadFeature('features/hands-free-loop.feature');
const user = userEvent.setup();

const john1 = JSON.parse(readFileSync('public/data/jhn/1.json', 'utf8')) as Chapter;
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const englishOf = (n: number): string => squash((john1.verses.find((v) => v.n === n)?.e ?? []).map((c) => c.t).join(' '));

/** What the Talk bar delivered: the words of each hold he let go of. */
let delivered: string[] = [];

/** The bar every hold-to-talk of Lampas is, as the Talk sheet's foot draws it. */
export function HoldProbe() {
  const hold = useTalkHold((words) => delivered.push(words));
  return (
    <div data-hold-probe>
      <HeldTalkBar hold={hold} />
    </div>
  );
}

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  let synth: FakeSynth | undefined;
  let wake: WakeFake | undefined;
  let clock = new ManualClock();
  let on = false;
  let heard = false;
  let held: HTMLElement | undefined;

  AfterEachScenario(() => {
    cleanup();
    stopReading();
    resetHandsFree();
    wake?.uninstall();
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

  async function open(handsFree: boolean): Promise<void> {
    cleanup();
    stopReading();
    clearBus();
    forgetTrail();
    vi.unstubAllGlobals();
    resetHandsFree();
    clock = new ManualClock();
    handsFreeSeam.clock = clock;
    on = handsFree;
    heard = false;
    delivered = [];
    held = undefined;
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
    if (handsFree) await db.settings.put({ key: 'handsFree', value: 'on' });
    window.location.hash = '#/?b=jhn&c=1';
    render(
      <>
        <App />
        <HoldProbe />
      </>,
    );
    await screen.findByRole('heading', { name: 'John 1', level: 1 });
    await waitFor(() => expect(document.querySelectorAll('[data-reader] [data-verse]').length).toBeGreaterThan(0));
  }

  const waiting = async (): Promise<void> => {
    await waitFor(() => {
      expect(theWake().listening).toBe(true);
      expect(mark()?.getAttribute('data-state')).toBe('waiting');
    });
  };

  /** He says 'Hey Lampas'; with Hands-free On the session opens the recogniser after the chime's moment, and the phone says it is open. */
  async function sayWake(): Promise<void> {
    if (on) await waiting();
    const before = FakeRecognizer.instances.length;
    act(() => {
      heard = theWake().say();
    });
    if (!heard) return;
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
    await waitFor(() => expect(FakeRecognizer.last().startFn).toHaveBeenCalled());
    act(() => FakeRecognizer.last().open());
  }

  async function command(words: string): Promise<void> {
    act(() => FakeRecognizer.last().say([result(words, false)]));
    act(() => clock.advance(1500));
    await act(async () => {});
  }

  const timePasses = async (seconds: number): Promise<void> => {
    act(() => {
      clock.advance(seconds * 1000);
      engine().advance(seconds * 1000);
    });
    await act(async () => {});
  };

  async function readingAt(verse: number): Promise<void> {
    await user.click(screen.getByRole('button', { name: 'Read from the top' }));
    await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse: 1 }));
    for (let n = 1; n < verse; n++) act(() => engine().finish());
    await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse }));
    await waitFor(() => expect(engine().speaking).toBe(true));
  }

  const pausedAt = async (verse: number): Promise<void> => {
    await waitFor(() => expect(getReading()).toMatchObject({ status: 'paused', verse }));
    expect(engine().speaking).toBe(false);
  };

  const goesOnAt = async (verse: number): Promise<void> => {
    await waitFor(() => {
      expect(getReading()).toMatchObject({ status: 'reading', verse });
      expect(engine().speaking).toBe(true);
      const last = engine().spoken[engine().spoken.length - 1];
      expect(englishOf(verse)).toContain(squash(last.text));
    });
  };

  const given = 'Hands-free is On and John 1 is open in English on a phone that speaks English';

  Scenario('The wake, \'play\' and a pause read the chapter on screen', ({ Given, And, When, Then }) => {
    Given(given, () => open(true));
    And('the wake word is being listened for', waiting);
    When('he says the wake word', sayWake);
    Then('the Hands-free mark shows {string}', async (_, state: string) => {
      await waitFor(() => expect(mark()?.getAttribute('data-state')).toBe(state));
    });
    When('he says {string} and is quiet for 1.5 seconds', (_, words: string) => command(words));
    Then('the phone reads verse 1 of John 1 in English', async () => {
      await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse: 1 }));
      await waitFor(() => {
        const last = engine().spoken[engine().spoken.length - 1];
        expect(last.lang).toBe('en-US');
        expect(englishOf(1)).toContain(squash(last.text));
      });
    });
  });

  Scenario('\'pause\' pauses the reading and it stays paused; \'play\' goes on from the same verse', ({ Given, And, When, Then }) => {
    Given(given, () => open(true));
    And('John 1 is being read aloud at verse {int}', (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    Then('the reading is paused at verse {int}', (_, n: number) => pausedAt(n));
    When('he says {string} and is quiet for 1.5 seconds', (_, words: string) => command(words));
    And('10 seconds pass', () => timePasses(10));
    Then('the reading is still paused at verse {int}', (_, n: number) => pausedAt(n));
    When('he says the wake word again', sayWake);
    And('he then says {string} and is quiet for 1.5 seconds', (_, words: string) => command(words));
    Then('the reading goes on at verse {int}', (_, n: number) => goesOnAt(n));
  });

  Scenario('Words it does not know: it says so and the reading goes on', ({ Given, And, When, Then }) => {
    Given(given, () => open(true));
    And('John 1 is being read aloud at verse {int}', (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And('he says {string} and is quiet for 1.5 seconds', (_, words: string) => command(words));
    Then('the phone says {string} in English', async (_, text: string) => {
      await waitFor(() => expect(engine().spoken.map((s) => `${s.lang}:${s.text}`)).toContain(`en-US:${text}`));
      // the reading waits while it is said
      expect(getReading().status).toBe('paused');
    });
    When('the phone has said it', () => {
      act(() => engine().finish());
    });
    Then('the reading goes on at verse {int}', (_, n: number) => goesOnAt(n));
  });

  Scenario('No words after the chime: it closes after 6 seconds and the reading goes on', ({ Given, And, When, Then }) => {
    Given(given, () => open(true));
    And('John 1 is being read aloud at verse {int}', (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And('6 seconds pass with no words', async () => {
      await pausedAt(2);
      act(() => clock.advance(6000));
      await act(async () => {});
    });
    Then('the reading goes on at verse {int}', (_, n: number) => goesOnAt(n));
  });

  Scenario('With Hands-free Off a wake word is heard by nothing', ({ Given, When, Then, And }) => {
    Given('Hands-free is Off and John 1 is open in English on a phone that speaks English', () => open(false));
    When('he says the wake word', sayWake);
    Then('nothing heard the wake word and no wake is listening', () => {
      expect(heard).toBe(false);
      expect(theWake().listening).toBe(false);
      expect(theWake().starts).toBe(0);
    });
    And('no recogniser was started', () => expect(FakeRecognizer.instances).toEqual([]));
    And('nothing is being read', () => expect(getReading().status).toBe('idle'));
  });

  Scenario('A Talk hold with Hands-free On hears his words as with it Off, and the wake listens again after', ({ Given, And, When, Then }) => {
    Given(given, () => open(true));
    And('the wake word is being listened for', waiting);
    When('he holds the Talk bar and says {string}', async (_, words: string) => {
      const before = FakeRecognizer.instances.length;
      held = document.querySelector<HTMLElement>('[data-hold-probe] button') ?? undefined;
      if (!held) throw new Error('no Talk bar');
      fireEvent.pointerDown(held, { pointerId: 1, clientX: 10, clientY: 10 });
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
      const recogniser = FakeRecognizer.last();
      act(() => recogniser.open());
      act(() => recogniser.say([result(words, false)]));
    });
    Then('the wake word is not being listened for', async () => {
      await waitFor(() => expect(theWake().listening).toBe(false));
      expect(theWake().liveTracks).toBe(0);
    });
    When('he lets go of the Talk bar', () => {
      if (!held) throw new Error('no hold');
      fireEvent.pointerUp(held, { pointerId: 1, clientX: 10, clientY: 10 });
    });
    Then('the Talk bar delivers {string}', async (_, words: string) => {
      await waitFor(() => expect(delivered).toEqual([words]));
    });
    And('the wake word is being listened for again', waiting);
  });
});
