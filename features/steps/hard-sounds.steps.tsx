// features/steps/hard-sounds.steps.tsx — runs features/hard-sounds.feature: the optional section 'Hard sounds (optional)' on the Goal screen, the lesson screen
// (src/hardSounds/, #/sounds) and the letter sheet's 'Learn to say it (optional)'. The lessons are the ones shipped (src/data/hardSounds/*.json), read through the
// same accessors the screen uses. The Greek voice is the honest fake of tests/support/fake-speech.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext } from '../../src/gate/licenceContext';
import { lessonsFor, saidFor } from '../../src/hardSounds/lessons';
import { forgetTrail } from '../../src/nav/lastRoute';
import { accentOf, chooseAccent, DEFAULT_ACCENT } from '../../src/speech/accents';
import { stopSpeaking } from '../../src/speech/greek';
import { SOUND_IDS } from '../../src/speech/sounds';
import { getVerseAction } from '../../src/verse/action';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';
import { asSpoken } from '../../tests/support/spoken-word';

const user = userEvent.setup();
const SECTION = 'Hard sounds (optional)';
const HEADINGS = ['Why it is hard for you', 'Start from a sound you know', 'Hear it', 'Tell them apart', 'Try it', 'Read a verse'];

let synth: FakeSynth;

afterAll(() => {
  cleanup();
  stopSpeaking();
  chooseAccent(DEFAULT_ACCENT);
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app on the Goal screen with every store emptied, `goal` saved when there is one, `accent` chosen and, with `licensed` false, no licence. */
async function open({ goal, accent, licensed = true }: { goal?: string; accent?: string; licensed?: boolean } = {}): Promise<void> {
  cleanup();
  stopSpeaking();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubChapterFetch();
  localStorage.clear();
  chooseAccent(accent ?? DEFAULT_ACCENT);
  window.history.replaceState(null, '', '/#/goal');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  if (goal !== undefined) await db.settings.put({ key: 'goal', value: goal });
  if (accent !== undefined) await db.settings.put({ key: 'englishAccent', value: accent });
  await seedHisWords();
  const app = <App />;
  render(
    licensed ? (
      app
    ) : (
      <LicenceContext.Provider value={{ licence: 'not-licensed', locked: null, publicKeyHex: '', checkAgain: () => undefined }}>{app}</LicenceContext.Provider>
    ),
  );
  await screen.findByRole('heading', { name: 'Goal', level: 1 });
}

const section = () => screen.findByRole('region', { name: SECTION });
const lesson = () => screen.findByTestId('sound-lesson');
const ideaSheets = () => screen.queryAllByRole('dialog', { name: 'Idea' });
/** What IPA writes: its own characters, and a sound's slashed id. */
const ipaIn = (text: string): string[] => [...(text.match(/[ɣʝðɛɔʃːçŋɾɡ]/gu) ?? []), ...SOUND_IDS.filter((id) => text.includes(id))];

/** The section's rows, as 'title|Done' or 'title|Not yet'. */
async function rows(): Promise<string[]> {
  const list = within(await section()).getByRole('list');
  return within(list)
    .getAllByRole('listitem')
    .map((li) => `${li.querySelector('[data-title]')?.textContent}|${li.querySelector('[data-done]')?.textContent}`);
}

async function opensLesson(title: string): Promise<void> {
  await user.click(within(await section()).getByRole('button', { name: new RegExp(`^${title}`) }));
  await lesson();
}

async function stepsToEnd(): Promise<string[]> {
  const seen: string[] = [];
  for (;;) {
    seen.push(screen.getByRole('heading', { level: 2 }).textContent ?? '');
    const next = within(await lesson()).queryByRole('button', { name: 'Next' });
    if (!next) return seen;
    await user.click(next);
  }
}

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
const letterSheet = (): HTMLElement => ideaSheets()[ideaSheets().length - 1];

const american = lessonsFor('modern', accentOf('american'));
const british = lessonsFor('modern', accentOf('british'));
const tappedR = american.find((l) => l.id === 'tapped-r')!;

const feature = await loadFeature('features/hard-sounds.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The section lists the lessons for his accent, each Not yet, below the main path', ({ Given, Then, And }) => {
    Given('Lampas is opened on the Goal screen with the goal {string}', async (_, goal: string) => {
      await open({ goal });
      await screen.findByTestId('goal-title');
    });
    Then('the Goal screen has a {string} section below {string}', async (_, name: string, path: string) => {
      const found = await section();
      expect(within(found).getByRole('heading', { name })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: path }).compareDocumentPosition(found) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    And('it lists every lesson written for an American ear, each {string}', async (_, state: string) => {
      expect(american.length).toBeGreaterThan(0);
      expect(await rows()).toEqual(american.map((l) => `${l.title}|${state}`));
    });
    And('Learn next does not name a hard sound', () => {
      const next = screen.queryByTestId('learn-next')?.textContent ?? '';
      for (const l of american) expect(next).not.toContain(l.title);
    });
  });

  Scenario('A British ear gets the lessons written for it', ({ Given, Then }) => {
    Given('Lampas is opened on the Goal screen with no goal and the accent {string}', (_, accent: string) => open({ accent }));
    Then('it lists every lesson written for a British ear, each {string}', async (_, state: string) => {
      expect(await rows()).toEqual(british.map((l) => `${l.title}|${state}`));
    });
  });

  Scenario('He steps through a lesson, and Done marks it Done', ({ Given, When, Then, And }) => {
    let seen: string[] = [];
    Given('Lampas is opened on the Goal screen with no goal', () => open());
    When('he opens the lesson {string} from the section', (_, title: string) => opensLesson(title));
    Then('the lesson shows {string} and the heading {string}', async (_, step: string, heading: string) => {
      expect(screen.getByTestId('sound-step')).toHaveTextContent(step);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(heading);
    });
    And('the lesson says why in American words', async () => {
      expect((await lesson()).textContent).toContain(saidFor(tappedR.steps[0].text, accentOf('american')));
    });
    And('the lesson shows no IPA', async () => {
      expect(ipaIn((await lesson()).textContent ?? '')).toEqual([]);
    });
    When('he taps {string} until the last step', async () => {
      seen = await stepsToEnd();
    });
    Then('each step showed its heading in turn: {string}, {string}, {string}, {string}, {string}', (_, ...rest: string[]) => {
      expect(seen).toEqual([HEADINGS[0], ...rest]);
      expect(seen).toEqual(HEADINGS);
    });
    When('he goes back to {string} and taps {string}', async (_, heading: string, name: string) => {
      // by the lesson's own Back, a step at a time
      while (screen.getByRole('heading', { level: 2 }).textContent !== heading) await user.click(within(await lesson()).getByRole('button', { name: 'Previous' }));
      await user.click(within(await lesson()).getByRole('button', { name }));
    });
    Then('the Greek voice is handed {string}', async (_, word: string) => {
      await waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain(asSpoken(word)));
      expect(synth.spoken[synth.spoken.length - 1].lang).toBe('el-GR');
    });
    When('he goes on to the end and taps {string}', async (_, name: string) => {
      await stepsToEnd();
      await user.click(within(await lesson()).getByRole('button', { name }));
    });
    Then('the Goal screen shows again', async () => {
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
      expect(screen.queryByTestId('sound-lesson')).toBeNull();
    });
    And('the lesson {string} is {string} in the section', async (_, title: string, state: string) => {
      await waitFor(async () => expect(await rows()).toContain(`${title}|${state}`));
    });
  });

  Scenario('The verse step marks the sound\'s letters and opens the verse to read aloud', ({ Given, When, Then }) => {
    let hash = '';
    Given('Lampas is opened on the Goal screen with no goal', () => open());
    When('he opens the lesson {string} at its last step', async (_, title: string) => {
      await opensLesson(title);
      await stepsToEnd();
      hash = window.location.hash;
    });
    Then('the verse {string} shows with every ρ marked', async (_, reference: string) => {
      const verse = await screen.findByTestId('sound-verse');
      expect(within(await lesson()).getByText(reference)).toBeInTheDocument();
      await waitFor(() => expect(verse.textContent).toContain('μαρτυροῦμεν'));
      const marked = Array.from(verse.querySelectorAll('mark')).map((m) => m.textContent);
      expect(marked.length).toBe((verse.textContent?.match(/ρ/g) ?? []).length);
      expect(new Set(marked)).toEqual(new Set(['ρ']));
    });
    When('he taps {string} on the lesson', async (_, name: string) => {
      await user.click(within(await lesson()).getByRole('button', { name }));
    });
    Then('the Verse view opens on 1 John 1:2 in Greek with {string} chosen', async (_, action: string) => {
      await screen.findByRole('region', { name: 'Verse view' });
      expect(window.location.hash).toMatch(/b=1jn/);
      expect(window.location.hash).toMatch(/c=1\b/);
      expect(window.location.hash).toMatch(/v=2\b/);
      expect(window.location.hash).toMatch(/view=greek/);
      expect(action).toBe('Read it aloud');
      expect(getVerseAction()).toBe('read');
    });
    When('he goes Back', () => window.history.back());
    Then('the lesson shows its last step again', async () => {
      await lesson();
      expect(window.location.hash).toBe(hash);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Read a verse');
    });
  });

  Scenario('Without a licence the verse step opens the verse to hear', ({ Given, When, Then }) => {
    Given('Lampas is opened on the Goal screen with no goal and no licence', () => open({ licensed: false }));
    When('he opens the lesson {string} at its last step', async (_, title: string) => {
      await opensLesson(title);
      await stepsToEnd();
    });
    Then('the lesson offers {string} and not {string}', async (_, offered: string, not: string) => {
      expect(within(await lesson()).getByRole('button', { name: offered })).toBeInTheDocument();
      expect(within(await lesson()).queryByRole('button', { name: not })).toBeNull();
    });
    When('he taps {string} on the lesson', async (_, name: string) => {
      await user.click(within(await lesson()).getByRole('button', { name }));
    });
    Then('the Verse view opens on 1 John 1:2 in Greek with {string} chosen', async (_, action: string) => {
      await screen.findByRole('region', { name: 'Verse view' });
      expect(window.location.hash).toMatch(/b=1jn/);
      expect(window.location.hash).toMatch(/v=2\b/);
      expect(window.location.hash).toMatch(/view=greek/);
      expect(action).toBe('Listen');
      expect(getVerseAction()).toBe('listen');
    });
  });

  Scenario("The sound's IPA shows only when his accent is IPA", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Goal screen with no goal and the accent {string}', (_, accent: string) => open({ accent }));
    When('he opens the lesson {string} from the section', (_, title: string) => opensLesson(title));
    Then('the lesson shows the sound {string}', async (_, id: string) => {
      expect(within(await lesson()).getByTestId('sound-ipa')).toHaveTextContent(id);
    });
    And('the lesson says why in American words', async () => {
      expect((await lesson()).textContent).toContain(saidFor(tappedR.steps[0].text, accentOf('american')));
    });
  });

  Scenario('The Rho sheet links to the lesson, and Back returns to the sheet', ({ Given, When, Then }) => {
    Given('Lampas is opened on the Goal screen with the goal {string}', async (_, goal: string) => {
      await open({ goal });
      await screen.findByTestId('goal-title');
    });
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

  Scenario('A letter sheet with no lesson has no link', ({ Given, When, Then }) => {
    Given('Lampas is opened on the Goal screen with the goal {string}', async (_, goal: string) => {
      await open({ goal });
      await screen.findByTestId('goal-title');
    });
    When('he opens the letter sheet of {string} from the Goal screen', (_, name: string) => opensLetterSheet(name));
    Then('the sheet does not show {string}', (_, name: string) => {
      expect(within(letterSheet()).queryByRole('button', { name })).toBeNull();
    });
  });
});
