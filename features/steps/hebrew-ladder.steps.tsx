// features/steps/hebrew-ladder.steps.tsx — runs features/hebrew-ladder.feature: the Goal and Placement screens on the ladder of the language in hand (the one chosen language,
// or the Greek | Hebrew segment with both chosen), the Hebrew alphabet idea taught and marked known on the Goal, the placement at the Hebrew foundation, the Goal link in
// Settings' Learning group and the Goal at English only. Languages are chosen the way Settings chooses them (setLanguages moves the two dials).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { loadChapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { HEBREW_LADDER, HEBREW_PASSAGE_LESSONS } from '../../src/data/grammar/hebrew/ladder';
import { buildHebrewCheck } from '../../src/data/grammar/hebrew/passageCheck';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { IDEA_KIND } from '../../src/data/grammar/ladder';
import { ideaOfAny as ideaOf } from '../../src/data/grammar/ladders';
import { setGreekInterest, setHebrewInterest, setLanguages } from '../../src/data/repositories';
import { setGoal } from '../../src/data/repositories/settings';
import type { Languages } from '../../src/settings/definitions/interest';
import { clearBus } from '../../src/events/bus';
import { IdeaSheet } from '../../src/IdeaSheet';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { SettingsScreen } from '../../src/SettingsScreen';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, HEBREW_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';

const realSeed = drillSeed.next;
afterAll(async () => {
  cleanup();
  await usageWritesSettled();
  stopReading();
  clearBus();
  drillSeed.next = realSeed;
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();

// Change and the Goal's other links scroll to a section; jsdom has no layout to scroll
Element.prototype.scrollIntoView = () => {};

/** Empties every store and chooses the languages, as Settings' row 'Which languages?' does. */
async function fresh(languages: Languages, goal?: string, learning = false): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.passageLessons.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await setLanguages(languages);
  // the Learning group of Settings is drawn from step 3 (Learning) of a dial
  if (learning && (languages === 'greek' || languages === 'both')) await setGreekInterest(3);
  if (learning && (languages === 'hebrew' || languages === 'both')) await setHebrewInterest(3);
  if (goal !== undefined) await setGoal(goal);
}

async function openGoal(): Promise<void> {
  window.history.replaceState(null, '', '/#/goal');
  await seedHisWords();
  render(<App />);
}

async function openSettingsLearning(): Promise<void> {
  cleanup();
  window.location.hash = '#/settings?group=greek';
  render(<SettingsScreen />);
  await screen.findByRole('heading', { name: 'Learning' });
}

const ideasList = () => screen.findByTestId('hebrew-ideas');
const hebrewRow = async (title: string) => within(await ideasList()).getByText(title).closest('li') as HTMLElement;
const sheet = () => screen.findByRole('dialog', { name: 'Idea' });
const segment = () => screen.findByTestId('source-segment');

const feature = await loadFeature('features/hebrew-ladder.feature');

describeFeature(feature, ({ Scenario }) => {
  const goalIs = async (title: string) => expect(await screen.findByTestId('goal-title')).toHaveTextContent(title);
  const noHebrewIdea = () => {
    expect(screen.queryByText('The Hebrew alphabet')).toBeNull();
    expect(screen.queryByTestId('hebrew-ideas')).toBeNull();
  };

  Scenario('With Hebrew chosen the Goal shows the Hebrew alphabet', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', async () => {
      await fresh('hebrew');
      await openGoal();
    });
    Then('the Goal lists {string} as Not yet', async (_, title: string) => {
      const row = await hebrewRow(title);
      expect(row).toHaveAttribute('data-level', 'notYet');
      expect(row).toHaveTextContent('Not yet');
    });
    And('no Greek idea or Greek goal is on the screen', () => {
      expect(screen.queryByText('The Greek alphabet')).toBeNull();
      expect(screen.queryByTestId('words-bar')).toBeNull();
      expect(screen.queryByText('No goal yet')).toBeNull();
    });
    And('the screen has no Greek and Hebrew segment', () => {
      expect(screen.queryByTestId('source-segment')).toBeNull();
    });
    When('he opens {string} and marks it known without a drill', async (_, title: string) => {
      await user.click(within(await hebrewRow(title)).getByRole('button'));
      const dialog = await sheet();
      await user.click(await within(dialog).findByRole('button', { name: 'Mark known without a drill' }));
    });
    Then('the Goal lists {string} as Solid', async (_, title: string) => {
      await waitFor(async () => expect(await hebrewRow(title)).toHaveAttribute('data-level', 'solid'));
    });
    And('{string} has the level solid and a review row', async (_, id: string) => {
      expect((await db.grammarLevels.get(id))?.level).toBe('solid');
      expect(await db.reviews.get(['grammar', id])).toBeDefined();
    });
  });

  Scenario('The Hebrew alphabet is taught from its sheet in Hebrew type', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', async () => {
      await fresh('hebrew');
      await openGoal();
    });
    When('he opens {string}', async (_, title: string) => {
      await user.click(within(await hebrewRow(title)).getByRole('button'));
    });
    Then('the sheet teaches it with the Hebrew shown right to left in lang he', async () => {
      const dialog = await sheet();
      expect(await within(dialog).findByTestId('idea-what')).toHaveTextContent('Hebrew has 22 letters');
      const worked = within(dialog).getByTestId('worked-word');
      expect(worked).toHaveAttribute('lang', 'he');
      expect(worked).toHaveAttribute('dir', 'rtl');
      expect(worked).toHaveClass('script-he');
      expect(dialog.querySelector('[data-testid="idea-spot"] [lang="he"][dir="rtl"]')).not.toBeNull();
    });
    And('the sheet offers no Drill it', async () => {
      expect(within(await sheet()).queryByRole('button', { name: 'Drill it' })).toBeNull();
    });
  });

  Scenario('Placement on the Hebrew ladder places at its foundation', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', async () => {
      await fresh('hebrew');
      await openGoal();
    });
    When('he taps Place me and then Start from the letters', async () => {
      await user.click(await screen.findByRole('button', { name: 'Place me' }));
      await user.click(await screen.findByRole('button', { name: 'Start from the letters' }));
    });
    Then('the placement says {string}', async (_, text: string) => {
      expect(await screen.findByTestId('where')).toHaveTextContent(text);
    });
    And('it says Learn next on the Goal screen opens {string}', async (_, title: string) => {
      expect(await screen.findByTestId('from-letters')).toHaveTextContent(`Learn next on the Goal screen opens ${title}.`);
    });
  });

  Scenario('With both chosen the segment switches ladders and the Greek one is as before', ({ Given, When, Then, And }) => {
    Given('both languages are chosen, the goal is {string} and the Goal screen is open', async (_, goal: string) => {
      await fresh('both', goal.replace(/^Read /, ''));
      await openGoal();
    });
    Then('the segment has Greek pressed and the Goal is {string}', async (_, title: string) => {
      expect(within(await segment()).getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'true');
      await goalIs(title);
    });
    When('he taps {string} on the segment', async (_, name: string) => {
      await user.click(within(await segment()).getByRole('button', { name }));
    });
    Then('the Goal lists {string} as Not yet', async (_, title: string) => {
      expect(await hebrewRow(title)).toHaveAttribute('data-level', 'notYet');
    });
    And('the Goal shows no Greek goal', () => {
      expect(screen.queryByText('Read 1 John 1:1')).toBeNull();
      expect(screen.queryByTestId('words-bar')).toBeNull();
    });
    When('he goes back to {string} on the segment', async (_, name: string) => {
      await user.click(within(await segment()).getByRole('button', { name }));
    });
    Then('the Goal is {string} again with Words and Grammar ideas bars', async (_, title: string) => {
      await goalIs(title);
      await screen.findByTestId('words-bar');
      await screen.findByTestId('ideas-bar');
    });
    And('no Hebrew idea is on the screen', () => noHebrewIdea());
  });

  Scenario('With Greek only no Hebrew idea is anywhere', ({ Given, When, Then, And }) => {
    Given('Greek is the only language chosen, the goal is {string} and the Goal screen is open', async (_, goal: string) => {
      await fresh('greek', goal.replace(/^Read /, ''));
      await openGoal();
    });
    Then('the Goal is {string} with Words and Grammar ideas bars', async (_, title: string) => {
      await goalIs(title);
      await screen.findByTestId('words-bar');
      await screen.findByTestId('ideas-bar');
    });
    And('no Hebrew idea is on the screen', () => noHebrewIdea());
    And('the screen has no Greek and Hebrew segment', () => {
      expect(screen.queryByTestId('source-segment')).toBeNull();
    });
    When('he opens the Grammar ideas list', async () => {
      await user.click(await screen.findByTestId('ideas-bar'));
    });
    Then('the list has {string} and no Hebrew idea', async (_, title: string) => {
      const list = await screen.findByTestId('ideas-list');
      expect(within(list).getAllByText(title).length).toBeGreaterThan(0);
      expect(within(list).queryByText(/Hebrew/)).toBeNull();
    });
  });

  Scenario('The Goal link is in the Learning group of either language at Learning and of neither at English only', ({ Given, When, Then }) => {
    Given('Hebrew is the only language chosen', async () => {
      await fresh('hebrew', undefined, true);
    });
    Then('the Learning group of Settings has a Goal link', async () => {
      await openSettingsLearning();
      expect(await screen.findByRole('button', { name: 'Goal' })).toBeInTheDocument();
    });
    When('Greek is the only language chosen', async () => {
      await fresh('greek', undefined, true);
    });
    Then('the Learning group of Settings still has a Goal link', async () => {
      await openSettingsLearning();
      expect(await screen.findByRole('button', { name: 'Goal' })).toBeInTheDocument();
    });
    When('English only is chosen', async () => {
      await fresh('english');
    });
    Then('the Learning group of Settings has no Goal link', async () => {
      await openSettingsLearning();
      await screen.findByRole('heading', { name: 'Learning' });
      expect(screen.queryByRole('button', { name: 'Goal' })).toBeNull();
    });
  });

  Scenario('At English only the Goal screen has no ladder', ({ Given, Then }) => {
    Given('English only is chosen and the Goal screen is open', async () => {
      await fresh('english');
      await openGoal();
    });
    Then('the Goal says {string} and lists no idea', async (_, text: string) => {
      expect(await screen.findByText(text)).toBeInTheDocument();
      expect(screen.queryByTestId('hebrew-ideas')).toBeNull();
      expect(screen.queryByTestId('ideas-bar')).toBeNull();
    });
  });

  // ---- the Hebrew passage lesson and Read lessons to me (use case 'lessons', mw-5r3p30.911) ----
  const LESSON = HEBREW_PASSAGE_LESSONS[0];
  const CHECK_SEED = 1;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
  const checkSheet = () => screen.getByRole('dialog', { name: 'Check' });
  let expected: GrammarQuestion[] = [];
  let asked = 0;

  /** Hebrew only, every idea of its ladder solid (so the lesson is the next thing), and the Check's questions fixed. */
  const solidHebrew = async () => {
    await fresh('hebrew');
    drillSeed.next = () => CHECK_SEED;
    await db.grammarLevels.bulkPut(HEBREW_LADDER.map((i) => ({ id: i.id, level: 'solid' as const, since: Date.now(), how: 'marked' as const })));
  };
  const opensGoalScreen = async () => {
    cleanup();
    clearBus();
    forgetTrail();
    await openGoal();
  };
  const optionIn = async (dialog: HTMLElement, text: string): Promise<HTMLElement> => {
    let found: HTMLElement | undefined;
    await waitFor(() => {
      found = Array.from(dialog.querySelectorAll<HTMLElement>('[data-option]')).find((o) => o.textContent === text && !(o as HTMLButtonElement).disabled);
      expect(found, `option ${text}`).toBeDefined();
    });
    return found as HTMLElement;
  };
  /** Answers the question on screen right, or wrong, and moves on. */
  async function answer(right: boolean): Promise<void> {
    const question = expected[asked];
    const dialog = checkSheet();
    await user.click(await optionIn(dialog, right ? question.right : (question.options.find((o) => o !== question.right) as string)));
    asked += 1;
    await user.click(await within(dialog).findByTestId('check-next'));
  }
  const openSheet = async () => {
    expected = buildHebrewCheck(await loadChapter('jon', 1), LESSON.passage!.from, LESSON.passage!.to, LESSON.ideas, mulberry32(CHECK_SEED));
    asked = 0;
    await screen.findByRole('dialog', { name: 'Check' });
  };
  const tapsInStrip = async (_: unknown, name: string) => {
    await user.click(await within(await screen.findByRole('region', { name: 'Verse view' })).findByRole('button', { name, exact: true }));
  };
  const opensHebrewView = async () => {
    cleanup();
    clearBus();
    forgetTrail();
    window.history.replaceState(null, '', '/#/?b=jon&c=1&view=greek&p=1&pt=3');
    await seedHisWords();
    render(<App />);
    await screen.findByRole('region', { name: 'Verse view' });
  };

  Scenario('A Hebrew passage lesson opens its verses in Hebrew and Check passes it by reading', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and every Hebrew idea is solid', solidHebrew);
    When('he opens the Goal screen', opensGoalScreen);
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
    When('he taps Learn next', async () => {
      await user.click(await screen.findByTestId('learn-next'));
    });
    Then('the Verse view is open, headed {string}', async (_, heading: string) => {
      await screen.findByRole('region', { name: 'Verse view' });
      expect(within(viewEl()).getByRole('heading', { name: heading, level: 2 })).toBeInTheDocument();
    });
    And('the Verse view shows verses 1 to 3 of Jonah 1 and no other, in Hebrew', async () => {
      const verses = Array.from(viewEl().querySelectorAll('[data-passage-verse]'));
      expect(verses.map((el) => el.getAttribute('data-passage-verse'))).toEqual(['1', '2', '3']);
      await waitFor(() => expect(viewEl().textContent).toMatch(/[\u0590-\u05ff]/));
      expect(viewEl().textContent).not.toMatch(/[\u0370-\u03ff]/);
    });
    And("the Lesson strip names the lesson's ideas as chips and offers {string}", (_, name: string) => {
      const strip = within(viewEl()).getByRole('region', { name: 'Lesson strip' });
      expect(strip).toHaveTextContent(LESSON.title);
      const chips = Array.from(strip.querySelectorAll<HTMLElement>('[data-idea]'));
      expect(chips.map((c) => c.getAttribute('data-idea'))).toEqual(LESSON.ideas);
      expect(chips.map((c) => c.textContent)).toEqual(LESSON.ideas.map((id) => ideaOf(id).title));
      expect(within(strip).getByRole('button', { name })).toBeInTheDocument();
    });
    And('no lesson is marked read or passed', async () => {
      expect(await db.passageLessons.count()).toBe(0);
    });
    When('he taps {string} in the Lesson strip', tapsInStrip);
    Then('the sheet {string} asks a tap-the-word question on each verse', async (_, title: string) => {
      await openSheet();
      expect(await within(checkSheet()).findByTestId('check-title')).toHaveTextContent(title);
      expect(await within(checkSheet()).findByTestId('check-step')).toHaveTextContent(`Question 1 of ${expected.length}`);
      expect(expected.length).toBeGreaterThanOrEqual(3);
      for (const verse of [1, 2, 3]) expect(expected.some((q) => q.ref === `Jonah 1:${verse}` && q.kind === 'tap-form' && q.lang === 'hbo'), `verse ${verse}`).toBe(true);
    });
    When('he answers all of them right but the last', async () => {
      for (let i = 0; i < expected.length - 1; i += 1) await answer(true);
      await answer(false);
    });
    Then('the end card says it is passed', async () => {
      expect(await within(checkSheet()).findByRole('heading', { name: `Passed: ${expected.length - 1} of ${expected.length}` })).toBeInTheDocument();
    });
    And('the lesson {string} is passed in the table', async () => {
      await waitFor(async () => expect(await db.passageLessons.get('passage:jon.1.1-3')).toMatchObject({ state: 'passed', score: (expected.length - 1) / expected.length }));
    });
    And('each idea asked has a review recorded', async () => {
      const ideas = [...new Set(expected.map((q) => q.ideaId))];
      expect(ideas.length).toBeGreaterThan(0);
      for (const id of ideas) expect(await db.reviews.get([IDEA_KIND, id]), id).toBeDefined();
    });
    When('he opens the Goal screen again', opensGoalScreen);
    Then('the Goal is learning the idea he missed and offers no lesson to read', async () => {
      // the one question he missed puts its idea back at the frontier (Learning now), so the Goal has no Learn next at all
      expect(await screen.findByTestId('learning-now')).toBeInTheDocument();
      expect(screen.queryByTestId('learn-next')).toBeNull();
      expect(document.body.textContent).not.toContain('Read Jonah');
    });
  });

  Scenario('A Hebrew passage lesson missed stays read and the Goal still offers it', ({ Given, And, When, Then }) => {
    Given('Hebrew is the only language chosen and every Hebrew idea is solid', solidHebrew);
    And('the Verse view is open on the Hebrew lesson {string}', opensHebrewView);
    When('he taps {string} in the Lesson strip', tapsInStrip);
    And('he answers every question wrong', async () => {
      await openSheet();
      for (let i = 0; i < expected.length; i += 1) await answer(false);
    });
    Then('the end card says it is read, not passed', async () => {
      expect(await within(checkSheet()).findByRole('heading', { name: `Read: 0 of ${expected.length}` })).toBeInTheDocument();
      await sleep(50);
    });
    And('the lesson {string} is read in the table', async () => {
      await waitFor(async () => expect(await db.passageLessons.get('passage:jon.1.1-3')).toMatchObject({ state: 'read', score: null }));
    });
    When('he opens the Goal screen', opensGoalScreen);
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
  });

  // Read lessons to me: a Hebrew idea sheet is read by the shared Read aloud, Hebrew in the Hebrew voice
  let synth: FakeSynth | undefined;
  const engine = (): FakeSynth => {
    if (!synth) throw new Error('the phone has no speech engine');
    return synth;
  };
  const spokenIn = (lang: string): string[] => engine().spoken.filter((s) => s.lang === lang).map((s) => s.text);
  const speaker = (name: string): HTMLElement => screen.getByRole('button', { name, exact: true });
  const hebrewPhone = async () => {
    cleanup();
    stopReading();
    clearBus();
    forgetTrail();
    vi.unstubAllGlobals();
    localStorage.clear();
    localStorage.setItem('lampas.welcome', 'done');
    window.history.replaceState(null, '', '/');
    stubChapterFetch();
    await db.open();
    await Promise.all([db.settings.clear(), db.grammarLevels.clear(), db.reviews.clear(), db.words.clear()]);
    synth = stubSpeech([ENGLISH_VOICE, HEBREW_VOICE]);
  };
  const readLessons = (value: 'on' | 'off') => () => db.settings.put({ key: 'readLessons', value });
  const opensIdeaSheet = (_: unknown, id: string) => {
    render(<IdeaSheet idea={ideaOf(id)} onClose={() => undefined} onWord={() => undefined} />);
  };

  Scenario('With Read lessons to me On a Hebrew idea sheet reads itself, Hebrew in the Hebrew voice', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Hebrew voice', hebrewPhone);
    And('Read lessons to me is On', readLessons('on'));
    When('the idea sheet of {string} is opened', opensIdeaSheet);
    Then('the phone speaks the title {string} in {string}', async (_, title: string, lang: string) => {
      await waitFor(() => expect(spokenIn(lang)[0]).toContain(title));
    });
    And('the phone speaks some Hebrew in {string}', async (_, lang: string) => {
      await waitFor(() => expect(spokenIn(lang).length).toBeGreaterThan(0));
    });
    And('the text of the lesson is still on screen', () => {
      expect(screen.getByTestId('idea-what')).toBeVisible();
      expect(screen.getByTestId('idea-spot')).toBeVisible();
    });
    And('the speaker is named Stop reading', () => {
      expect(speaker('Stop reading')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  Scenario('With Read lessons to me Off a Hebrew idea sheet stays silent until the speaker is tapped', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Hebrew voice', hebrewPhone);
    And('Read lessons to me is Off', readLessons('off'));
    When('the idea sheet of {string} is opened', opensIdeaSheet);
    Then('the phone has spoken nothing', async () => {
      await screen.findByTestId('idea-what');
      await act(async () => {
        await sleep(100);
      });
      expect(engine().spoken).toEqual([]);
    });
    When('he taps Read aloud', () => user.click(speaker('Read aloud')));
    Then('the phone speaks the title {string} in {string}', async (_, title: string, lang: string) => {
      await waitFor(() => expect(spokenIn(lang)[0]).toContain(title));
    });
  });
});
