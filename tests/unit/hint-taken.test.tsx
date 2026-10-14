// A Hint on a grammar question (Drill it, mw-5r3p30.349): the wrong answers it takes away are plainly gone from play (struck through and faded,
// not just muted), a line under the question says how many, and the same card draws them the same way wherever it is used (Review's too).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GrammarCard } from '../../src/GrammarCard';
import { hintLine, hintTakes } from '../../src/data/grammar/hint';
import type { GrammarQuestion } from '../../src/data/grammar/questions';

afterEach(cleanup);

const question: GrammarQuestion = {
  kind: 'ending',
  ideaId: 'noun',
  prompt: 'How is this word said?',
  options: ['fos', 'KOZ-mos', 'the-OS', 'DHO-ksa'],
  right: 'DHO-ksa',
  form: 'δόξα',
};

describe('hintTakes', () => {
  it('takes the first half of the wrong answers, rounded up, and never the right one', () => {
    expect([...hintTakes(question.options, question.right)]).toEqual([0, 1]);
    expect([...hintTakes(['a', 'b', 'c'], 'a')]).toEqual([1]);
    expect(hintTakes(['a', 'b', 'a', 'c'], 'a').has(0)).toBe(false);
  });
});

describe('hintLine', () => {
  it('counts the answers taken away, in the singular for one', () => {
    expect(hintLine(2)).toBe('Hint: 2 wrong answers taken away');
    expect(hintLine(1)).toBe('Hint: 1 wrong answer taken away');
  });
});

describe('a card with answers taken away', () => {
  const draw = (taken?: ReadonlySet<number>) => render(<GrammarCard question={question} mode="choice" picked={null} onPick={() => {}} taken={taken} />);
  const options = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[data-option]'));

  it('strikes the taken options through and fades them, and leaves the others as they were', () => {
    draw(new Set([0, 1]));
    const [fos, koz, theOs, dhoxa] = options();
    for (const gone of [fos, koz]) {
      expect(gone).toHaveAttribute('data-taken');
      expect(gone).toBeDisabled();
      expect(gone.className).toContain('line-through');
      expect(gone.className).toContain('disabled:opacity-40');
      expect(gone.className).not.toContain('disabled:opacity-100');
    }
    for (const kept of [theOs, dhoxa]) {
      expect(kept).not.toHaveAttribute('data-taken');
      expect(kept).not.toBeDisabled();
      expect(kept.className).not.toContain('line-through');
    }
  });

  it('says how many were taken, under the question', () => {
    draw(new Set([0, 1]));
    expect(screen.getByTestId('hint-line')).toHaveTextContent('Hint: 2 wrong answers taken away');
  });

  it('shows no line and no struck option with no Hint taken', () => {
    draw();
    expect(screen.queryByTestId('hint-line')).toBeNull();
    expect(document.querySelectorAll('[data-taken]')).toHaveLength(0);
  });

  it('keeps the taken look after the question is answered', () => {
    render(<GrammarCard question={question} mode="choice" picked="DHO-ksa" onPick={() => {}} taken={new Set([0, 1])} />);
    expect(document.querySelectorAll('[data-taken]')).toHaveLength(2);
  });
});
