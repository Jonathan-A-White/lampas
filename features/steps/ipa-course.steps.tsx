// features/steps/ipa-course.steps.tsx — runs features/ipa-course.feature: the optional course 'Learn the IPA sounds' (src/ipa/, #/ipa), reached only by the Optional entry on the Goal screen.
// The drill and the pass check draw from ipaSeed; the steps fix it and rebuild each question and each round with the same pure functions the screen uses (src/ipa/drill.ts,
// course.ts), so they know which choice is right. The Greek voice is the honest fake of tests/support/fake-speech.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/random';
import { getIpaProgress } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { passCheckQuestions, courseSounds, type CourseSound } from '../../src/ipa/course';
import { answerDrill, currentQuestion, drawRound, isRoundOver, questionFor, startRound, type DrillItem, type DrillState, type IpaQuestion } from '../../src/ipa/drill';
import { ipaSeed } from '../../src/ipa/seed';
import { forgetTrail } from '../../src/nav/lastRoute';
import { ACCENTS, accentOf, chooseAccent, chosenAccent } from '../../src/speech/accents';
import { stopSpeaking } from '../../src/speech/greek';
import { pronunciationOf } from '../../src/speech/pronunciation';
import type { SoundId } from '../../src/speech/sounds';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';
import { asSpoken } from '../../tests/support/spoken-word';
import { GROUPS } from '../../src/settings/rows';

const user = userEvent.setup();
const SEED = 5;
const scheme = pronunciationOf('modern');
const sounds: CourseSound[] = courseSounds(scheme, accentOf('american'));
const COURSE_LINE = 'You do not need this for Lampas or for reading Greek. It is only here if you want it.';

let synth: FakeSynth;

afterAll(() => {
  cleanup();
  stopSpeaking();
  chooseAccent('american');
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app on `hash` with a Greek voice, every store emptied, and `goal` saved when there is one. */
async function open(hash: string, goal?: string): Promise<void> {
  cleanup();
  stopSpeaking();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubChapterFetch();
  localStorage.clear();
  chooseAccent('american');
  ipaSeed.next = () => SEED;
  window.history.replaceState(null, '', `/${hash}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  if (goal !== undefined) await db.settings.put({ key: 'goal', value: goal });
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Goal', level: 1 });
}

const entry = () => screen.findByTestId('ipa-entry');
const home = () => screen.findByTestId('ipa-home');

async function opensCourse(): Promise<void> {
  await open('#/goal');
  await user.click(await entry());
  await user.click(await screen.findByTestId('ipa-start'));
  await home();
}

/** Opens the card of `id` from the sounds and goes back to them; waits until the count shows it. */
async function opensSound(id: string, opened: number): Promise<void> {
  await user.click(within(within(await home()).getByRole('list', { name: 'Sounds' })).getAllByRole('listitem').find((li) => li.getAttribute('data-sound') === id)!.querySelector('button')!);
  await screen.findByTestId('ipa-card');
  await user.click(screen.getByRole('button', { name: '‹ Sounds' }));
  await waitFor(() => expect(screen.getByTestId('ipa-count')).toHaveTextContent(`${opened} of ${sounds.length} sounds opened`));
}

async function opensSounds(ids: string[]): Promise<void> {
  for (const [i, id] of ids.entries()) await opensSound(id, i + 1);
}

// ---- the drill, mirrored ----
let pool: SoundId[] = [];
let state: DrillState;
let round = 1;
let asked: { item: DrillItem; right: boolean }[] = [];
let firstItem: DrillItem;

/** The question the screen should show now, checked against what it shows. */
async function questionShown(): Promise<IpaQuestion> {
  const item = currentQuestion(state)!;
  const q = questionFor(item, state.asked, SEED + round, pool, sounds, scheme);
  await waitFor(() => expect(screen.getByTestId('ipa-prompt')).toHaveTextContent(q.prompt));
  expect(screen.getByTestId('ipa-question').getAttribute('data-direction')).toBe(q.direction);
  expect(optionButtons().map((b) => b.textContent)).toEqual(q.options.map((o) => o.label));
  if (q.direction === 'hear') expect(screen.getByTestId('tap-to-hear')).toBeInTheDocument();
  else expect(screen.getByTestId('ipa-symbol')).toHaveTextContent(q.symbol!);
  return q;
}
const optionButtons = (): HTMLElement[] => within(screen.getByTestId('ipa-question')).getAllByRole('button').filter((b) => b.hasAttribute('data-option'));

/** Picks the right choice, or a wrong one. */
async function pick(right: boolean): Promise<IpaQuestion> {
  const q = await questionShown();
  const choice = right ? q.right : q.options.find((o) => o.id !== q.right)!.id;
  fireEvent.click(optionButtons().find((b) => b.getAttribute('data-sound') === choice)!);
  asked.push({ item: currentQuestion(state)!, right });
  state = answerDrill(state, right);
  return q;
}
const nextQuestion = async (): Promise<void> => void fireEvent.click(await screen.findByTestId('ipa-next'));

const same = (a: DrillItem, b: DrillItem): boolean => a.sound === b.sound && a.direction === b.direction;

// ---- the pass check, mirrored ----
let checkQuestions: IpaQuestion[] = [];
let checkAt = 0;

async function checkQuestionShown(): Promise<IpaQuestion> {
  const q = checkQuestions[checkAt];
  await waitFor(() => expect(screen.getByTestId('ipa-step')).toHaveTextContent(`Pass check · Question ${checkAt + 1} of ${checkQuestions.length}`));
  await waitFor(() => expect(screen.getByTestId('ipa-prompt')).toHaveTextContent(q.prompt));
  expect(optionButtons().map((b) => b.textContent)).toEqual(q.options.map((o) => o.label));
  return q;
}

/** Answers the pass check's question on screen, right or wrong, and taps Next (or Finish). Nothing is told. */
async function checkAnswer(right: boolean): Promise<void> {
  const q = await checkQuestionShown();
  const choice = right ? q.right : q.options.find((o) => o.id !== q.right)!.id;
  fireEvent.click(optionButtons().find((b) => b.getAttribute('data-sound') === choice)!);
  expect(screen.queryByTestId('ipa-told')).toBeNull();
  checkAt += 1;
  fireEvent.click(await screen.findByTestId('ipa-next'));
}

async function startsCheck(): Promise<void> {
  fireEvent.click(await screen.findByTestId('ipa-check'));
  checkQuestions = passCheckQuestions(sounds, mulberry32(SEED), scheme);
  checkAt = 0;
  await checkQuestionShown();
}

const feature = await loadFeature('features/ipa-course.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The entry sits under Optional, below the main path', ({ Given, Then, And }) => {
    Given('Lampas is opened on the Goal screen with the goal {string}', async (_, goal: string) => {
      await open('#/goal', goal);
      await screen.findByTestId('goal-title');
    });
    Then('the Goal screen has an {string} heading with one entry {string} below {string} and {string}', async (_, heading: string, name: string, path: string, read: string) => {
      const section = await screen.findByRole('region', { name: heading });
      expect(within(section).getByRole('heading', { name: heading })).toBeInTheDocument();
      const buttons = within(section).getAllByRole('button');
      expect(buttons.map((b) => b.textContent)).toEqual([name]);
      const wholePath = screen.getByRole('button', { name: path });
      const readIt = screen.getByRole('button', { name: read });
      for (const main of [wholePath, readIt]) expect(main.compareDocumentPosition(buttons[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    And('no other part of the Goal screen mentions the course', () => {
      expect((document.body.textContent ?? '').match(/IPA/g)).toHaveLength(1);
    });
  });

  Scenario('Why learn it? comes first and Not now leaves nothing behind', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Goal screen with no goal', () => open('#/goal'));
    When('he taps the entry {string}', async (_, name: string) => {
      expect((await entry()).textContent).toBe(name);
      await user.click(await entry());
    });
    Then('{string} shows with the line {string} first', async (_, heading: string, line: string) => {
      const why = await screen.findByTestId('ipa-why');
      expect(within(why).getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(why.querySelector('p')!.textContent).toBe(line);
      expect(line).toBe(COURSE_LINE);
    });
    And('it gives the three reasons: one standard for every language and dictionary, exactness where English key words blur, and the marks used in pronunciation guides', () => {
      const text = screen.getByTestId('ipa-why').textContent ?? '';
      for (const reason of ['One standard for every language and dictionary', 'Exactness where English key words blur', 'The marks used in pronunciation guides']) expect(text).toContain(reason);
    });
    And('{string} and {string} are the same size and weight', (_, a: string, b: string) => {
      const start = within(screen.getByTestId('ipa-why')).getByRole('button', { name: a });
      const notNow = within(screen.getByTestId('ipa-why')).getByRole('button', { name: b });
      expect(start.className).toBe(notNow.className);
      expect(start.parentElement).toBe(notNow.parentElement);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(screen.getByTestId('ipa-why')).getByRole('button', { name }));
    });
    Then('the Goal screen shows again', async () => {
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
      expect(screen.queryByTestId('ipa-why')).toBeNull();
      expect(await entry()).toBeInTheDocument();
    });
    And('the course has kept nothing', async () => {
      expect(await db.settings.get('ipaCourse')).toBeUndefined();
    });
    And('the course is named on no other screen', async () => {
      const screens: [string, string][] = [['#/', ''], ['#/words', 'Words'], ['#/settings', 'Settings'], ...GROUPS.map((g): [string, string] => [`#/settings?group=${g.id}`, g.title]), ['#/path', 'The whole path'], ['#/paradigms', 'Paradigms']];
      for (const [hash, title] of screens) {
        window.location.hash = hash;
        if (title) await screen.findByRole('heading', { name: title, level: 1 });
        else await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
        expect(document.body.textContent, hash).not.toMatch(/IPA sounds/);
      }
    });
  });

  Scenario('Start opens the sounds and a card gives a sound four things', ({ Given, When, Then }) => {
    Given('he has opened the course and tapped {string}', async () => opensCourse());
    Then('the course lists every sound the Greek pronunciation says, none of them opened yet', async () => {
      const list = within(await home()).getByRole('list', { name: 'Sounds' });
      expect(within(list).getAllByRole('listitem').map((li) => li.getAttribute('data-sound'))).toEqual(sounds.map((s) => s.id));
      expect(sounds).toHaveLength(31);
      expect(screen.getByTestId('ipa-count')).toHaveTextContent(`0 of ${sounds.length} sounds opened`);
    });
    When('he opens the sound {string}', async (_, id: string) => {
      await user.click(within(within(await home()).getByRole('list', { name: 'Sounds' })).getAllByRole('listitem').find((li) => li.getAttribute('data-sound') === id)!.querySelector('button')!);
      await screen.findByTestId('ipa-card');
    });
    Then('the card shows the symbol {string}, the key word {string}, the Greek letters of that sound and a Greek word that has it', (_, symbol: string, key: string) => {
      expect(screen.getByTestId('ipa-card-symbol')).toHaveTextContent(symbol);
      expect(screen.getByTestId('ipa-card-key').textContent).toBe(key);
      const guide = scheme.soundGuide![symbol as SoundId]!;
      const letters = within(screen.getByTestId('ipa-card-letters')).getAllByRole('listitem').map((li) => li.textContent);
      expect(letters).toEqual([...guide.letters]);
      expect(screen.getByTestId('ipa-card-word')).toHaveTextContent(guide.word);
      expect(screen.getByTestId('ipa-card-confusable')).toHaveTextContent('/x/');
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name }));
    });
    Then('the Greek voice is handed that word', async () => {
      await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
      const said = synth.spoken[synth.spoken.length - 1];
      expect(said.text).toBe(asSpoken(scheme.soundGuide!['/ç/']!.word));
      expect(said.lang).toBe('el-GR');
    });
  });

  Scenario('The key word follows his English accent, and IPA shows American words', ({ Given, When, Then, And }) => {
    Given('he has opened the course and tapped {string}', async () => opensCourse());
    And('his English accent is {string}', (_, label: string) => chooseAccent(ACCENTS.find((a) => a.label === label)!.id));
    When('he opens the sound {string}', async (_, id: string) => {
      await user.click(within(within(await home()).getByRole('list', { name: 'Sounds' })).getAllByRole('listitem').find((li) => li.getAttribute('data-sound') === id)!.querySelector('button')!);
      await screen.findByTestId('ipa-card');
    });
    Then('the card shows the key word {string}', (_, key: string) => expect(screen.getByTestId('ipa-card-key').textContent).toBe(key));
    When('he changes his English accent to {string}', (_, label: string) => chooseAccent(ACCENTS.find((a) => a.label === label)!.id));
    And('he opens the sound {string} again', async (_, id: string) => {
      await user.click(screen.getByRole('button', { name: '‹ Sounds' }));
      await user.click(within(within(await home()).getByRole('list', { name: 'Sounds' })).getAllByRole('listitem').find((li) => li.getAttribute('data-sound') === id)!.querySelector('button')!);
      await screen.findByTestId('ipa-card');
    });
    Then('the card now shows the key word {string}', async (_, key: string) => {
      expect(chosenAccent().id).toBe('ipa');
      await waitFor(() => expect(screen.getByTestId('ipa-card-key').textContent).toBe(key));
    });
  });

  Scenario('The drill asks both ways, and a wrong answer comes back until it is right twice', ({ Given, When, Then, And }) => {
    Given('he has opened the course and tapped {string}', async () => opensCourse());
    And('he has opened the sounds {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      await opensSounds([a, b, c]);
      pool = [a, b, c] as SoundId[];
    });
    When('he starts the drill', async () => {
      fireEvent.click(await screen.findByTestId('ipa-drill'));
      round = 1;
      asked = [];
      state = startRound(drawRound(pool, () => 0, mulberry32(SEED)));
      firstItem = currentQuestion(state)!;
      await waitFor(() => expect(screen.getByTestId('ipa-step')).toHaveTextContent(`Round 1 · ${state.queue.length} to go`));
    });
    Then('each question is a hear question with symbols to pick, or a see question with key words to pick', async () => {
      const q = await questionShown();
      if (q.direction === 'hear') for (const o of optionButtons()) expect(o.textContent).toMatch(/^\/.+\/$/);
      else for (const o of optionButtons()) expect(o.textContent).not.toMatch(/^\/.+\/$/);
    });
    When('he answers the first question wrong', async () => {
      await pick(false);
    });
    Then('it says {string} and the answer', async (_, said: string) => {
      const told = await screen.findByTestId('ipa-told');
      expect(told.getAttribute('data-result')).toBe('wrong');
      expect(told).toHaveTextContent(said);
      const lesson = sounds.find((s) => s.id === firstItem.sound)!;
      expect(told).toHaveTextContent(lesson.word);
      expect(told).toHaveTextContent(lesson.id);
    });
    When('he goes on, answering every question right, until the first question has been right twice', async () => {
      await nextQuestion();
      for (let guard = 0; guard < 80 && asked.filter((a) => same(a.item, firstItem) && a.right).length < 2; guard += 1) {
        await pick(true);
        await nextQuestion();
      }
    });
    Then('that question was asked wrong, then right, then right', () => {
      expect(asked.filter((a) => same(a.item, firstItem)).map((a) => a.right)).toEqual([false, true, true]);
    });
    And('{string} and {string} were asked next to each other', (_, a: string, b: string) => {
      for (const direction of ['hear', 'see'] as const) {
        const order: string[] = [];
        for (const { item } of asked) if (item.direction === direction && !order.includes(item.sound)) order.push(item.sound);
        expect(Math.abs(order.indexOf(a) - order.indexOf(b)), direction).toBe(1);
      }
      expect(new Set(asked.map((x) => x.item.direction))).toEqual(new Set(['hear', 'see']));
    });
    When('he finishes the round', async () => {
      for (let guard = 0; guard < 80 && !isRoundOver(state); guard += 1) {
        await pick(true);
        await nextQuestion();
      }
      await screen.findByTestId('ipa-round-result');
    });
    Then('the round says how many were right and offers {string} and {string}', (_, another: string, done: string) => {
      expect(screen.getByTestId('ipa-round-result')).toHaveTextContent(`${state.rights} of ${state.asked} right`);
      expect(screen.getByRole('button', { name: another })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: done })).toBeInTheDocument();
    });
  });

  Scenario('A pass check of every sound both ways passes and offers IPA in the hints', ({ Given, When, Then, And }) => {
    Given('he has opened the course and tapped {string}', async () => opensCourse());
    When('he starts the pass check', () => startsCheck());
    Then('it asks every sound both ways, once each, and tells him nothing as he answers', async () => {
      expect(checkQuestions).toHaveLength(sounds.length * 2);
      const pairs = new Set(checkQuestions.map((q) => `${q.sound}:${q.direction}`));
      expect(pairs.size).toBe(sounds.length * 2);
      await checkAnswer(true);
      expect(screen.queryByText(/Right\.|Not quite/)).toBeNull();
    });
    When('he answers every question right', async () => {
      while (checkAt < checkQuestions.length) await checkAnswer(true);
      await screen.findByTestId('ipa-result');
    });
    Then('he is told {string} with {string}', (_, told: string, score: string) => {
      expect(screen.getByTestId('ipa-result').getAttribute('data-result')).toBe('passed');
      expect(screen.getByRole('heading', { name: told })).toBeInTheDocument();
      expect(screen.getByTestId('ipa-score').textContent).toBe(score);
    });
    And('{string} is offered', (_, name: string) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
    When('he taps {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name }));
    });
    Then('his English accent is {string}', async (_, label: string) => {
      await screen.findByTestId('ipa-hints-shown');
      expect(chosenAccent().label).toBe(label);
      expect((await db.settings.get('englishAccent'))?.value).toBe('ipa');
    });
    And('the course is kept as passed', async () => {
      expect((await getIpaProgress()).passedAt).toBeTypeOf('number');
    });
  });

  Scenario('A pass check that fails names the symbols to practise', ({ Given, When, Then, And }) => {
    Given('he has opened the course and tapped {string}', async () => opensCourse());
    When('he starts the pass check', () => startsCheck());
    And('he answers the first {int} questions wrong and the rest right', async (_, wrong: number) => {
      while (checkAt < checkQuestions.length) await checkAnswer(checkAt >= wrong);
      await screen.findByTestId('ipa-result');
    });
    Then('he is told {string}', (_, told: string) => {
      expect(screen.getByTestId('ipa-result').getAttribute('data-result')).toBe('not-yet');
      expect(screen.getByRole('heading', { name: told })).toBeInTheDocument();
    });
    And('the symbols of those questions are named under {string}', (_, under: string) => {
      const practise = screen.getByTestId('ipa-practise');
      expect(practise).toHaveTextContent(under);
      const wrongSounds = new Set(checkQuestions.slice(0, 8).map((q) => q.sound));
      for (const id of wrongSounds) expect(practise).toHaveTextContent(id);
      expect(practise.querySelector('span')!.textContent!.split(/\s+/).filter(Boolean).sort()).toEqual([...wrongSounds].sort());
    });
    And('{string} is not offered', (_, name: string) => expect(screen.queryByRole('button', { name })).toBeNull());
    And('{string} is offered', (_, name: string) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  });

  Scenario('What he has done is kept', ({ Given, When, Then, And }) => {
    Given('he has opened the course and tapped {string}', async () => opensCourse());
    And('he has opened the sounds {string}, {string} and {string}', async (_, a: string, b: string, c: string) => opensSounds([a, b, c]));
    When('he goes back to the Goal screen and opens the course again', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Goal' }));
      await user.click(await entry());
    });
    Then('it opens on the sounds, not on {string}, and says {string}', async (_, why: string, count: string) => {
      await home();
      expect(screen.queryByTestId('ipa-why')).toBeNull();
      expect(screen.queryByRole('heading', { name: why })).toBeNull();
      await waitFor(() => expect(screen.getByTestId('ipa-count')).toHaveTextContent(count));
    });
  });
});
