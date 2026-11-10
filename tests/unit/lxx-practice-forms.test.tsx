// tests/unit/lxx-practice-forms.test.tsx — no Septuagint consumer of a practice form sees Swete's mark (mw-u2w5klk.339): every reader of the Gen 1 fixture's words (Quick test and Review, the Teach sheet, the Idea sheet,
// the Grammar sheet, Copywork) is run over all of them, and none shows a word that begins or ends with a stop, a high stop or a bracket. The fixture's words end in his marks ('γῆν.', 'ἀβύσσου·').
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { Word } from '../../src/data/db';
import { ideaExamples } from '../../src/data/grammar/ideaSheet';
import { LADDER } from '../../src/data/grammar/ladder';
import { lemmaKeyOf } from '../../src/data/lemma';
import { mulberry32 } from '../../src/data/quiz';
import { questionsOf } from '../../src/data/quizWords';
import { teachForms } from '../../src/data/weave';
import { GrammarSheet } from '../../src/GrammarSheet';
import { copyTextOf, copyWordsOf } from '../../src/practise/copywork';

const genesis = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter;
const edgeMark = /^[.,;:··;()[\]]|[.,;:··;()[\]]$/u;
const words = genesis.verses.flatMap((v) => v.g);
const lemmas = [...new Set(words.map((w) => lemmaKeyOf(w.l)))];

describe('the Gen 1 fixture', () => {
  it('has words that end in Swete’s marks, so the test below can see them', () => {
    expect(words.filter((w) => edgeMark.test(w.t)).length).toBeGreaterThan(10);
  });
});

describe('no consumer of a practice form shows the mark', () => {
  it('Quick test and Review: the form of every lemma of the chapter', async () => {
    const asked: Word[] = lemmas.map((lemma) => ({ lemma, lang: 'grc', lemmas: [lemma], gloss: 'g', lesson: 1, state: 'learning', since: 0 }));
    const questions = await questionsOf(asked, asked, mulberry32(7), { grc: Promise.resolve(genesis) });
    const forms = questions.flatMap((q) => (q.form === undefined ? [] : [q.form]));
    expect(forms.length).toBeGreaterThan(10);
    for (const form of forms) expect(form).not.toMatch(edgeMark);
  });

  it('the Teach sheet: the forms of every lemma in every verse', () => {
    const forms = genesis.verses.flatMap((v) => lemmas.flatMap((lemma) => teachForms(v, lemma, genesis)));
    expect(forms.length).toBe(words.length);
    for (const form of forms) expect(form).not.toMatch(edgeMark);
  });

  it('the Idea sheet: the parts of every idea’s examples', () => {
    const parts = LADDER.flatMap((idea) => ideaExamples(idea.id, [genesis]).flatMap((e) => e.parts.map((p) => p.text).join('').split(' ')));
    expect(parts.length).toBeGreaterThan(50);
    for (const part of parts) expect(part).not.toMatch(edgeMark);
  });

  it('the Grammar sheet: the examples it draws', () => {
    const { container } = render(
      <GrammarSheet chapter={genesis} term="accusative" word={words[0]} known={false} onClose={() => undefined} onTerm={() => undefined} onWord={() => undefined} />,
    );
    const rows = [...container.querySelectorAll('[data-testid="grammar-example"]')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.getAttribute('data-form')).not.toMatch(edgeMark);
      expect(row.querySelector('.font-greek')?.textContent).not.toMatch(edgeMark);
    }
    expect(screen.getAllByTestId('grammar-example').length).toBe(rows.length);
  });

  it('Copywork: the words to copy of every verse', () => {
    for (const verse of genesis.verses) {
      const copied = copyWordsOf(copyTextOf(verse, 'grc', genesis));
      expect(copied).toHaveLength(verse.g.length);
      for (const word of copied) expect(word).not.toMatch(edgeMark);
    }
  });
});
