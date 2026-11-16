// features/steps/hands-free-commands.steps.tsx — runs features/hands-free-commands.feature: the spoken commands 'read John 3', 'go to John 3 16', 'stop', 'next chapter' and
// 'previous chapter' (src/handsFree/commands.ts, mw-rl10piw.7) through the whole app, on the kit's fake wake (tests/support/fake-wake.ts), the recogniser driven by hand
// (tests/support/fake-recognizer.ts) and the honest speech fake (tests/support/fake-speech.ts). The session's own waits run on a clock the test moves (handsFreeSeam.clock).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { forgetTrail } from '../../src/nav/lastRoute';
import { forgetRead } from '../../src/nav/readerRequest';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../../tests/support/fake-wake';
import { ManualClock } from '../../tests/support/manual-clock';
import { closeDatabase } from './close-database';

const feature = await loadFeature('features/hands-free-commands.feature');
const user = userEvent.setup();

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const chapters = new Map<string, Chapter>();
/** The English of verse `n` of a chapter ('John 3'), as the phone is handed it. */
function englishOf(place: string, n: number): string {
  const [name, chapter] = [place.slice(0, place.lastIndexOf(' ')), place.slice(place.lastIndexOf(' ') + 1)];
  const code = BOOKS.find((b) => b.name === name)?.code;
  if (!code) throw new Error(`no book ${name}`);
  const file = `public/data/${code}/${chapter}.json`;
  if (!chapters.has(file)) chapters.set(file, JSON.parse(readFileSync(file, 'utf8')) as Chapter);
  return squash((chapters.get(file)?.verses.find((v) => v.n === n)?.e ?? []).map((c) => c.t).join(' '));
}

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  let synth: FakeSynth | undefined;
  let wake: WakeFake | undefined;
  let clock = new ManualClock();
  /** How many things the phone had been handed when John 1 was last read from, to tell what came after. */
  let spokenBefore = 0;

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
  const title = (): string => screen.getByRole('heading', { level: 1 }).textContent ?? '';

  async function open(place: string): Promise<void> {
    const [name, chapter] = [place.slice(0, place.lastIndexOf(' ')), place.slice(place.lastIndexOf(' ') + 1)];
    const code = BOOKS.find((b) => b.name === name)?.code;
    cleanup();
    stopReading();
    clearBus();
    forgetTrail();
    forgetRead();
    vi.unstubAllGlobals();
    resetHandsFree();
    clock = new ManualClock();
    handsFreeSeam.clock = clock;
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
    window.location.hash = `#/?b=${code}&c=${chapter}`;
    render(<App />);
    await screen.findByRole('heading', { name: place, level: 1 });
    await waitFor(() => expect(document.querySelectorAll('[data-reader] [data-verse]').length).toBeGreaterThan(0));
    spokenBefore = 0;
  }

  const waiting = async (): Promise<void> => {
    await waitFor(() => {
      expect(theWake().listening).toBe(true);
      expect(mark()?.getAttribute('data-state')).toBe('waiting');
    });
  };

  /** He says 'Hey Lampas'; the session opens the recogniser after the chime's moment. */
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

  /** The Reader is at `place`, and the phone is reading `verse` of it: what it was last handed is that verse's English. */
  async function readsFrom(place: string, verse: number): Promise<void> {
    await screen.findByRole('heading', { name: place, level: 1 });
    await waitFor(() => {
      expect(getReading()).toMatchObject({ status: 'reading', verse });
      expect(engine().speaking).toBe(true);
      const last = engine().spoken[engine().spoken.length - 1];
      expect(last.lang).toBe('en-US');
      expect(englishOf(place, verse)).toContain(squash(last.text));
    });
  }

  /** What was said, and the moment after it: what is read after that is not John 1's. */
  const saysInEnglish = async (text: string): Promise<void> => {
    await waitFor(() => expect(engine().spoken.map((s) => `${s.lang}:${s.text}`)).toContain(`en-US:${text}`));
    spokenBefore = engine().spoken.length;
  };
  const hasSaid = (): void => {
    act(() => engine().finish());
  };
  const atScreen = (place: string): void => {
    expect(title()).toBe(place);
  };

  const given = 'Hands-free is On and {string} is open in English on a phone that speaks English';
  const john1 = 'John 1 is being read aloud at verse {int}';
  const says = 'he says {string} and is quiet for 1.5 seconds';
  const phoneSays = 'the phone says {string} in English';

  /** Nothing of John 1 is heard after what was said: neither its verses nor a second reading beside the one now. */
  const noJohn1 = async (): Promise<void> => {
    act(() => {
      clock.advance(10_000);
    });
    await act(async () => {});
    const earlier = [1, 2, 3, 4, 5].map((n) => englishOf('John 1', n)).join(' ');
    for (const text of engine().spoken.slice(spokenBefore).map((s) => squash(s.text))) expect(earlier).not.toContain(text);
    expect(engine().honest.log.filter((entry) => entry.outcome === 'speaking').length).toBeLessThanOrEqual(1);
  };

  Scenario("'read John 3' while John 1 is read: the place is said, then John 3 is read from verse 1, and 'next chapter' and 'previous chapter' turn from it", ({ Given, And, When, Then }) => {
    Given(given, (_, place: string) => open(place));
    And(john1, (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then(phoneSays, (_, text: string) => saysInEnglish(text));
    When('the phone has said it', hasSaid);
    Then('the Reader is at John 3 and John 3 is read from verse 1', () => readsFrom('John 3', 1));
    And('nothing of John 1 is read again', noJohn1);
    When('he says the wake word again', sayWake);
    And('he then says {string} and is quiet for 1.5 seconds', (_, words: string) => command(words));
    Then('the Reader goes on to John 4 and reads it from verse 1', () => readsFrom('John 4', 1));
    And('still nothing of John 1 is read again', noJohn1);
    When('he says the wake word once more', sayWake);
    And('he next says {string} and is quiet for 1.5 seconds', (_, words: string) => command(words));
    Then('the Reader turns back to John 3 and reads it from verse 1', () => readsFrom('John 3', 1));
    And('again nothing of John 1 is read again', noJohn1);
  });

  Scenario("'go to John 3 16' says the verse too and reads from it", ({ Given, When, And, Then }) => {
    Given(given, (_, place: string) => open(place));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then(phoneSays, (_, text: string) => saysInEnglish(text));
    When('the phone has said it', hasSaid);
    Then('the Reader is at John 3 and John 3 is read from verse 16', () => readsFrom('John 3', 16));
  });

  Scenario("'stop' ends the reading and nothing starts again", ({ Given, And, When, Then }) => {
    Given(given, (_, place: string) => open(place));
    And(john1, (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    And('10 seconds pass', async () => {
      const heard = engine().spoken.length;
      spokenBefore = heard;
      act(() => {
        clock.advance(10_000);
        engine().advance(10_000);
      });
      await act(async () => {});
      await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    });
    Then('nothing is being read and nothing is spoken', () => {
      expect(getReading().status).toBe('idle');
      expect(engine().speaking).toBe(false);
      expect(engine().spoken.length).toBe(spokenBefore);
    });
  });

  Scenario('Words that are no place: it says so and the reading goes on', ({ Given, And, When, Then }) => {
    Given(given, (_, place: string) => open(place));
    And(john1, (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then(phoneSays, async (_, text: string) => {
      await saysInEnglish(text);
      // the reading waits while it is said
      expect(getReading().status).toBe('paused');
    });
    When('the phone has said it', hasSaid);
    Then('the reading of John 1 goes on at verse {int}', async (_, verse: number) => {
      await waitFor(() => {
        expect(getReading()).toMatchObject({ status: 'reading', verse });
        expect(engine().speaking).toBe(true);
      });
      atScreen('John 1');
    });
  });

  Scenario("At the end of the Bible 'next chapter' says there is none", ({ Given, When, And, Then }) => {
    Given(given, (_, place: string) => open(place));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then(phoneSays, (_, text: string) => saysInEnglish(text));
    And('the Reader is still at Revelation 22', () => atScreen('Revelation 22'));
  });

  Scenario('Before Genesis 1 there is no chapter before it', ({ Given, When, And, Then }) => {
    Given(given, (_, place: string) => open(place));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then(phoneSays, (_, text: string) => saysInEnglish(text));
    And('the Reader is still at Genesis 1', () => atScreen('Genesis 1'));
  });
});
