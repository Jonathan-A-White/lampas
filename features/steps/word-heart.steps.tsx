// features/steps/word-heart.steps.tsx — runs features/word-heart.feature: the heart of the word (src/data/wordHeart.ts) on the word's sheet, under the gloss of the card that first
// teaches a word (src/TeachSheet.tsx) and under the answer after a miss in Review (src/WordQuestion.tsx, src/Flashcard.tsx).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import type { Question } from '../../src/data/quiz';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { Flashcard } from '../../src/Flashcard';
import { TeachSheet } from '../../src/TeachSheet';
import { WordQuestion } from '../../src/WordQuestion';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();
const chapter8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const nfc = (s: string): string => s.normalize('NFC');
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

const QUESTIONS: Record<string, Question> = {
  'θέλω': { lemma: 'θέλω', prompt: 'θέλω', gloss: 'to will, wish, desire', options: ['to will, wish, desire', 'to see', 'to speak', 'to go'] },
  'πράσσω': { lemma: 'πράσσω', prompt: 'πράσσω', gloss: 'to do, practise', options: ['to do, practise', 'to see', 'to speak', 'to go'] },
};

export function Multiple({ question }: { question: Question }) {
  const [picked, setPicked] = useState<string | null>(null);
  return <WordQuestion question={question} index={0} picked={picked} onPick={setPicked} />;
}

export function Card({ question }: { question: Question }) {
  const [picked, setPicked] = useState<string | null>(null);
  return <Flashcard question={question} picked={picked} onPick={setPicked} />;
}

const heartOfCard = (): HTMLElement | null => screen.queryByTestId('word-heart');

async function openRomans7(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/#/?b=rom&c=7&view=greek');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 7', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function tapsWord(text: string, verse: number): Promise<void> {
  const el = document.querySelector<HTMLElement>(`[data-verse="${verse}"]`);
  if (!el) throw new Error(`no verse ${verse}`);
  // the Greek view is drawn a moment after the verses
  const word = await waitFor(() => {
    const found = within(el).getAllByRole('button', { name: text })[0];
    expect(found).toBeDefined();
    return found;
  });
  await user.click(word);
  await screen.findByRole('dialog', { name: 'Word' });
}

function teaching(lemma: string): void {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/#/test');
  const verses = chapter8.verses.filter((v) => v.g.some((w) => nfc(w.l) === nfc(lemma))).map((v) => v.n);
  render(
    <TeachSheet
      chapter={chapter8}
      title="Romans 8"
      candidates={[{ strongs: 'G0', lemma: nfc(lemma), gloss: 'a gloss', count: 100, verses }]}
      solid={new Set()}
      onClose={() => undefined}
      onShowVerse={() => undefined}
    />,
  );
}

const feature = await loadFeature('features/word-heart.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The word\'s sheet has a row for a word with a note and none for a word without', ({ Given, When, Then }) => {
    Given('Romans 7 is open in the Greek view', openRomans7);
    When('he taps the word {string} in verse {int}', async (_, text: string, verse: number) => {
      await tapsWord(text, verse);
    });
    Then('the sheet has a {string} row saying {string}', (_, name: string, text: string) => {
      const row = within(screen.getByRole('dialog', { name: 'Word' })).getByRole('group', { name });
      expect(squash(row.textContent)).toContain(text);
    });
    When('he closes the sheet and taps the word {string} in verse {int}', async (_, text: string, verse: number) => {
      await user.click(within(screen.getByRole('dialog', { name: 'Word' })).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
      await tapsWord(text, verse);
    });
    Then('the sheet has no {string} row', (_, name: string) => {
      expect(within(screen.getByRole('dialog', { name: 'Word' })).queryByRole('group', { name })).toBeNull();
    });
  });

  const multiple = (lemma: string) => () => {
    cleanup();
    window.history.replaceState(null, '', '/#/test');
    render(<Multiple question={QUESTIONS[lemma]} />);
  };
  const noHeart = () => expect(heartOfCard()).toBeNull();
  const heart = (_: unknown, text: string) => {
    const el = heartOfCard();
    expect(el).not.toBeNull();
    expect(squash(el?.textContent)).toContain(text);
  };
  const answers = (right: boolean) => async () => {
    const lemma = screen.getByTestId('prompt').getAttribute('data-lemma') ?? '';
    const gloss = QUESTIONS[lemma].gloss;
    await user.click(screen.getByRole('button', { name: right ? gloss : QUESTIONS[lemma].options.find((o) => o !== gloss) ?? '' }));
  };

  Scenario('A missed multiple-choice card shows the note under the answer and a right one does not', ({ Given, When, Then }) => {
    Given('a Review card asks θέλω as multiple choice', multiple('θέλω'));
    Then('the card shows no heart of the word', noHeart);
    When('he answers it wrongly', answers(false));
    Then('the card shows the heart of the word {string}', heart);
  });

  Scenario('A right multiple-choice answer shows no note', ({ Given, When, Then }) => {
    Given('a Review card asks θέλω as multiple choice', multiple('θέλω'));
    When('he answers it rightly', answers(true));
    Then('the card shows no heart of the word', noHeart);
  });

  const flashcard = () => {
    cleanup();
    window.history.replaceState(null, '', '/#/test');
    render(<Card question={QUESTIONS['θέλω']} />);
  };
  const grades = (name: string) => async () => {
    await user.click(screen.getByRole('button', { name: 'Show', exact: true }));
    await user.click(screen.getByRole('button', { name }));
  };

  Scenario('A flashcard answered Not yet shows the note and I knew it does not', ({ Given, When, Then }) => {
    Given('a Review card asks θέλω as a flashcard', flashcard);
    When('he shows the meaning and taps {string}', async (_, name: string) => grades(name)());
    Then('the card shows the heart of the word {string}', heart);
  });

  Scenario('A flashcard answered I knew it shows no note', ({ Given, When, Then }) => {
    Given('a Review card asks θέλω as a flashcard', flashcard);
    When('he shows the meaning and taps {string}', async (_, name: string) => grades(name)());
    Then('the card shows no heart of the word', noHeart);
  });

  Scenario('A word without a note shows none after a miss', ({ Given, When, Then }) => {
    Given('a Review card asks πράσσω as multiple choice', multiple('πράσσω'));
    When('he answers it wrongly', answers(false));
    Then('the card shows no heart of the word', noHeart);
  });

  Scenario('The card that first teaches a word shows the note under the gloss', ({ Given, Then }) => {
    Given('the teach sheet offers αὐτός', () => teaching('αὐτός'));
    Then('the teach sheet shows the heart of the word {string} under the gloss', (_, text: string) => {
      const sheet = screen.getByRole('dialog', { name: 'New word' });
      const el = within(sheet).getByTestId('word-heart');
      expect(squash(el.textContent)).toContain(text);
      const gloss = within(sheet).getByTestId('teach-gloss');
      expect(gloss.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  Scenario('The card that first teaches a word without a note shows none', ({ Given, Then }) => {
    Given('the teach sheet offers εἰς', () => teaching('εἰς'));
    Then('the teach sheet shows no heart of the word', () => {
      expect(within(screen.getByRole('dialog', { name: 'New word' })).queryByTestId('word-heart')).toBeNull();
    });
  });
});
