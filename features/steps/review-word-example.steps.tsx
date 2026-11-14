// features/steps/review-word-example.steps.tsx — runs features/review-word-example.feature: a Review word question names an Example verse from his goal once it is answered
// (src/data/reviewExamples.ts picks it, src/WordQuestion.tsx and src/Flashcard.tsx draw it). The word is drawn through Review's own WORDS.draw with the chapter files read from disk.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';
import { readFileSync } from 'node:fs';
import { setOpenChapter } from '../../src/data/readerChapter';
import { setGoal, setReaderView } from '../../src/data/repositories';
import { WORDS, type ReviewItem } from '../../src/review/kinds';
import { ItemCard } from '../../src/review/ItemCard';
import { seedHisWords } from '../../tests/support/his-words';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { closeDatabase } from './close-database';

const user = userEvent.setup();

afterAll(async () => {
  cleanup();
  await closeDatabase();
  vi.unstubAllGlobals();
});

/** The lemmas the scenarios ask: not in the seed words, so the scenario puts them in. */
const EXTRA: Record<string, string> = { ἀπό: 'from, away from', κτίσις: 'creation', ζζζζ: 'nothing' };

/** The chapters the scenarios name: the book's code and the number. */
const CHAPTERS: Record<string, [string, number]> = { 'John 1': ['jhn', 1], 'Romans 8': ['rom', 8] };

/** The round's card as the Review screen holds it: the answer is the screen's state. */
export function Holder({ item }: { item: ReviewItem }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [grade, setGrade] = useState<'not' | 'some' | 'well' | null>(null);
  return <ItemCard item={item} index={0} picked={picked} onPick={setPicked} grade={grade} onGrade={setGrade} />;
}

async function drawCard(goal: string, lemma: string, last: string | undefined, step: number): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  stubChapterFetch();
  localStorage.clear();
  window.history.replaceState(null, '', '/#/review');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.reviews.clear(), db.settings.clear()]);
  await seedHisWords();
  await db.words.put({ lemma, lang: 'grc', lemmas: [lemma], gloss: EXTRA[lemma], lesson: 1, state: 'learning', since: 0 });
  await setGoal(goal);
  // the card marks the form in the Greek verse (the English view marks the English word instead)
  await setReaderView('greek');
  if (last) setOpenChapter(...(CHAPTERS[last] as [string, number]));
  const [item] = await WORDS.draw([{ kind: 'word', id: lemma, step, due: 0, lastWhen: 0, lapses: 0, rights: 0 }], mulberry32(3));
  expect(item.kind).toBe('word');
  render(<Holder item={item} />);
}

/** The Example line: its testid is the word question's 'chapter-form'. */
const line = (): HTMLElement | null => screen.queryByTestId('chapter-form');

const feature = await loadFeature('features/review-word-example.feature');

/** Whether the verse a reference names ('John 1:45') has a word of the lemma, read from the chapter file on disk. */
function verseHas(ref: string, lemma: string): boolean {
  const [, name, verse] = /^(.+):(\d+)$/.exec(ref) ?? [];
  const [book, n] = CHAPTERS[name] ?? [];
  const chapter = JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as { verses: { n: number; g: { l: string }[] }[] };
  return (chapter.verses.find((v) => v.n === Number(verse))?.g ?? []).some((w) => w.l.normalize('NFC') === lemma);
}

async function answerChoice(): Promise<void> {
  const prompt = screen.getByTestId('prompt').getAttribute('data-lemma') ?? '';
  await user.click(screen.getByRole('button', { name: EXTRA[prompt] }));
}

async function exampleIsAVerseOf(chapterName: string, lemma: string): Promise<string> {
  const node = await screen.findByTestId('chapter-form');
  expect(node.textContent).toMatch(/^Example: /);
  const ref = within(node).getByRole('link').textContent ?? '';
  expect(ref.replace(/:\d+$/, '')).toBe(chapterName);
  expect(verseHas(ref, lemma), `${ref} has ${lemma}`).toBe(true);
  return ref;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('With the goal John 1 the Example is a verse of John 1 that has the word, and only after the answer', ({ Given, Then, When, And }) => {
    let ref = '';
    Given('his goal is {string} and Review asks the word {string}', async (_, goal: string, lemma: string) => drawCard(goal, lemma, undefined, 0));
    Then('the card has no Example line and no link to a verse', () => {
      expect(line()).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });
    When('he answers the word question', answerChoice);
    Then('the Example line says it is a verse of {string} that has {string}', async (_, chapterName: string, lemma: string) => {
      ref = await exampleIsAVerseOf(chapterName, lemma);
    });
    And('the Example link opens that verse with {string} marked', async () => {
      const form = screen.getByTestId('chapter-form').getAttribute('data-form') ?? '';
      expect(form.length).toBeGreaterThan(0);
      await user.click(screen.getByRole('link', { name: ref }));
      const dialog = await screen.findByRole('dialog', { name: ref });
      await waitFor(() => expect([...dialog.querySelectorAll('[data-marked]')].map((m) => m.textContent?.trim())).toEqual([form]));
    });
  });

  Scenario('A goal verse without the word widens to its chapter', ({ Given, When, Then }) => {
    Given('his goal is {string} and Review asks the word {string}', async (_, goal: string, lemma: string) => drawCard(goal, lemma, undefined, 0));
    When('he answers the word question', answerChoice);
    Then('the Example line says it is a verse of {string} that has {string}', async (_, chapterName: string, lemma: string) => {
      await exampleIsAVerseOf(chapterName, lemma);
    });
  });

  Scenario("A word the goal's book lacks is looked for in the chapter he last read", ({ Given, When, Then }) => {
    Given('his goal is {string} and he last read {string} and Review asks the word {string}', async (_, goal: string, last: string, lemma: string) => drawCard(goal, lemma, last, 0));
    When('he answers the word question', answerChoice);
    Then('the Example line says it is a verse of {string} that has {string}', async (_, chapterName: string, lemma: string) => {
      await exampleIsAVerseOf(chapterName, lemma);
    });
  });

  Scenario('A word that stands nowhere has no Example line', ({ Given, When, Then }) => {
    Given('his goal is {string} and Review asks the word {string}', async (_, goal: string, lemma: string) => drawCard(goal, lemma, undefined, 0));
    When('he answers the word question', answerChoice);
    Then('there is no Example line', async () => {
      await screen.findByTestId('feedback');
      await waitFor(() => expect(screen.getByTestId('feedback').textContent).not.toBe(''));
      expect(line()).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });
  });

  Scenario('A flashcard shows the Example once he has graded it', ({ Given, Then, When }) => {
    Given('his goal is {string} and Review asks the word {string} as a flashcard', async (_, goal: string, lemma: string) => drawCard(goal, lemma, undefined, 3));
    Then('the card has no Example line and no link to a verse', () => {
      expect(line()).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });
    When('he shows the flashcard and grades it', async () => {
      await user.click(screen.getByRole('button', { name: 'Show' }));
      await user.click(await screen.findByRole('button', { name: 'Kind of' }));
    });
    Then('the Example line says it is a verse of {string} that has {string}', async (_, chapterName: string, lemma: string) => {
      await exampleIsAVerseOf(chapterName, lemma);
    });
  });
});
