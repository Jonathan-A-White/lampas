// features/steps/roll-r.steps.tsx — runs features/roll-r.feature: the optional lesson 'Rolling your r' (mw-5r3p30.359) on the Hard sounds engine: offered from the Rho sheet in Modern
// Greek only, stepped through from the tap of 'butter' to the tapped r to the trill, with the pairs ρ/λ and ρ/δ to tell apart, and its IPA shown only under the accent IPA. The
// lesson is the one shipped (src/data/hardSounds/tapped-r.json), read through the accessors the screen uses; the Greek voice is the honest fake of tests/support/fake-speech.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { setGreekPronunciation } from '../../src/data/repositories/settings';
import { clearBus } from '../../src/events/bus';
import { dropHeldIdea } from '../../src/ideaReturn';
import { lessonById, saidFor } from '../../src/hardSounds/lessons';
import { forgetTrail } from '../../src/nav/lastRoute';
import { accentOf, chooseAccent, DEFAULT_ACCENT } from '../../src/speech/accents';
import { stopSpeaking } from '../../src/speech/greek';
import { registerPronunciation } from '../../src/speech/pronunciation';
import { MODERN } from '../../src/speech/schemes/modern';
import { SOUND_IDS } from '../../src/speech/sounds';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';
import { asSpoken } from '../../tests/support/spoken-word';

const user = userEvent.setup();
const SECTION = 'Hard sounds (optional)';
const LINK = 'Learn to roll your r (optional)';
const rolling = lessonById('tapped-r')!;

let synth: FakeSynth;
let unregister: (() => void) | undefined;

afterAll(() => {
  unregister?.();
  cleanup();
  stopSpeaking();
  chooseAccent(DEFAULT_ACCENT);
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app on the Goal screen with every store emptied, the goal `goal`, the pronunciation `pronunciation` and the accent `accent` chosen. */
async function open(goal: string, pronunciation: string, accent: string = DEFAULT_ACCENT): Promise<void> {
  cleanup();
  stopSpeaking();
  clearBus();
  forgetTrail();
  dropHeldIdea();
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubChapterFetch();
  localStorage.clear();
  chooseAccent(accent);
  window.history.replaceState(null, '', '/#/goal');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await db.settings.put({ key: 'goal', value: goal });
  await db.settings.put({ key: 'englishAccent', value: accent });
  await setGreekPronunciation(pronunciation);
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Goal', level: 1 });
  await screen.findByTestId('goal-title');
}

const section = () => screen.findByRole('region', { name: SECTION });
const lesson = () => screen.findByTestId('sound-lesson');
const heading = (): string => screen.getByRole('heading', { level: 2 }).textContent ?? '';
const ideaSheets = () => screen.queryAllByRole('dialog', { name: 'Idea' });
const letterSheet = (): HTMLElement => ideaSheets()[ideaSheets().length - 1];
/** What IPA writes: its own characters, a trill's r between slashes, and a sound's slashed id. */
const ipaIn = (text: string): string[] => [...(text.match(/[ɣʝðɛɔʃːçŋɾɡ]|\/r\//gu) ?? []), ...SOUND_IDS.filter((id) => text.includes(id))];

/** From the Goal screen's ideas list: the alphabet's sheet, then the tile of the letter `name`. */
async function opensLetterSheet(name: string): Promise<void> {
  await user.click(await screen.findByTestId('ideas-bar'));
  await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: 'The Greek alphabet' }));
  const alphabet = await screen.findByRole('dialog', { name: 'Idea' });
  const tile = within(alphabet).getAllByTestId('teach-tile').find((t) => t.getAttribute('data-name') === name);
  if (!tile) throw new Error(`no tile ${name} on the alphabet sheet`);
  await user.click(within(tile).getByRole('button', { name: `About ${name}` }));
  await waitFor(() => expect(ideaSheets()).toHaveLength(2));
}

async function opensFromRho(): Promise<void> {
  await opensLetterSheet('rho');
  await user.click(within(letterSheet()).getByRole('button', { name: LINK }));
  await lesson();
  await waitFor(() => expect(heading()).toBe('Why it is hard for you'));
}

async function next(): Promise<void> {
  await user.click(within(await lesson()).getByRole('button', { name: 'Next' }));
}

async function nextUntil(name: string): Promise<void> {
  for (let i = 0; i < 12 && heading() !== name; i++) await next();
  expect(heading()).toBe(name);
}

const wordsOf = (kind: string): string[] => {
  const step = rolling.steps.find((s) => s.kind === kind);
  return step && 'words' in step && step.words ? step.words : [];
};

const feature = await loadFeature('features/roll-r.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The Rho sheet in Modern Greek offers the lesson, and Back returns to the sheet', ({ Given, When, Then }) => {
    Given('Lampas is opened on the Goal screen with the goal {string} in Modern Greek', (_, goal: string) => open(goal, 'modern'));
    When('he opens the letter sheet of {string} from the Goal screen', (_, name: string) => opensLetterSheet(name));
    Then('the sheet shows {string}', (_, name: string) => {
      expect(within(letterSheet()).getByRole('button', { name })).toBeInTheDocument();
    });
    When('he taps {string} on the sheet', async (_, name: string) => {
      await user.click(within(letterSheet()).getByRole('button', { name }));
    });
    Then('the lesson {string} shows {string}', async (_, title: string, step: string) => {
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByTestId('sound-step')).toHaveTextContent(step);
    });
    When('he goes Back', () => window.history.back());
    Then('the letter sheet {string} is on screen over the Goal screen', async (_, title: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Idea' });
      expect(within(sheet).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/goal');
    });
  });

  Scenario('The Rho sheet in another pronunciation does not offer it', ({ Given, And, When, Then }) => {
    Given('a second pronunciation {string} is registered and chosen', (_, label: string) => {
      unregister = registerPronunciation({ ...MODERN, id: 'erasmian', label });
    });
    And('Lampas is opened on the Goal screen with the goal {string} in {string}', (_, goal: string, pronunciation: string) => open(goal, pronunciation));
    When('he opens the letter sheet of {string} from the Goal screen', (_, name: string) => opensLetterSheet(name));
    Then('the sheet does not show {string}', (_, name: string) => {
      expect(within(letterSheet()).queryByRole('button', { name })).toBeNull();
    });
    And('the Goal screen has no {string} section', (_, name: string) => {
      expect(screen.queryByRole('region', { name })).toBeNull();
    });
  });

  Scenario('The lesson goes from the tap of butter to the tapped r to the trill', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Goal screen with the goal {string} in Modern Greek', (_, goal: string) => open(goal, 'modern'));
    When('he opens the lesson {string} from the Rho sheet', () => opensFromRho());
    Then('the lesson says why in words about the English r', async () => {
      const text = (await lesson()).textContent ?? '';
      expect(text).toContain(saidFor(rolling.steps[0].text, accentOf('american')));
      expect(text).toContain('English r');
    });
    And('going on, the step {string} names {string} and {string}', async (_, name: string, a: string, b: string) => {
      await nextUntil(name);
      const text = (await lesson()).textContent ?? '';
      expect(text).toContain(a);
      expect(text).toContain(b);
    });
    And('going on, the step {string} has a speaker on {string} and on {string}', async (_, name: string, a: string, b: string) => {
      await nextUntil(name);
      expect(within(await lesson()).getByRole('button', { name: `Hear ${a}` })).toBeInTheDocument();
      expect(within(await lesson()).getByRole('button', { name: `Hear ${b}` })).toBeInTheDocument();
    });
    And('going on past the pairs, the step {string} lets each word be said into the recorder', async (_, name: string) => {
      await nextUntil(name);
      for (const w of wordsOf('try')) {
        expect(within(await lesson()).getByRole('button', { name: `Hear ${w}` })).toBeInTheDocument();
        expect(within(await lesson()).getByRole('button', { name: `Say ${w}` })).toBeInTheDocument();
      }
      expect(within(await lesson()).getByRole('button', { name: /^Hold to say / })).toBeInTheDocument();
    });
    And('going on, the step {string} says it is only a stretch, and has a speaker and a recorder on its words', async (_, name: string) => {
      await nextUntil(name);
      expect((await lesson()).textContent).toMatch(/stretch/i);
      const words = wordsOf('stretch');
      expect(words.length).toBeGreaterThan(0);
      for (const w of words) expect(within(await lesson()).getByRole('button', { name: `Hear ${w}` })).toBeInTheDocument();
      expect(within(await lesson()).getByRole('button', { name: /^Hold to say / })).toBeInTheDocument();
    });
    And('going on, the step {string} shows 1 John 1:2', async (_, name: string) => {
      await nextUntil(name);
      expect(within(await lesson()).getByText('1 John 1:2')).toBeInTheDocument();
    });
  });

  Scenario('The pairs to tell apart are ρ with λ and ρ with δ', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on the Goal screen with the goal {string} in Modern Greek', (_, goal: string) => open(goal, 'modern'));
    When('he opens the lesson {string} from the Rho sheet', () => opensFromRho());
    And('he taps {string} until the step {string}', (_, __: string, name: string) => nextUntil(name));
    Then('the pairs shown include one told apart by ρ and λ and one by ρ and δ', async () => {
      const base = (c: string): string => c.normalize('NFD').charAt(0).toLowerCase();
      const told = [...(await lesson()).querySelectorAll('[data-pair]')].map((li) => {
        const [a, b] = [...li.querySelectorAll('[lang="el"]')].map((w) => [...(w.textContent ?? '')].map(base));
        const at = a.findIndex((c, i) => c !== b[i]);
        return a.length === b.length && at >= 0 ? [a[at], b[at]].sort().join('') : '';
      });
      expect(told).toContain(['λ', 'ρ'].sort().join(''));
      expect(told).toContain(['δ', 'ρ'].sort().join(''));
    });
    When('he starts the drill', async () => {
      await user.click(within(await lesson()).getByRole('button', { name: 'Start the drill' }));
    });
    Then('the voice says a word of a pair and both words are offered', async () => {
      const round = await screen.findByTestId('pair-round');
      const offered = within(round).getAllByRole('button', { name: /^Choose / }).map((b) => b.textContent ?? '');
      expect(offered).toHaveLength(2);
      await waitFor(() => expect(synth.spoken.map((s) => s.text)).toEqual(expect.arrayContaining([expect.stringMatching(new RegExp(offered.map(asSpoken).join('|')))])));
    });
  });

  Scenario('It is marked optional and never pushed', ({ Given, Then, And }) => {
    Given('Lampas is opened on the Goal screen with the goal {string} in Modern Greek', (_, goal: string) => open(goal, 'modern'));
    Then('the Goal screen lists {string} under {string}', async (_, title: string, name: string) => {
      const found = await section();
      expect(within(found).getByRole('heading', { name })).toBeInTheDocument();
      expect(within(found).getByRole('button', { name: new RegExp(`^${title}`) })).toBeInTheDocument();
    });
    And('Learn next does not name {string}', (_, title: string) => {
      expect(screen.queryByTestId('learn-next')?.textContent ?? '').not.toContain(title);
    });
    And('the Rho sheet still has its Drill it, with the lesson not done', async () => {
      await opensLetterSheet('rho');
      await waitFor(() => expect(within(letterSheet()).getByRole('button', { name: 'Drill it' })).toBeEnabled());
    });
  });

  Scenario('With an American accent no step shows any IPA', ({ Given, When, Then }) => {
    Given('Lampas is opened on the Goal screen with the goal {string} in Modern Greek and the accent {string}', (_, goal: string, accent: string) => open(goal, 'modern', accent));
    When('he opens the lesson {string} from the Rho sheet', () => opensFromRho());
    Then('no step shows any IPA', async () => {
      for (let i = 0; i < rolling.steps.length; i++) {
        expect(ipaIn((await lesson()).textContent ?? '')).toEqual([]);
        if (i < rolling.steps.length - 1) await next();
      }
    });
  });

  Scenario('With the accent IPA the tap and the trill show their sounds', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Goal screen with the goal {string} in Modern Greek and the accent {string}', (_, goal: string, accent: string) => open(goal, 'modern', accent));
    When('he opens the lesson {string} from the Rho sheet', () => opensFromRho());
    Then('the lesson shows the sound {string}', async (_, id: string) => {
      expect(within(await lesson()).getByTestId('sound-ipa')).toHaveTextContent(id);
    });
    And('the stretch step shows the sound {string}', async (_, id: string) => {
      await nextUntil('A stretch goal');
      expect(within(await lesson()).getByTestId('sound-ipa')).toHaveTextContent(id);
    });
  });
});
