// features/steps/hebrew-hard-sounds.steps.tsx — runs features/hebrew-hard-sounds.feature: the Hebrew lessons of Hard sounds (src/data/hardSounds/hebrew-*.json, mw-5r3p30.912), listed by 'Hard sounds of Hebrew
// (optional)' on the Goal screen while the Hebrew dial is above 0, and drawn by the same lesson screen as Greek's, in the Hebrew face and the Hebrew voice. The lessons are the ones shipped, read through
// the accessors the screen uses; the voice is the honest fake of tests/support/fake-speech.ts and a step learns which word was said from what the voice was handed, as a listener does.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { setLanguages } from '../../src/data/repositories';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/random';
import { clearBus } from '../../src/events/bus';
import { lessonById, lessonsFor } from '../../src/hardSounds/lessons';
import { pairSeed } from '../../src/hardSounds/pairDrill';
import { forgetTrail } from '../../src/nav/lastRoute';
import { accentOf, chooseAccent, DEFAULT_ACCENT } from '../../src/speech/accents';
import { stopSpeaking } from '../../src/speech/greek';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { SOUND_IDS } from '../../src/speech/sounds';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';

const user = userEvent.setup();
const SECTION = 'Hard sounds of Hebrew (optional)';
const DIALS: Record<string, string> = { 'Just English': '0', Curious: '1', Learning: '3' };

let synth: FakeSynth;

afterAll(async () => {
  cleanup();
  await usageWritesSettled();
  stopSpeaking();
  chooseAccent(DEFAULT_ACCENT);
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app on the Goal screen with every store emptied, his Hebrew dial at `dial` and `accent` chosen. */
async function open(dial: string, accent = DEFAULT_ACCENT): Promise<void> {
  cleanup();
  stopSpeaking();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]);
  stubChapterFetch();
  localStorage.clear();
  pairSeed.next = mulberry32(11);
  chooseAccent(accent);
  window.history.replaceState(null, '', '/#/goal');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await db.settings.put({ key: 'hebrewInterest', value: DIALS[dial] });
  if (accent !== DEFAULT_ACCENT) await db.settings.put({ key: 'englishAccent', value: accent });
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Goal', level: 1 });
}

/** Opens the app on the Goal of a reader of Hebrew only, his Hebrew dial at `dial`, with every store emptied. */
async function openHebrewGoal(dial: string): Promise<void> {
  await open(dial);
  cleanup();
  await setLanguages('hebrew');
  render(<App />);
  await screen.findByTestId('hebrew-ideas');
}

/** The sheet of a Hebrew letter, from the Hebrew ideas list. */
async function opensHebrewLetterSheet(title: string): Promise<void> {
  const row = within(await screen.findByTestId('hebrew-ideas')).getByText(title).closest('li') as HTMLElement;
  await user.click(within(row).getByRole('button'));
  await screen.findByRole('dialog', { name: 'Idea' });
}
const letterSheet = () => screen.getByRole('dialog', { name: 'Idea' });

const hebrewSection = () => screen.findByRole('region', { name: SECTION });
const lesson = () => screen.findByTestId('sound-lesson');
const ipaIn = (text: string): string[] => [...(text.match(/[ɣʝðɛɔʃːçŋɾɡʁ]/gu) ?? []), ...SOUND_IDS.filter((id) => text.includes(id))];

/** A section's rows, as 'title|Done' or 'title|Not yet'. */
const rowsOf = (section: HTMLElement): string[] =>
  within(within(section).getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => `${li.querySelector('[data-title]')?.textContent}|${li.querySelector('[data-done]')?.textContent}`);

async function opensLesson(title: string): Promise<void> {
  await user.click(within(await hebrewSection()).getByRole('button', { name: new RegExp(`^${title}`) }));
  await lesson();
}

const heading = (): string => screen.getByRole('heading', { level: 2 }).textContent ?? '';

async function goesToStep(name: string): Promise<void> {
  while (heading() !== name) await user.click(within(await lesson()).getByRole('button', { name: 'Next' }));
}

async function stepsToEnd(): Promise<string[]> {
  const seen: string[] = [];
  for (;;) {
    seen.push(heading());
    const next = within(await lesson()).queryByRole('button', { name: 'Next' });
    if (!next) return seen;
    await user.click(next);
  }
}

const american = lessonsFor('israeli', accentOf('american'));
const british = lessonsFor('israeli', accentOf('british'));
const stepWords = (id: string, kind: string): string[] => {
  const step = lessonById(id)!.steps.find((s) => s.kind === kind);
  return step && 'words' in step ? step.words : [];
};

const feature = await loadFeature('features/hebrew-hard-sounds.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  Scenario('The Goal lists the Hebrew hard sounds for his accent and opens one', ({ Given, Then, And, When }) => {
    let seen: string[] = [];
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', (_, dial: string) => open(dial));
    Then('the Goal screen has a {string} section below {string}', async (_, name: string, path: string) => {
      const found = await hebrewSection();
      expect(within(found).getByRole('heading', { name })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: path }).compareDocumentPosition(found) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    And('it lists every Hebrew lesson written for an American ear, each {string}', async (_, state: string) => {
      expect(american.map((l) => l.id)).toEqual(['hebrew-het', 'hebrew-ayin', 'hebrew-resh', 'hebrew-tsade'].sort((a, b) => lessonById(a)!.title.localeCompare(lessonById(b)!.title)));
      expect(rowsOf(await hebrewSection())).toEqual(american.map((l) => `${l.title}|${state}`));
    });
    And('the Greek {string} section lists none of them', (_, name: string) => {
      const greek = screen.queryByRole('region', { name });
      const rows = greek ? rowsOf(greek) : [];
      for (const l of american) expect(rows.join('\n')).not.toContain(l.title);
    });
    When('he opens the lesson {string} from the Hebrew section', (_, title: string) => opensLesson(title));
    Then('the lesson shows {string} and the heading {string}', async (_, step: string, head: string) => {
      expect(screen.getByTestId('sound-step')).toHaveTextContent(step);
      expect(heading()).toBe(head);
    });
    And('the lesson shows no IPA', async () => {
      expect(ipaIn((await lesson()).textContent ?? '')).toEqual([]);
    });
    When('he taps {string} until the last step', async () => {
      seen = await stepsToEnd();
    });
    Then('each step showed its heading in turn: {string}, {string}, {string}, {string}', (_, ...rest: string[]) => {
      expect(seen).toEqual(['Why it is hard for you', ...rest]);
    });
  });

  Scenario('The Hebrew section is for a reader of Hebrew', ({ Given, Then }) => {
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', (_, dial: string) => open(dial));
    Then('the Goal screen has no {string} section', (_, name: string) => {
      expect(screen.queryByRole('region', { name })).toBeNull();
    });
  });

  Scenario('A British ear gets the Hebrew lessons written for it', ({ Given, Then }) => {
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string} and the accent {string}', (_, dial: string, accent: string) => open(dial, accent));
    Then('it lists every Hebrew lesson written for a British ear, each {string}', async (_, state: string) => {
      expect(british.length).toBeGreaterThan(0);
      expect(rowsOf(await hebrewSection())).toEqual(british.map((l) => `${l.title}|${state}`));
    });
  });

  Scenario('A Hebrew word in a lesson is drawn right to left and said in the Hebrew voice', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', (_, dial: string) => open(dial));
    When('he opens the lesson {string} from the Hebrew section', (_, title: string) => opensLesson(title));
    And('he goes on to the step {string}', (_, name: string) => goesToStep(name));
    Then('every word is drawn right to left in Hebrew', async () => {
      const words = stepWords('hebrew-resh', 'hear');
      const drawn = Array.from((await lesson()).querySelectorAll('.hebrew-choice[lang="he"][dir="rtl"]')).map((e) => e.textContent?.normalize('NFC'));
      expect(drawn).toEqual(words.map((w) => w.normalize('NFC')));
      // the sound's letter is marked in each, with its points
      expect((await lesson()).querySelectorAll('mark').length).toBeGreaterThanOrEqual(words.length);
    });
    When('he taps {string} on the first word', async (_, name: string) => {
      await user.click(within(await lesson()).getByRole('button', { name: `${name} ${stepWords('hebrew-resh', 'hear')[0]}` }));
    });
    Then('the Hebrew voice is handed that word', async () => {
      await waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain(stepWords('hebrew-resh', 'hear')[0]));
      const said = synth.spoken[synth.spoken.length - 1];
      expect(said.lang).toBe('he-IL');
      expect(said.voice?.name).toBe(HEBREW_VOICE.name);
    });
  });

  Scenario('The pair drill says a Hebrew word and asks which of the pair it was', ({ Given, When, Then, And }) => {
    const pairs = (): [string, string][] => (lessonById('hebrew-tsade')!.steps.find((s) => s.kind === 'contrast') as { pairs: [string, string][] }).pairs;
    const wordSaid = async (): Promise<string> => {
      await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
      const text = synth.spoken[synth.spoken.length - 1].text;
      const word = pairs().flat().find((w) => w === text);
      expect(word, `the voice was handed ${text}`).toBeDefined();
      return word!;
    };
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', (_, dial: string) => open(dial));
    When('he opens the lesson {string} from the Hebrew section', (_, title: string) => opensLesson(title));
    And('he goes on to the step {string}', (_, name: string) => goesToStep(name));
    And('he taps {string}', async (_, name: string) => {
      await user.click(within(await lesson()).getByRole('button', { name }));
    });
    Then('the Hebrew voice is handed the word of the first round', async () => {
      await screen.findByTestId('pair-round');
      await wordSaid();
      expect(synth.spoken[synth.spoken.length - 1].lang).toBe('he-IL');
    });
    And('he chooses the word that was said and it says {string}', async (_, says: string) => {
      const round = await screen.findByTestId('pair-round');
      const said = await wordSaid();
      // the choices are drawn right to left in Hebrew
      for (const b of within(round).getAllByRole('button').filter((b) => b.getAttribute('aria-label')?.startsWith('Choose '))) {
        expect(b.getAttribute('lang')).toBe('he');
        expect(b.getAttribute('dir')).toBe('rtl');
      }
      await user.click(within(round).getByRole('button', { name: `Choose ${said}` }));
      expect(await within(round).findByRole('status')).toHaveTextContent(says);
    });
    When('he goes through the rounds to {string}', async (_, last: string) => {
      for (let i = 0; i < 10; i++) {
        if (i > 0) {
          const said = await wordSaid();
          await user.click(within(await screen.findByTestId('pair-round')).getByRole('button', { name: `Choose ${said}` }));
        }
        const before = synth.spoken.length;
        await user.click(within(await lesson()).getByRole('button', { name: i === 9 ? last : 'Next round' }));
        if (i < 9) await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(before));
      }
    });
    Then('the score shows {string}', async (_, score: string) => {
      expect(within(await screen.findByTestId('pair-score')).getByRole('status')).toHaveTextContent(score);
    });
  });

  Scenario('Done marks a Hebrew lesson Done', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', (_, dial: string) => open(dial));
    When('he opens the lesson {string} from the Hebrew section', (_, title: string) => opensLesson(title));
    And('he goes on to the end and taps {string}', async (_, name: string) => {
      await stepsToEnd();
      await user.click(within(await lesson()).getByRole('button', { name }));
    });
    Then('the Goal screen shows again', async () => {
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
      expect(screen.queryByTestId('sound-lesson')).toBeNull();
    });
    And('the Hebrew lesson {string} is {string} in the section', async (_, title: string, state: string) => {
      await waitFor(async () => expect(rowsOf(await hebrewSection())).toContain(`${title}|${state}`));
    });
  });

  const givenHebrewGoal = (Given: (text: string, fn: (...args: string[]) => Promise<void>) => void) =>
    Given('Hebrew is the only language chosen, his Hebrew dial is at {string} and the Goal screen is open', (_, dial: string) => openHebrewGoal(dial));
  const sheetShows = (Then: (text: string, fn: (...args: string[]) => void) => void) =>
    Then('the sheet shows {string}', (_, name: string) => {
      expect(within(letterSheet()).getByRole('button', { name })).toBeInTheDocument();
    });
  const tapsOnSheet = (When: (text: string, fn: (...args: string[]) => Promise<void>) => void) =>
    When('he taps {string} on the sheet', async (_, name: string) => {
      await user.click(within(letterSheet()).getByRole('button', { name }));
    });
  const lessonShows = (Then: (text: string, fn: (...args: string[]) => Promise<void>) => void) =>
    Then('the Hebrew lesson {string} shows {string}', async (_, title: string, step: string) => {
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByTestId('sound-step')).toHaveTextContent(step);
    });

  Scenario('A Hebrew letter sheet links to its lesson, and Back returns to the sheet', ({ Given, When, Then }) => {
    givenHebrewGoal(Given);
    When('he opens the sheet of the Hebrew letter {string}', (_, title: string) => opensHebrewLetterSheet(title));
    sheetShows(Then);
    tapsOnSheet(When);
    lessonShows(Then);
    When('he goes Back', () => window.history.back());
    Then('the sheet {string} is on screen over the Goal screen', async (_, title: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Idea' });
      expect(within(sheet).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/goal');
    });
  });

  ScenarioOutline('The letter sheets of het, resh and tsade open their lessons', ({ Given, When, Then, And }, row) => {
    givenHebrewGoal(Given);
    When('he opens the sheet of the Hebrew letter <letter>', () => opensHebrewLetterSheet(row.letter));
    And('he taps <link> on the sheet', async () => {
      await user.click(await within(letterSheet()).findByRole('button', { name: row.link }));
    });
    Then('the Hebrew lesson <lesson> shows "Step 1 of 5"', async () => {
      expect(await screen.findByRole('heading', { level: 1, name: row.lesson })).toBeInTheDocument();
      expect(screen.getByTestId('sound-step')).toHaveTextContent('Step 1 of 5');
    });
  });

  Scenario('A Hebrew letter sheet with no lesson has no link', ({ Given, When, Then, And }) => {
    givenHebrewGoal(Given);
    When('he opens the sheet of the Hebrew letter {string}', (_, title: string) => opensHebrewLetterSheet(title));
    Then('the sheet does not show {string}', (_, name: string) => {
      expect(within(letterSheet()).queryByRole('button', { name })).toBeNull();
    });
    And('the sheet shows no link to a lesson', () => {
      expect(letterSheet().querySelectorAll('[data-sound-lesson]')).toHaveLength(0);
    });
  });
});
