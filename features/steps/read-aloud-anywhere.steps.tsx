// features/steps/read-aloud-anywhere.steps.tsx — runs features/read-aloud-anywhere.feature: the one small ReadAloud speaker (src/speech/ReadAloud.tsx) on
// the Grammar sheet, the idea sheet, the new word's sheet, a tutor's kept answer and About's What's new, over the recording speech fake.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import type { ReactElement } from 'react';
import { AnswerCards } from '../../src/Ask';
import { loadChapter, type Chapter, type GreekWord } from '../../src/data/chapter';
import { conceptOf } from '../../src/data/grammar-concepts';
import { db } from '../../src/data/db';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { addAnswer, verseRef } from '../../src/data/repositories/answers';
import { clearBus } from '../../src/events/bus';
import { GrammarSheet } from '../../src/GrammarSheet';
import { IdeaSheet } from '../../src/IdeaSheet';
import { noVoiceHelp } from '../../src/speech/greek';
import { ReadAloud } from '../../src/speech/ReadAloud';
import { stopReading } from '../../src/speech/readAloud';
import { TeachSheet } from '../../src/TeachSheet';
import { WhatsNewSection } from '../../src/whatsNew/WhatsNewSection';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { fixtureChangelog, stubChangelog, RUNNING_NEW } from '../../tests/support/changelog';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

const feature = await loadFeature('features/read-aloud-anywhere.feature');
const user = userEvent.setup();

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario }) => {
  let synth: FakeSynth | undefined;

  BeforeEachScenario(async () => {
    cleanup();
    stopReading();
    clearBus();
    vi.unstubAllGlobals();
    synth = undefined;
    window.localStorage.clear();
    window.location.hash = '';
    stubChapterFetch();
    await db.open();
    await Promise.all([db.settings.clear(), db.grammarLevels.clear(), db.answers.clear(), db.reviews.clear(), db.words.clear()]);
  });
  AfterEachScenario(() => {
    act(() => stopReading());
    cleanup();
    vi.unstubAllGlobals();
  });
  afterAll(() => {
    cleanup();
    db.close();
  });

  const engine = (): FakeSynth => {
    if (!synth) throw new Error('the phone has no speech engine');
    return synth;
  };
  const spokenIn = (lang: string): string[] => engine().spoken.filter((s) => s.lang === lang).map((s) => s.text);
  const speaks = (text: string, lang: string): void => {
    expect(spokenIn(lang).some((said) => said.includes(text))).toBe(true);
  };

  const phone = (voices: Parameters<typeof stubSpeech>[0]) => () => {
    synth = stubSpeech(voices);
  };
  const withBoth = phone([ENGLISH_VOICE, GREEK_VOICE]);

  /** A one-word Chapter: enough for a Grammar sheet, which only looks for examples in it. */
  const emptyChapter: Chapter = { book: 'Romans', code: 'rom', chapter: 8, lex: {}, parse: {}, verses: [] };
  const aWord = { t: 'λόγος', l: 'λόγος' } as unknown as GreekWord;

  const openGrammarPlural = () => {
    render(<GrammarSheet chapter={emptyChapter} term="plural" word={aWord} known={false} onClose={() => undefined} onTerm={() => undefined} onWord={() => undefined} />);
  };
  const openIdea = (id: string) => {
    render(<IdeaSheet idea={ideaOf(id)} onClose={() => undefined} onWord={() => undefined} />);
  };
  const readAloud = (): HTMLElement => screen.getByRole('button', { name: 'Read aloud', exact: true });

  Scenario('The shared button reads its text, Greek in Greek, and a second tap stops it', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', withBoth);
    And('a Read aloud button for {string}', (_, text: string) => {
      render(<ReadAloud id="shared-test" text={text} />);
    });
    When('he taps Read aloud', () => user.click(readAloud()));
    Then('the phone speaks {string} in {string} and {string} in {string} and {string} in {string}', (_, a: string, la: string, b: string, lb: string, c: string, lc: string) => {
      expect(engine().spoken.map((s) => [s.text, s.lang])).toEqual([[a, la], [b, lb], [c, lc]]);
    });
    And('the button is named Stop reading', () => {
      expect(screen.getByRole('button', { name: 'Stop reading', exact: true })).toHaveAttribute('aria-pressed', 'true');
    });
    When('he taps Stop reading', () => user.click(screen.getByRole('button', { name: 'Stop reading', exact: true })));
    Then('the phone is silent and the button is named Read aloud', () => {
      expect(engine().speaking).toBe(false);
      expect(readAloud()).toHaveAttribute('aria-pressed', 'false');
    });
  });

  Scenario('The Grammar sheet of plural reads its title, its explanation and the part In Greek', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', withBoth);
    And('the Grammar sheet of {string} is open', openGrammarPlural);
    When('he taps Read aloud', () => user.click(readAloud()));
    Then('the phone speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
    And('it speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
    And('it also speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
    And('the explanation of plural is still on screen', () => {
      expect(screen.getByTestId('grammar-explanation')).toHaveTextContent(conceptOf('plural')!.explanation);
      expect(screen.getByTestId('grammar-greek')).toBeVisible();
    });
  });

  Scenario('A phone with no Greek voice gets the help line and the English is still read', ({ Given, And, When, Then }) => {
    Given('a phone with an English voice only', phone([ENGLISH_VOICE]));
    And('the Grammar sheet of {string} is open', openGrammarPlural);
    When('he taps Read aloud', () => user.click(readAloud()));
    Then('the help line about the missing Greek voice is shown', () => {
      expect(screen.getByRole('status')).toHaveTextContent(noVoiceHelp('greek'));
    });
    And('the phone speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
    And('the phone speaks nothing in {string}', (_, lang: string) => expect(spokenIn(lang)).toEqual([]));
  });

  Scenario('A phone that cannot speak at all gets a line, not a silent button', ({ Given, And, When, Then }) => {
    Given('a phone that cannot speak', () => undefined);
    And('the Grammar sheet of {string} is open', openGrammarPlural);
    When('he taps Read aloud', () => user.click(readAloud()));
    Then('a line says there is no voice to read aloud with', () => {
      expect(screen.getByRole('status')).toHaveTextContent('No voice on this phone to read aloud');
    });
  });

  ScenarioOutline('The idea sheet of a letter carries the speaker and keeps its words on screen', ({ Given, And, When, Then }, row) => {
    Given('a phone with an English and a Greek voice', withBoth);
    And('the idea sheet of <idea> is open', () => openIdea(row.idea));
    When('he taps Read aloud', () => user.click(readAloud()));
    Then('the phone speaks the title <title> in {string}', (_, lang: string) => {
      expect(ideaOf(row.idea).title).toBe(row.title);
      expect(spokenIn(lang)[0]).toContain(row.title);
    });
    And('the text of the lesson is still on screen', () => {
      expect(screen.getByTestId('idea-what')).toBeVisible();
      expect(screen.getByTestId('idea-spot')).toBeVisible();
    });
  });

  Scenario('Every idea sheet of the letters has the speaker', ({ Given, Then }) => {
    Given('a phone with an English and a Greek voice', withBoth);
    Then('the idea sheet of every letter of the alphabet has a Read aloud button', () => {
      const letters = LADDER.filter((idea) => idea.id.startsWith('letter-'));
      expect(letters).toHaveLength(24);
      for (const idea of letters) {
        const { unmount } = render(<IdeaSheet idea={idea} onClose={() => undefined} onWord={() => undefined} />);
        expect(within(screen.getByRole('dialog', { name: 'Idea' })).getByRole('button', { name: 'Read aloud', exact: true }), idea.id).toBeInTheDocument();
        unmount();
      }
    });
  });

  Scenario('The idea sheet of the genitive reads its lesson', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', withBoth);
    And('the idea sheet of {string} is open', (_, id: string) => openIdea(id));
    When('he taps Read aloud', () => user.click(readAloud()));
    Then('the phone speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
    And('the text of the lesson is still on screen', () => {
      expect(screen.getByTestId('idea-what')).toBeVisible();
    });
  });

  Scenario("The new word's sheet reads the word and its meaning", ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', withBoth);
    And('the new word sheet of {string} is open', async (_, lemma: string) => {
      const chapter = await loadChapter('rom', 8);
      const verse = chapter.verses.find((v) => v.g.some((w) => w.l.normalize('NFC') === lemma));
      if (!verse) throw new Error(`Romans 8 has no ${lemma}`);
      const candidate = { strongs: 'G4151', lemma, gloss: 'spirit', count: 379, verses: [verse.n] };
      render(<TeachSheet chapter={chapter} title="Romans 8" candidates={[candidate]} solid={new Set()} onClose={() => undefined} onShowVerse={() => undefined} />);
    });
    When('he taps Read aloud', () => user.click(readAloud()));
    Then('the phone speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
    And('the phone speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
  });

  Scenario('Each kept answer of the tutor on a verse has the speaker', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', withBoth);
    And("the tutor's kept answer {string} is on screen", async (_, answer: string) => {
      await addAnswer(verseRef('rom', 8, 28), 'What does it mean?', answer, []);
      render(<AnswerCards verse={28} book="rom" chapter={8} />);
      await screen.findByText(/means works together/);
    });
    When('he taps Read aloud', () => user.click(readAloud()));
    Then('the phone speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
    And('the answer is still on screen', () => {
      expect(screen.getByText(/means works together/)).toBeVisible();
    });
  });

  Scenario("Each version in What's new has the speaker", ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', withBoth);
    And("About's What's new lists a version with one new line", async () => {
      stubChangelog(fixtureChangelog());
      const view: ReactElement = <WhatsNewSection />;
      render(view);
      await screen.findByText(RUNNING_NEW);
    });
    When('he taps Read aloud', async () => {
      const first = (await screen.findAllByRole('button', { name: 'Read aloud', exact: true }))[0];
      await user.click(first);
    });
    Then('the phone speaks the line of that version in {string}', async (_, lang: string) => {
      await waitFor(() => expect(spokenIn(lang).length).toBeGreaterThan(0));
      expect(spokenIn(lang).join(' ')).toMatch(/Pin a verse to the top|Seeing what is new in the app|Reading the Greek aloud/);
    });
  });
});
