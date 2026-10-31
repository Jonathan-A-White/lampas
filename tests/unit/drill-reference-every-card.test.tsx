// tests/unit/drill-reference-every-card.test.tsx — every drill or review card that shows a Bible reference draws it plain until the answer is shown or picked, and as a link from then on
// (mw-5r3p30.924; the one DrillReference, src/markdown/DrillReference.tsx). The flashcard linked it only after I knew it / Not yet, when Review had already moved on to the next card.
// Cards that show no reference (Flashcard, SoundWordCard, DrillPlanCard) are not listed. The Parsing drill (DrillScreen) and its end card link the reference from the start, because the
// screen draws the whole verse with the asked word marked: the verse card tells him nothing the screen has not.
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import type { Question } from '../../src/data/quiz';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import type { QuestionMode } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { GrammarCard } from '../../src/GrammarCard';
import { WordQuestion } from '../../src/WordQuestion';
import { stubChapterFetch } from '../support/chapter-fetch';

const REF = '1 John 1:4';

const TAP: GrammarQuestion = { kind: 'tap-form', ideaId: 'preposition', prompt: 'Tap the preposition', options: ['ἐν', 'ἡμῖν', 'λόγος'], right: 'ἐν', ref: REF };
const ENDING: GrammarQuestion = { kind: 'ending', ideaId: 'nom-sg', prompt: 'Which ending?', form: 'λόγ_', word: 'λόγος', options: ['ος', 'ου', 'ῳ', 'ον'], right: 'ος', ref: REF };
const PARSE: GrammarQuestion = {
  kind: 'parse',
  ideaId: 'participle',
  prompt: 'Parse this word',
  form: 'γράφομεν',
  options: [],
  right: 'verb, present',
  ref: REF,
  steps: [{ id: 'pos', label: 'Part of speech', right: 'verb', options: ['verb', 'noun', 'article', 'adverb'] }],
};
const WORD: Question = { lemma: 'λόγος', prompt: 'λόγος', form: 'λόγον', reference: REF, gloss: 'word', options: ['word', 'house', 'sin', 'light'] };
const WORD_HBO: Question = { lemma: 'דָּבָר', lang: 'hbo', prompt: 'דָּבָר', form: 'דְּבַר', reference: 'Genesis 15:1', gloss: 'word', options: ['word', 'house', 'sin', 'light'] };

interface Kind {
  name: string;
  reference: string;
  /** the card, with `picked` and `onPick` kept by the harness */
  card: (picked: string | null, onPick: (option: string) => void) => ReactNode;
  /** what answers it: the click that shows or picks */
  answer: () => Promise<void>;
}

const grammar = (name: string, question: GrammarQuestion, mode: QuestionMode, answer: () => Promise<void>): Kind => ({
  name,
  reference: question.ref ?? '',
  card: (picked, onPick) => <GrammarCard question={question} mode={mode} picked={picked} onPick={onPick} />,
  answer,
});

const click = (name: string | RegExp) => async () => {
  await userEvent.click(screen.getByRole('button', { name }));
};

const KINDS: Kind[] = [
  grammar('GrammarCard choice (tap the form)', TAP, 'choice', click('ἐν')),
  grammar('GrammarCard choice (an ending)', ENDING, 'choice', click('ος')),
  grammar('GrammarCard parse', PARSE, 'choice', click('verb')),
  // the flashcard is answered by Show: the reference links then, before he grades it
  grammar('GrammarCard flashcard (tap the form)', TAP, 'flashcard', click('Show')),
  grammar('GrammarCard flashcard (an ending)', ENDING, 'flashcard', click('Show')),
  {
    name: 'WordQuestion (Greek)',
    reference: REF,
    card: (picked, onPick) => <WordQuestion question={WORD} index={0} picked={picked} onPick={onPick} />,
    answer: click('word'),
  },
  {
    name: 'WordQuestion (Hebrew)',
    reference: 'Genesis 15:1',
    card: (picked, onPick) => <WordQuestion question={WORD_HBO} index={0} picked={picked} onPick={onPick} />,
    answer: click('word'),
  },
];

function Harness({ kind }: { kind: Kind }) {
  const [picked, setPicked] = useState<string | null>(null);
  return <>{kind.card(picked, setPicked)}</>;
}

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await Promise.all(db.tables.map((table) => table.clear()));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a reference on a drill or review card', () => {
  it.each(KINDS.map((k) => [k.name, k] as const))('%s: plain before the answer is shown or picked, a link after', async (_, kind) => {
    render(<Harness kind={kind} />);
    expect(screen.queryByRole('link', { name: kind.reference })).toBeNull();
    await kind.answer();
    expect(await screen.findByRole('link', { name: kind.reference })).toBeTruthy();
  });

  it('a flashcard shown and not yet graded still has Not yet and I knew it beside the link', async () => {
    render(<Harness kind={KINDS.find((k) => k.name.startsWith('GrammarCard flashcard (tap'))!} />);
    expect(screen.queryByRole('button', { name: 'I knew it' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByRole('link', { name: REF })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'I knew it' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Not yet' })).toBeTruthy();
  });
});
