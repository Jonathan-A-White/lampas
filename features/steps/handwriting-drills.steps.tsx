// features/steps/handwriting-drills.steps.tsx — runs features/handwriting-drills.feature: Write it in a letter's lesson and in the letter drill (mw-86e9r1.51).
// Writing is fed to the pad as pointer events, the strokes the checker's own tests write (tests/support/handwriting.ts), with a pen or a finger.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { ideaChoice } from '../../src/data/grammar/lessons';
import { drawRound, letterDrillSeed, startLetterDrill, withWriting, type DrillStep } from '../../src/data/grammar/letterDrill';
import { mulberry32 } from '../../src/data/random';
import { getLevel, getPenSeen, getWriteProgress, handwritingOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { LOOKALIKES } from '../../src/handwriting/templates';
import { WRITERS, drawing, writing } from '../../tests/support/handwriting';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  letterDrillSeed.next = realSeed;
  db.close();
});

const realSeed = letterDrillSeed.next;
const SEED = 7;
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const CHOICES: Record<string, string> = { Automatic: 'auto', On: 'on', Off: 'off' };
let fake: FakePostern;
let synth: FakeSynth;
let spokenBefore = 0;
let pointer = 1;

async function open(goal: string, pen: boolean): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  letterDrillSeed.next = () => SEED;
  fake = makeFakePostern();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  synth = stubSpeech([GREEK_VOICE]);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.grammarKnown.clear(), db.grammarLevels.clear(), db.reviews.clear()]);
  await db.settings.put({ key: 'goal', value: goal });
  if (pen) await db.settings.put({ key: 'penSeen', value: 'yes' });
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const sheets = () => screen.getAllByRole('dialog', { name: 'Idea' });
const letterSheet = () => sheets()[1];
const writeDialog = () => screen.getByRole('dialog', { name: 'Write it' });
const card = () => screen.getByTestId('write-it');

async function opensIdeaFromGoal(id: string): Promise<void> {
  window.location.hash = '#/goal';
  await user.click(await screen.findByTestId('ideas-bar'));
  await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
  await screen.findByRole('dialog', { name: 'Idea' });
  await waitFor(() => expect(within(sheets()[0]).queryByTestId('idea-loading')).toBeNull());
}

async function opensLetterSheet(name: string): Promise<void> {
  await opensIdeaFromGoal('alphabet');
  const tile = within(sheets()[0]).getAllByTestId('teach-tile').find((t) => t.getAttribute('data-name') === name);
  if (!tile) throw new Error(`no tile ${name} on the alphabet sheet`);
  await user.click(within(tile).getByRole('button', { name: `About ${name}` }));
  await waitFor(() => expect(sheets()).toHaveLength(2));
  await waitFor(() => expect(within(letterSheet()).queryByTestId('idea-loading')).toBeNull());
}

/** The letter written on the pad as pointer events, stroke by stroke, with a pen or a finger. */
function writeOnPad(letter: string, type: 'pen' | 'touch', strokes = writing(letter, WRITERS[0])): void {
  const pad = within(card()).getByTestId('writing-pad');
  for (const stroke of strokes) {
    const pointerId = (pointer += 1);
    const at = (i: number) => ({ pointerId, pointerType: type, isPrimary: true, button: 0, buttons: 1, clientX: stroke[i].x, clientY: stroke[i].y });
    fireEvent.pointerDown(pad, at(0));
    for (let i = 1; i < stroke.length; i += 1) fireEvent.pointerMove(pad, at(i));
    fireEvent.pointerUp(pad, { ...at(stroke.length - 1), buttons: 0 });
  }
}

async function writesAndChecks(letter: string, type: 'pen' | 'touch', strokes?: ReturnType<typeof writing>): Promise<void> {
  await screen.findByTestId('write-it');
  spokenBefore = synth.spoken.length;
  writeOnPad(letter, type, strokes);
  await user.click(within(card()).getByRole('button', { name: 'Check' }));
  await within(card()).findByTestId('write-verdict');
}

/** Writes it right at the stage on screen, checks, and goes on to the next card when `goOn`. */
async function writesRight(letter: string, type: 'pen' | 'touch', goOn: boolean): Promise<void> {
  await writesAndChecks(letter, type);
  expect(within(card()).getByTestId('write-verdict')).toHaveAttribute('data-right', 'true');
  if (goOn) await user.click(within(card()).getByTestId('write-next'));
}

async function startsLetterDrill(): Promise<void> {
  await opensIdeaFromGoal('alphabet');
  fireEvent.change(within(sheets()[0]).getByRole('slider', { name: 'Your level' }), { target: { value: '1' } });
  await screen.findByRole('dialog', { name: 'Letter drill' });
}

/** The first round as the screen has it: rebuilt from the seed with the same functions. */
async function firstRound(): Promise<DrillStep[]> {
  return withWriting(drawRound(startLetterDrill(), mulberry32(SEED)), await handwritingOn());
}

/** Goes through the round on screen: a Write it is skipped, a question answered right. Returns how many Write it cards there were. */
async function throughTheRound(): Promise<number> {
  const steps = await firstRound();
  const dialog = screen.getByRole('dialog', { name: 'Letter drill' });
  let writes = 0;
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    await waitFor(() => expect(within(dialog).getByTestId('letter-drill-step')).toHaveTextContent(`Round 1 · Question ${i + 1} of ${steps.length}`));
    if (step.kind === 'write') {
      writes += 1;
      const shown = await within(dialog).findByTestId('write-it');
      expect(shown).toHaveAttribute('data-letter', ideaOf(step.letter).glyphs![0]);
      await user.click(within(shown).getByRole('button', { name: 'Skip' }));
      continue;
    }
    expect(within(dialog).queryByTestId('write-it')).toBeNull();
    await waitFor(() => expect(within(dialog).getByTestId('grammar-prompt')).toHaveTextContent(step.item.question.prompt));
    const options = within(dialog).getAllByRole('button').filter((b) => b.hasAttribute('data-option'));
    fireEvent.click(options.find((o) => o.textContent === step.item.question.right)!);
    fireEvent.click(await within(dialog).findByTestId('letter-next'));
  }
  await within(dialog).findByTestId('letter-round-result');
  return writes;
}

/** Waits for what decides whether Write it is offered, so a claim that it is not drawn is not made before it could be. */
async function settled(): Promise<void> {
  await act(async () => {
    await handwritingOn();
  });
}

const feature = await loadFeature('features/handwriting-drills.feature');

describeFeature(feature, ({ Scenario }) => {
  const NO_PEN = 'Lampas is opened on Romans 8 with the goal {string} and no pen seen';
  const PEN = 'Lampas is opened on Romans 8 with the goal {string} and a pen seen';
  const opensSettings = async () => {
    window.location.hash = '#/settings?group=greek';
    await screen.findByRole('group', { name: 'Handwriting drills' });
  };
  const rowSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getByTestId('pen-seen')).toHaveTextContent(text));
  };
  const penTouches = async () => {
    fireEvent.pointerDown(document.body, { pointerId: 99, pointerType: 'pen', isPrimary: true, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(document.body, { pointerId: 99, pointerType: 'pen', isPrimary: true, clientX: 10, clientY: 10 });
  };
  const letterSheetFor = (_: unknown, name: string) => opensLetterSheet(name);
  const noWriteIt = async () => {
    await settled();
    expect(within(letterSheet()).queryByTestId('lesson-write-it')).toBeNull();
    expect(within(letterSheet()).queryByRole('button', { name: 'Write it' })).toBeNull();
  };
  const tapsOnSheet = async (_: unknown, name: string) => {
    await user.click(await within(letterSheet()).findByRole('button', { name }));
    await screen.findByRole('dialog', { name: 'Write it' });
  };
  const asksToTrace = async (_: unknown, letter: string) => {
    const shown = await screen.findByTestId('write-it');
    expect(shown).toHaveAttribute('data-stage', 'trace');
    expect(within(shown).getByTestId('write-prompt')).toHaveTextContent(`Trace ${letter}`);
    expect(within(within(shown).getByTestId('write-under')).getByTestId('write-model')).toHaveAttribute('data-letter', letter);
  };

  Scenario('Settings has Handwriting drills, Automatic by default, and no pen has been seen', ({ Given, When, Then, And }) => {
    Given(NO_PEN, (_, goal: string) => open(goal, false));
    When('he opens Settings', opensSettings);
    Then('Settings has the group {string} with {string}, {string} and {string}, and {string} is chosen', async (_, name: string, a: string, b: string, c: string, chosen: string) => {
      const group = screen.getByRole('group', { name });
      expect(within(group).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b, c]);
      await waitFor(() => expect(within(group).getByRole('button', { name: chosen })).toHaveAttribute('aria-pressed', 'true'));
    });
    And('the Handwriting drills row says {string}', rowSays);
  });

  Scenario('A pen touching the screen is kept on the phone', ({ Given, When, Then }) => {
    Given(NO_PEN, (_, goal: string) => open(goal, false));
    When('a pen touches the screen', penTouches);
    Then('the phone keeps {string}', async () => {
      await waitFor(async () => expect(await getPenSeen()).toBe(true));
    });
    When('he opens Settings', opensSettings);
    Then('the Handwriting drills row says {string}', rowSays);
  });

  Scenario('Automatic with no pen seen: no Write it in the letter lesson', ({ Given, When, Then }) => {
    Given(NO_PEN, (_, goal: string) => open(goal, false));
    When('he opens the letter sheet of {string} from the alphabet sheet', letterSheetFor);
    Then('the letter sheet has no Write it part', noWriteIt);
  });

  Scenario('Once a pen is seen the letter lesson has Write it, after How it sounds, saying why', ({ Given, When, Then, And }) => {
    Given(NO_PEN, (_, goal: string) => open(goal, false));
    When('a pen touches the screen', penTouches);
    And('he opens the letter sheet of {string} from the alphabet sheet', letterSheetFor);
    Then('the letter sheet has a Write it part after {string}', async (_, heading: string) => {
      const part = await within(letterSheet()).findByTestId('lesson-write-it');
      const before = within(letterSheet()).getByRole('heading', { name: heading });
      expect(before.compareDocumentPosition(part) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    And('it says {string}', async (_, text: string) => {
      expect(await within(within(letterSheet()).getByTestId('lesson-write-it')).findByTestId('write-why')).toHaveTextContent(text);
    });
    When('he taps {string} on the letter sheet', tapsOnSheet);
    Then('the Write it card asks him to trace {string} with the letter faint under the pad', asksToTrace);
    And('the card shows the name {string} and its sound', (_, name: string) => {
      const line = within(card()).getByTestId('write-name');
      expect(line).toHaveTextContent(name);
      expect(line).toHaveTextContent(ideaChoice(ideaOf('letter-omicron'))!);
      // the first card he meets says why
      expect(within(card()).getByTestId('write-why')).toBeInTheDocument();
    });
    And('the card has {string}, {string} and {string}, all the same size', (_, a: string, b: string, c: string) => {
      const buttons = [a, b, c].map((name) => within(card()).getByRole('button', { name }));
      const size = (x: HTMLElement) => x.className.split(' ').filter((k) => /^(min-h|w-|rounded|text-lg|border$)/.test(k)).sort().join(' ');
      expect(new Set(buttons.map(size)).size).toBe(1);
      expect(new Set(buttons.map((x) => x.parentElement)).size).toBe(1);
      expect(buttons[2]).toBeEnabled();
    });
  });

  Scenario('Trace, then copy, then from memory: two rights at each stage', ({ Given, When, Then, And }) => {
    Given(PEN, (_, goal: string) => open(goal, true));
    When('he opens the letter sheet of {string} from the alphabet sheet', letterSheetFor);
    And('he taps {string} on the letter sheet', tapsOnSheet);
    And('he writes {string} with the pen and taps Check', (_, letter: string) => writesAndChecks(letter, 'pen'));
    Then('the card says {string}', (_, text: string) => {
      expect(within(card()).getByTestId('write-verdict')).toHaveTextContent(text);
    });
    And('the sound of {string} was played as he started writing', () => {
      const said = synth.spoken.slice(spokenBefore);
      expect(said.length).toBeGreaterThan(0);
      expect(said[0].lang).toMatch(/^el/);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(writeDialog()).getByRole('button', { name }));
    });
    And('he writes {string} with the pen and taps Check again', (_, letter: string) => writesRight(letter, 'pen', false));
    And('he goes on from the card', async () => {
      expect(within(card()).getByTestId('write-next')).toHaveTextContent('Copy it');
      await user.click(within(card()).getByTestId('write-next'));
    });
    Then('the card now asks him to copy {string} with the letter beside the pad', async (_, letter: string) => {
      await waitFor(() => expect(card()).toHaveAttribute('data-stage', 'copy'));
      expect(within(card()).getByTestId('write-prompt')).toHaveTextContent(`Copy ${letter}`);
      expect(within(within(card()).getByTestId('write-beside')).getByTestId('write-model')).toHaveAttribute('data-letter', letter);
      expect(within(card()).queryByTestId('write-under')).toBeNull();
    });
    When('he writes {string} with a finger twice and taps Check each time', async (_, letter: string) => {
      await writesRight(letter, 'touch', true);
      await waitFor(() => expect(card()).toHaveAttribute('data-stage', 'copy'));
      await writesRight(letter, 'touch', true);
    });
    Then('the card asks him to write {string} from memory, with no letter shown', async (_, name: string) => {
      await waitFor(() => expect(card()).toHaveAttribute('data-stage', 'memory'));
      expect(within(card()).getByTestId('write-prompt')).toHaveTextContent(`Write ${name} from memory`);
      expect(within(card()).queryByTestId('write-model')).toBeNull();
      expect(card().textContent).not.toContain('ο');
      expect(within(card()).getByTestId('write-name')).toHaveTextContent(name);
    });
    When('he writes {string} with the pen twice from memory and taps Check each time', async (_, letter: string) => {
      await writesRight(letter, 'pen', true);
      await waitFor(() => expect(card()).toHaveAttribute('data-stage', 'memory'));
      await writesRight(letter, 'pen', false);
    });
    Then('the letter sheet says Omicron is written from memory', async () => {
      await user.click(within(writeDialog()).getAllByRole('button', { name: 'Done' })[0]);
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Write it' })).toBeNull());
      await waitFor(() => expect(within(letterSheet()).getByTestId('write-progress')).toHaveTextContent('Written from memory'));
    });
  });

  Scenario('The wrong letter is not quite: the right strokes are drawn and he tries again, with no score', ({ Given, When, Then, And }) => {
    Given(PEN, (_, goal: string) => open(goal, true));
    When('he opens the letter sheet of {string} from the alphabet sheet', letterSheetFor);
    And('he taps {string} on the letter sheet', tapsOnSheet);
    And('he writes {string} with the pen and taps Check', (_, letter: string) => writesAndChecks(letter, 'pen'));
    Then('the card says {string} and draws the strokes of {string}', (_, text: string, letter: string) => {
      const verdict = within(card()).getByTestId('write-verdict');
      expect(verdict).toHaveAttribute('data-right', 'false');
      expect(verdict).toHaveTextContent(text);
      const strokes = within(card()).getByTestId('write-strokes-shown');
      expect(strokes).toHaveAttribute('data-letter', letter);
      expect(strokes).toHaveAttribute('data-animate', 'true');
    });
    And('the card shows no score', () => {
      expect(card().textContent).not.toMatch(/\d\s*%|score|\d+ of \d+|0\.\d/i);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(card()).getByRole('button', { name }));
    });
    Then('the pad is empty and the card still asks him to trace {string}', async (_, letter: string) => {
      expect(await within(card()).findByTestId('writing-pad')).toHaveAttribute('data-strokes', '0');
      await asksToTrace(undefined, letter);
      expect(await getWriteProgress(letter)).toEqual({ stage: 'trace', rights: 0 });
    });
  });

  Scenario('A Greek letter written as its Latin look-alike is close, with the line that says where', ({ Given, When, Then, And }) => {
    Given(PEN, (_, goal: string) => open(goal, true));
    When('he opens the letter sheet of {string} from the alphabet sheet', letterSheetFor);
    And('he taps {string} on the letter sheet', tapsOnSheet);
    And('he writes a Latin {string} for {string} with the pen and taps Check', (_, latin: string, letter: string) => {
      const shape = LOOKALIKES[letter].find((l) => l.latin === latin)?.variants[0];
      if (!shape) throw new Error(`no Latin ${latin} for ${letter}`);
      return writesAndChecks(letter, 'pen', drawing(shape));
    });
    Then('the card says {string} and the line {string}', (_, text: string, line: string) => {
      const verdict = within(card()).getByTestId('write-verdict');
      expect(verdict).toHaveAttribute('data-right', 'false');
      expect(verdict).toHaveTextContent(text);
      expect(verdict).not.toHaveTextContent('Not quite');
      expect(within(card()).getByTestId('write-hint')).toHaveTextContent(line);
    });
    And('the card draws the strokes of {string}', (_, letter: string) => {
      expect(within(card()).getByTestId('write-strokes-shown')).toHaveAttribute('data-letter', letter);
    });
    And('Gamma has no right kept', async () => {
      expect(await getWriteProgress('γ')).toEqual({ stage: 'trace', rights: 0 });
    });
  });

  Scenario('Skip costs nothing', ({ Given, When, Then, And }) => {
    Given(PEN, (_, goal: string) => open(goal, true));
    When('he opens the letter sheet of {string} from the alphabet sheet', letterSheetFor);
    And('he taps {string} on the letter sheet', tapsOnSheet);
    And('he writes {string} with the pen and taps Check', (_, letter: string) => writesRight(letter, 'pen', false));
    And('he taps {string}', async (_, name: string) => {
      await user.click(within(writeDialog()).getByRole('button', { name }));
    });
    And('he skips it', async () => {
      await user.click(within(await screen.findByTestId('write-it')).getByRole('button', { name: 'Skip' }));
    });
    Then('the Write it card is closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Write it' })).toBeNull());
    });
    And("Omicron's writing still has {int} right at Trace", async (_, rights: number) => {
      expect(await getWriteProgress('ο')).toEqual({ stage: 'trace', rights });
      await waitFor(() => expect(within(letterSheet()).getByTestId('write-progress')).toHaveTextContent(`Trace: ${rights} of 2 right`));
    });
    And("Omicron's level has not changed", async () => {
      expect(await getLevel('letter-omicron')).toBeUndefined();
    });
  });

  Scenario('Off: no Write it anywhere, even with a pen seen', ({ Given, When, Then, And }) => {
    Given(PEN, (_, goal: string) => open(goal, true));
    And('Handwriting drills is {string}', async (_, label: string) => {
      await act(async () => {
        await db.settings.put({ key: 'handwritingDrills', value: CHOICES[label] });
      });
    });
    When('he opens the letter sheet of {string} from the alphabet sheet', letterSheetFor);
    Then('the letter sheet has no Write it part', noWriteIt);
    When('he starts the letter drill on the alphabet sheet', async () => {
      cleanup();
      render(<App />);
      await startsLetterDrill();
    });
    Then('the first round has no Write it question', async () => {
      expect((await firstRound()).filter((s) => s.kind === 'write')).toHaveLength(0);
      expect(await throughTheRound()).toBe(0);
    });
  });

  Scenario('With a pen seen the letter drill mixes in Write it questions, and skipping one keeps the score', ({ Given, When, Then }) => {
    Given(PEN, (_, goal: string) => open(goal, true));
    When('he starts the letter drill on the alphabet sheet', startsLetterDrill);
    Then('the first round has {int} Write it questions among its {int}', async (_, writes: number, all: number) => {
      const steps = await firstRound();
      expect(steps).toHaveLength(all);
      expect(steps.filter((s) => s.kind === 'write')).toHaveLength(writes);
      await waitFor(() => expect(screen.getByTestId('letter-drill-step')).toHaveTextContent(`Question 1 of ${all}`));
    });
    When('he answers the round right and skips every Write it question', async () => {
      expect(await throughTheRound()).toBe(2);
    });
    Then('the round says {string}', (_, score: string) => {
      expect(screen.getByTestId('letter-round-result')).toHaveTextContent(score);
    });
  });
});
