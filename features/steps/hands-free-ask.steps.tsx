// features/steps/hands-free-ask.steps.tsx — runs features/hands-free-ask.feature: 'ask ...', 'tutor', the follow-up with no wake word, 'close the tutor' (src/handsFree/ask.ts, mw-rl10piw.8)
// through the whole app, on the kit's fake wake (tests/support/fake-wake.ts), the recogniser driven by hand (tests/support/fake-recognizer.ts), the honest speech fake
// (tests/support/fake-speech.ts), the chime port a spy (handsFreeSeam.chime) and the tutor the test's own fake Postern (tests/support/fake-postern.ts). The session's own waits run on a
// clock the test moves (handsFreeSeam.clock).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { forgetTrail } from '../../src/nav/lastRoute';
import { forgetRead } from '../../src/nav/readerRequest';
import { tutorTimings } from '../../src/services/tutor';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { serveWakeModel, stubWake, type WakeFake } from '../../tests/support/fake-wake';
import { ManualClock } from '../../tests/support/manual-clock';
import { seedHisWords } from '../../tests/support/his-words';
import { closeDatabase } from './close-database';
import { queryTalkSheet } from './open-tutor';

const feature = await loadFeature('features/hands-free-ask.feature');
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  let synth: FakeSynth | undefined;
  let wake: WakeFake | undefined;
  let clock = new ManualClock();
  let fake: FakePostern;
  let answerText = '';
  let chime = { open: vi.fn<() => void>(), close: vi.fn<() => void>() };

  AfterEachScenario(() => {
    cleanup();
    stopReading();
    resetHandsFree();
    wake?.uninstall();
    fake?.endAll({ status: 'answered', answer: { answer: answerText, words: [] } });
    vi.unstubAllGlobals();
  });
  afterAll(async () => {
    cleanup();
    stopReading();
    resetHandsFree();
    delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
    delete handsFreeSeam.chime;
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
  const asked = () => fake.received.filter((r) => r.grist.kind === 'bible-talk');
  const spokenTexts = (): string[] => engine().spoken.map((s) => squash(s.text));

  /** Opens the app on `place` ('John 3', or a passage 'John 17:6-19') with the tutor answering `answer`. */
  async function open(place: string, answer: string): Promise<void> {
    const [reference, range] = place.split(':');
    const [name, chapter] = [reference.slice(0, reference.lastIndexOf(' ')), reference.slice(reference.lastIndexOf(' ') + 1)];
    const code = BOOKS.find((b) => b.name === name)?.code;
    const [from, to] = range ? range.split('-') : [];
    answerText = answer;
    cleanup();
    stopReading();
    clearBus();
    forgetTrail();
    forgetRead();
    vi.unstubAllGlobals();
    resetHandsFree();
    clock = new ManualClock();
    handsFreeSeam.clock = clock;
    chime = { open: vi.fn<() => void>(), close: vi.fn<() => void>() };
    handsFreeSeam.chime = chime;
    wake = stubWake();
    stubRecognizer();
    synth = stubSpeech([ENGLISH_VOICE]);
    tutorTimings.pollMs = 20;
    fake = makeFakePostern();
    fake.autoReply = { status: 'answered', answer: { answer, words: [] } };
    stubChapterFetch();
    const chapterFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
    );
    serveWakeModel();
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => ({ addEventListener: () => {}, release: async () => {} }) },
    });
    window.localStorage.clear();
    window.localStorage.setItem('lampas.welcome', 'done');
    window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
    window.history.replaceState(null, '', '/');
    await db.open();
    await Promise.all([db.settings.clear(), db.words.clear(), db.meta.clear(), db.talks.clear()]);
    await setReaderView(from ? 'greek' : 'english');
    await setWeave('off');
    await db.settings.put({ key: 'handsFree', value: 'on' });
    await seedHisWords();
    window.location.hash = `#/?b=${code}&c=${chapter}${from ? `&p=${from}&pt=${to}` : ''}`;
    render(<App />);
    if (from) await screen.findByRole('region', { name: 'Verse view' });
    else await screen.findByRole('heading', { name: place, level: 1 });
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
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

  /** The words are said into the open recogniser and he is quiet for the pause. */
  async function command(words: string): Promise<void> {
    act(() => FakeRecognizer.last().say([result(words, false)]));
    act(() => clock.advance(1500));
    await act(async () => {});
  }

  /** Lets what the phone is saying be said to its end, until the session opens its microphone again; then the recogniser is open. */
  async function heardUntilListening(): Promise<void> {
    const before = FakeRecognizer.instances.length;
    await waitFor(
      () => {
        if (engine().speaking) act(() => engine().finish());
        expect(FakeRecognizer.instances.length).toBeGreaterThan(before);
      },
    );
    await waitFor(() => expect(FakeRecognizer.last().startFn).toHaveBeenCalled());
    act(() => FakeRecognizer.last().open());
  }

  const saysInEnglish = async (text: string): Promise<void> => {
    await waitFor(() => expect(engine().spoken.map((s) => `${s.lang}:${squash(s.text)}`)).toContain(`en-US:${text}`));
  };
  const hasSaid = (): void => {
    act(() => engine().finish());
  };
  const talkSheet = (): HTMLElement | null => queryTalkSheet();

  const given = 'Hands-free is On and {string} is open in English on a phone that speaks English and the tutor answers {string}';
  const passageGiven = 'Hands-free is On and {string} is open as a passage on a phone that speaks English and the tutor answers {string}';
  const says = 'he says {string} and is quiet for 1.5 seconds';
  const saysFollowUp = 'he says {string} with no wake word and is quiet for 1.5 seconds';

  /** The reading of John 3 is going, from verse `n` (the header's Read from the top, then on to the verse). */
  async function readingAt(verse: number): Promise<void> {
    await user.click(screen.getByRole('button', { name: 'Read from the top' }));
    await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse: 1 }));
    for (let n = 1; n < verse; n++) act(() => engine().finish());
    await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse }));
    await waitFor(() => expect(engine().speaking).toBe(true));
  }

  /** 'Asking the tutor' is said and the answer; the microphone then opens for the follow-up. */
  async function askedAndAnswered(): Promise<void> {
    await saysInEnglish('Asking the tutor');
    hasSaid();
    await waitFor(() => expect(spokenTexts().join(' ')).toContain(squash(answerText)));
    await heardUntilListening();
  }

  async function opensFirstGreekWord(): Promise<void> {
    const view = screen.getByRole('region', { name: 'Verse view' });
    const word = view.querySelector<HTMLElement>('[data-word]');
    if (!word) throw new Error('no Greek word in the passage');
    await user.click(word);
    await screen.findByRole('dialog', { name: 'Word' });
  }

  Scenario("'ask who was Nicodemus' on John 3 with the Talk sheet closed: 'Asking the tutor', then the answer spoken, and the Talk holds both", ({ Given, When, And, Then }) => {
    Given(given, (_, place: string, answer: string) => open(place, answer));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then('the phone says {string} in English', (_, text: string) => saysInEnglish(text));
    When('the phone has said it', hasSaid);
    Then('the tutor was sent {string}', async (_, question: string) => {
      await waitFor(() => expect(asked()).toHaveLength(1));
      expect(asked()[0].input.question).toBe(question);
    });
    And('the phone then says {string} in English', async (_, text: string) => {
      await saysInEnglish(text);
      const log = spokenTexts();
      expect(log.indexOf('Asking the tutor')).toBeGreaterThanOrEqual(0);
      expect(log.indexOf(text)).toBeGreaterThan(log.indexOf('Asking the tutor'));
    });
    And('the Talk sheet is closed', () => expect(talkSheet()).toBeNull());
    When("he opens the tutor's Talk sheet", async () => {
      await waitFor(() => expect(document.querySelector('[data-floating-tutor]')).not.toBeNull());
      act(() => document.querySelector<HTMLElement>('[data-floating-tutor]')?.click());
      await waitFor(() => expect(talkSheet()).not.toBeNull());
    });
    Then('the Talk shows the question {string} and the answer {string}', async (_, question: string, answer: string) => {
      const sheet = talkSheet();
      if (!sheet) throw new Error('no Talk sheet');
      await waitFor(() => expect(within(sheet).getByText(answer, { exact: false })).toBeTruthy());
      expect(sheet.querySelector('[data-talk-q]')).toHaveTextContent(question);
    });
  });

  Scenario('The follow-up needs no wake word, and with no words the lower chime closes it and John 3 goes on', ({ Given, And, When, Then }) => {
    Given(given, (_, place: string, answer: string) => open(place, answer));
    And('John 3 is being read aloud at verse {int}', (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    And('the phone has said "Asking the tutor" and the answer', askedAndAnswered);
    And('{int} seconds pass', async (_, seconds: number) => {
      act(() => clock.advance(seconds * 1000));
      await act(async () => {});
    });
    And(saysFollowUp, (_, words: string) => command(words));
    Then('the tutor was sent {string} as the next turn of the same talk', async (_, question: string) => {
      await waitFor(() => expect(asked()).toHaveLength(2));
      expect(asked()[1].input.question).toBe(question);
      expect(asked()[1].grist.talk).toBe(asked()[0].grist.talk);
      expect((asked()[1].input.history as { q: string }[]).map((t) => t.q)).toEqual(['who was Nicodemus']);
    });
    And('the phone says the answer again', async () => {
      await waitFor(() => expect(spokenTexts().filter((t) => t.includes(squash(answerText))).length).toBe(2));
      await heardUntilListening();
    });
    When('{int} seconds pass with no words', async (_, seconds: number) => {
      expect(chime.close).not.toHaveBeenCalled();
      act(() => clock.advance(seconds * 1000));
      await act(async () => {});
    });
    Then('the close chime was played once', () => expect(chime.close).toHaveBeenCalledTimes(1));
    And('the reading of John 3 goes on at verse {int}', async (_, verse: number) => {
      await waitFor(() => {
        expect(getReading()).toMatchObject({ status: 'reading', verse });
        expect(engine().speaking).toBe(true);
      });
      expect(title()).toBe('John 3');
    });
  });

  Scenario("In the follow-up 'pause' pauses and is not sent to the tutor", ({ Given, And, When, Then }) => {
    Given(given, (_, place: string, answer: string) => open(place, answer));
    And('John 3 is being read aloud at verse {int}', (_, n: number) => readingAt(n));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    And('the phone has said "Asking the tutor" and the answer', askedAndAnswered);
    And(saysFollowUp, (_, words: string) => command(words));
    Then('the tutor was sent only {string}', async (_, question: string) => {
      act(() => clock.advance(10_000));
      await act(async () => {});
      expect(asked().map((r) => r.input.question)).toEqual([question]);
    });
    And('the reading of John 3 stays paused', async () => {
      expect(getReading().status).toBe('paused');
      act(() => clock.advance(10_000));
      await act(async () => {});
      expect(getReading().status).toBe('paused');
    });
  });

  Scenario("In the follow-up 'read John 4' opens and reads John 4", ({ Given, And, When, Then }) => {
    Given(given, (_, place: string, answer: string) => open(place, answer));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    And('the phone has said "Asking the tutor" and the answer', askedAndAnswered);
    And(saysFollowUp, (_, words: string) => command(words));
    Then('the tutor was sent only {string}', (_, question: string) => expect(asked().map((r) => r.input.question)).toEqual([question]));
    And('the phone says {string} in English', (_, text: string) => saysInEnglish(text));
    When('the phone has said it', hasSaid);
    Then('the Reader is at John 4 and John 4 is read from verse 1', async () => {
      await screen.findByRole('heading', { name: 'John 4', level: 1 });
      await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse: 1 }));
    });
  });

  Scenario('With the passage open the question carries the range and the open word', ({ Given, And, When, Then }) => {
    Given(passageGiven, (_, place: string, answer: string) => open(place, answer));
    And('he has opened the first Greek word of the passage', opensFirstGreekWord);
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    And('the phone has said "Asking the tutor" and the answer', askedAndAnswered);
    Then('the tutor was sent {string} about {string} and that word', async (_, question: string, reference: string) => {
      await waitFor(() => expect(asked()).toHaveLength(1));
      expect(asked()[0].input.question).toBe(question);
      expect(asked()[0].input.reference).toBe(reference);
      expect(asked()[0].input.focus).toMatchObject({ kind: 'word' });
      expect(String((asked()[0].input.focus as { form: string }).form)).toMatch(/\p{Script=Greek}/u);
    });
  });

  const thinkingSign = (): boolean => document.querySelector('[data-hands-free-mark]')?.hasAttribute('data-thinking') === true;

  Scenario('While the tutor works on the answer the mic mark shows a quiet thinking sign, and it stops when the answer starts being read (mw-rl10piw.77)', ({ Given, And, When, Then }) => {
    Given(given, (_, place: string, answer: string) => open(place, answer));
    And('the tutor holds its answer', () => {
      fake.autoReply = undefined;
    });
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then('the mic mark shows the thinking sign', () => waitFor(() => expect(thinkingSign()).toBe(true)));
    And('the mic mark is not the listening look', () => expect(mark()?.getAttribute('data-state')).not.toBe('listening'));
    When('the phone has said "Asking the tutor"', async () => {
      await saysInEnglish('Asking the tutor');
      hasSaid();
    });
    Then('the mic mark still shows the thinking sign', async () => {
      await waitFor(() => expect(asked()).toHaveLength(1));
      expect(thinkingSign()).toBe(true);
    });
    When("the tutor's answer arrives", () => fake.answer({ status: 'answered', answer: { answer: answerText, words: [] } }));
    Then('the phone then says {string} in English', (_, text: string) => saysInEnglish(text));
    And('the mic mark shows no thinking sign', () => waitFor(() => expect(thinkingSign()).toBe(false)));
  });

  Scenario('The thinking sign stops when the question fails (mw-rl10piw.77)', ({ Given, And, When, Then }) => {
    Given(given, (_, place: string, answer: string) => open(place, answer));
    And('the tutor holds its answer', () => {
      fake.autoReply = undefined;
    });
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then('the mic mark shows the thinking sign', () => waitFor(() => expect(thinkingSign()).toBe(true)));
    When("the tutor's question fails", async () => {
      await saysInEnglish('Asking the tutor');
      hasSaid();
      await waitFor(() => expect(asked()).toHaveLength(1));
      await fake.answer({ status: 'failed', reason: 'no model' });
    });
    Then('the phone says that the tutor could not answer', () => waitFor(() => expect(spokenTexts().some((t) => t.startsWith('The tutor could not answer'))).toBe(true)));
    And('the mic mark shows no thinking sign', () => waitFor(() => expect(thinkingSign()).toBe(false)));
  });

  Scenario("'tutor' opens the tutor on the passage and listens, and the talk goes on turn after turn", ({ Given, When, And, Then }) => {
    Given(passageGiven, (_, place: string, answer: string) => open(place, answer));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then('the Talk sheet is open on {string}', async (_, reference: string) => {
      await waitFor(() => expect(talkSheet()).not.toBeNull());
      expect(talkSheet()?.getAttribute('aria-label') ?? talkSheet()?.textContent).toContain(reference);
      await heardUntilListening();
    });
    When(saysFollowUp, (_, words: string) => command(words));
    And('the phone has said the answer', heardUntilListening);
    And('he then says {string} with no wake word and is quiet for 1.5 seconds', (_, words: string) => command(words));
    And('the phone has said the answer again', heardUntilListening);
    And('he next says {string} with no wake word and is quiet for 1.5 seconds', (_, words: string) => command(words));
    And('the phone has said the answer once more', heardUntilListening);
    Then('the tutor was sent these three turns in order: {string}, {string}, {string}', async (_, a: string, b: string, c: string) => {
      await waitFor(() => expect(asked()).toHaveLength(3));
      expect(asked().map((r) => r.input.question)).toEqual([a, b, c]);
    });
    And('the microphone is open again', () => expect(mark()?.getAttribute('data-state')).toBe('follow-up'));
  });

  Scenario("'close the tutor' leaves it and Hands-free waits for the wake word again", ({ Given, When, And, Then }) => {
    Given(passageGiven, (_, place: string, answer: string) => open(place, answer));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then('the Talk sheet is open on {string}', async (_, reference: string) => {
      await waitFor(() => expect(talkSheet()).not.toBeNull());
      expect(talkSheet()?.getAttribute('aria-label') ?? talkSheet()?.textContent).toContain(reference);
      await heardUntilListening();
    });
    When(saysFollowUp, (_, words: string) => command(words));
    Then('the Talk sheet is closed', async () => {
      await waitFor(() => expect(talkSheet()).toBeNull());
    });
    And('Hands-free is waiting for the wake word', async () => {
      // 'Tutor closed' is said to its end, and the wake listens again
      await waitFor(() => {
        if (engine().speaking) act(() => engine().finish());
        expect(mark()?.getAttribute('data-state')).toBe('waiting');
      });
      await waiting();
      expect(asked()).toHaveLength(0);
    });
  });

  Scenario('Another command said in the tutor leaves it and does that', ({ Given, When, And, Then }) => {
    Given(passageGiven, (_, place: string, answer: string) => open(place, answer));
    When('he says the wake word', sayWake);
    And(says, (_, words: string) => command(words));
    Then('the Talk sheet is open on {string}', async (_, reference: string) => {
      await waitFor(() => expect(talkSheet()).not.toBeNull());
      expect(talkSheet()?.getAttribute('aria-label') ?? talkSheet()?.textContent).toContain(reference);
      await heardUntilListening();
    });
    When(saysFollowUp, (_, words: string) => command(words));
    Then('the phone says {string} in English', (_, text: string) => saysInEnglish(text));
    When('the phone has said it', hasSaid);
    Then('the Reader is at John 18 and John 18 is read from verse 1', async () => {
      await screen.findByRole('heading', { name: 'John 18', level: 1 });
      await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse: 1 }));
      expect(talkSheet()).toBeNull();
    });
    And('the tutor was sent nothing', () => expect(asked()).toHaveLength(0));
  });
});
