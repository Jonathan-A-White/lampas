// features/steps/read-lessons.steps.tsx — runs features/read-lessons.feature: Settings > Read aloud > Read lessons to me, and the idea sheet, the Grammar
// sheet and the new word's sheet reading themselves when they open (src/speech/ReadAloud.tsx LessonReadAloud), over the honest speech fake.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { loadChapter, type Chapter, type GreekWord } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { clearBus } from '../../src/events/bus';
import { GrammarSheet } from '../../src/GrammarSheet';
import { IdeaSheet } from '../../src/IdeaSheet';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { TeachSheet } from '../../src/TeachSheet';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

const feature = await loadFeature('features/read-lessons.feature');
const user = userEvent.setup();

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let synth: FakeSynth | undefined;
  let sheet: RenderResult | undefined;
  /** the phone refuses to speak until this is true (a browser that wants a tap first) */
  let allowed = true;

  BeforeEachScenario(async () => {
    cleanup();
    stopReading();
    clearBus();
    forgetTrail();
    vi.unstubAllGlobals();
    synth = undefined;
    sheet = undefined;
    allowed = true;
    window.localStorage.clear();
    window.localStorage.setItem('lampas.welcome', 'done');
    window.history.replaceState(null, '', '/');
    stubChapterFetch();
    await db.open();
    await Promise.all([db.settings.clear(), db.grammarLevels.clear(), db.reviews.clear(), db.words.clear()]);
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
  const speaks = async (text: string, lang: string): Promise<void> => {
    await waitFor(() => expect(spokenIn(lang).some((said) => said.includes(text))).toBe(true));
  };

  const phone = () => {
    synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  };
  /** A phone that refuses to speak until a tap: speak() fires an error 'not-allowed' on the utterance instead of speaking. */
  const refusingPhone = () => {
    phone();
    const real = engine().honest.synth.speak.bind(engine().honest.synth);
    engine().honest.synth.speak = (utterance) => {
      if (allowed) return real(utterance);
      queueMicrotask(() => utterance.onerror?.({ type: 'error', error: 'not-allowed' } as unknown as Parameters<NonNullable<typeof utterance.onerror>>[0]));
    };
  };
  const setting = (value: 'on' | 'off') => () => db.settings.put({ key: 'readLessons', value });

  const emptyChapter: Chapter = { book: 'Romans', code: 'rom', chapter: 8, lex: {}, parse: {}, verses: [] };
  const aWord = { t: 'λόγος', l: 'λόγος' } as unknown as GreekWord;
  const speaker = (name: string): HTMLElement => screen.getByRole('button', { name, exact: true });

  async function openApp(): Promise<void> {
    cleanup();
    clearBus();
    forgetTrail();
    window.history.replaceState(null, '', '/');
    render(<App />);
    await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  }
  async function openSettings(): Promise<void> {
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByRole('heading', { name: 'Settings', level: 1 });
  }
  const readLessonsGroup = async (): Promise<HTMLElement> => screen.findByRole('group', { name: 'Read lessons to me' });
  const chosenIn = async (name: string): Promise<void> => {
    await waitFor(async () => {
      const chosen = within(await readLessonsGroup()).getAllByRole('button', { pressed: true });
      expect(chosen.map((c) => c.textContent)).toEqual([name]);
    });
  };

  const openIdea = (id: string) => () => {
    sheet = render(<IdeaSheet idea={ideaOf(id)} onClose={() => undefined} onWord={() => undefined} />);
  };

  Scenario('Settings offers Read lessons to me, Off to start, and keeps On across a reload', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with Read lessons to me untouched', openApp);
    When('he opens Settings', openSettings);
    Then('Read lessons to me shows {string} as the one chosen', (_, name: string) => chosenIn(name));
    When('he chooses {string} for Read lessons to me', async (_, name: string) => {
      await user.click(within(await readLessonsGroup()).getByRole('button', { name }));
      await waitFor(async () => expect((await db.settings.get('readLessons'))?.value).toBe('on'));
    });
    And('Lampas is opened again', openApp);
    And('he opens Settings again', openSettings);
    Then('Read lessons to me still shows {string} as the one chosen', (_, name: string) => chosenIn(name));
  });

  Scenario('With it On the idea sheet of Chi reads itself when it opens, Greek in Greek', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', phone);
    And('Read lessons to me is On', setting('on'));
    When('the idea sheet of {string} is opened', (_, id: string) => openIdea(id)());
    Then('the phone speaks the title {string} in {string}', async (_, title: string, lang: string) => {
      expect(ideaOf('letter-chi').title).toBe(title);
      await waitFor(() => expect(spokenIn(lang)[0]).toContain(title));
    });
    And('the phone speaks some Greek in {string}', async (_, lang: string) => {
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

  Scenario('With it Off the idea sheet of Chi stays silent until the speaker is tapped', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', phone);
    And('Read lessons to me is Off', setting('off'));
    When('the idea sheet of {string} is opened', (_, id: string) => openIdea(id)());
    Then('the phone has spoken nothing', async () => {
      // the sheet has drawn and the setting has been read before this is judged
      await screen.findByTestId('idea-what');
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      expect(engine().spoken).toEqual([]);
    });
    When('he taps Read aloud', () => user.click(speaker('Read aloud')));
    Then('the phone speaks the title {string} in {string}', async (_, title: string, lang: string) => {
      await waitFor(() => expect(spokenIn(lang)[0]).toContain(title));
    });
  });

  Scenario('Tapping the speaker stops the reading', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', phone);
    And('Read lessons to me is On', setting('on'));
    When('the idea sheet of {string} is opened', (_, id: string) => openIdea(id)());
    And('he taps Stop reading', async () => {
      await user.click(await screen.findByRole('button', { name: 'Stop reading', exact: true }));
    });
    Then('the phone is silent', () => {
      expect(engine().speaking).toBe(false);
    });
    And('the speaker is named Read aloud', () => {
      expect(speaker('Read aloud')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  Scenario('Closing the sheet stops the reading', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', phone);
    And('Read lessons to me is On', setting('on'));
    When('the idea sheet of {string} is opened', (_, id: string) => openIdea(id)());
    And('the sheet is closed', async () => {
      await screen.findByRole('button', { name: 'Stop reading', exact: true });
      expect(engine().speaking).toBe(true);
      sheet?.unmount();
    });
    Then('the phone is silent', () => {
      expect(engine().speaking).toBe(false);
    });
  });

  Scenario("The Grammar sheet and the new word's sheet read themselves too", ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice', phone);
    And('Read lessons to me is On', setting('on'));
    When('the Grammar sheet of {string} is opened', () => {
      sheet = render(<GrammarSheet chapter={emptyChapter} term="plural" word={aWord} known={false} onClose={() => undefined} onTerm={() => undefined} onWord={() => undefined} />);
    });
    Then('the phone speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
    When('the new word sheet of {string} is opened', async (_, lemma: string) => {
      sheet?.unmount();
      const chapter = await loadChapter('rom', 8);
      const verse = chapter.verses.find((v) => v.g.some((w) => w.l.normalize('NFC') === lemma));
      if (!verse) throw new Error(`Romans 8 has no ${lemma}`);
      const candidate = { strongs: 'G4151', lemma, gloss: 'spirit', count: 379, verses: [verse.n] };
      sheet = render(<TeachSheet chapter={chapter} title="Romans 8" candidates={[candidate]} solid={new Set()} onClose={() => undefined} onShowVerse={() => undefined} />);
    });
    Then('the phone then speaks {string} in {string}', (_, text: string, lang: string) => speaks(text, lang));
  });

  Scenario('A browser that refuses speech without a tap gets a gentle Tap to listen', ({ Given, And, When, Then }) => {
    Given('a phone with an English and a Greek voice that refuses speech without a tap', () => {
      allowed = false;
      refusingPhone();
    });
    And('Read lessons to me is On', setting('on'));
    When('the idea sheet of {string} is opened', (_, id: string) => openIdea(id)());
    Then('the speaker is named Tap to listen and pulses', async () => {
      const button = await screen.findByRole('button', { name: 'Tap to listen', exact: true });
      expect(button).toHaveTextContent('Tap to listen');
      expect(button.className).toContain('animate-pulse');
    });
    And('the text of the lesson is still on screen', () => {
      expect(screen.getByTestId('idea-what')).toBeVisible();
    });
    When('the phone allows speech', () => {
      allowed = true;
    });
    And('he taps Tap to listen', () => user.click(speaker('Tap to listen')));
    Then('the phone speaks the title {string} in {string}', async (_, title: string, lang: string) => {
      await waitFor(() => expect(spokenIn(lang)[0]).toContain(title));
    });
    And('the speaker is named Stop reading', () => {
      expect(speaker('Stop reading')).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
