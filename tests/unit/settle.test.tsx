// tests/unit/settle.test.tsx — the question cards' settling moment (src/ui/settle.ts, mw-hqd5bz.21): a flashcard's Show and its grades, and the
// choice cards' options, take no tap in the moment after they appear (the second tap of a double tap on Next, or on Show), and take one after it.
// tests/setup.ts sets the moment to 0; each test puts it back.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GrammarCard } from '../../src/GrammarCard';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { settle, SETTLE_MS } from '../../src/ui/settle';

const QUESTION: GrammarQuestion = { kind: 'letter', ideaId: 'letter-alpha', prompt: 'Which letter is this?', options: ['alpha', 'beta', 'gamma', 'delta'], right: 'alpha', form: 'α' };

beforeEach(() => {
  vi.useFakeTimers();
  settle.ms = SETTLE_MS;
});
afterEach(() => {
  settle.ms = 0;
  cleanup();
  vi.useRealTimers();
});

describe('a new card settles before it takes a tap', () => {
  it('ignores an option tapped 100 ms after the card appears, and takes one after the moment', () => {
    const onPick = vi.fn();
    render(<GrammarCard question={QUESTION} mode="choice" picked={null} onPick={onPick} />);
    act(() => void vi.advanceTimersByTime(100));
    fireEvent.click(screen.getByRole('button', { name: 'beta' }));
    expect(onPick).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(SETTLE_MS));
    fireEvent.click(screen.getByRole('button', { name: 'beta' }));
    expect(onPick).toHaveBeenCalledWith('beta');
  });

  it('ignores Show tapped at once, and the grade tapped at once after Show, but takes them after the moment', () => {
    const onPick = vi.fn();
    render(<GrammarCard question={QUESTION} mode="flashcard" picked={null} onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(SETTLE_MS));
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    // the grades appear under the finger that tapped Show: a second tap there is not a grade
    fireEvent.click(screen.getByRole('button', { name: 'I knew it' }));
    expect(onPick).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(SETTLE_MS));
    fireEvent.click(screen.getByRole('button', { name: 'I knew it' }));
    expect(onPick).toHaveBeenCalledWith('I knew it');
  });

  it('takes a tap at once while the moment is 0, as the other tests do', () => {
    settle.ms = 0;
    const onPick = vi.fn();
    render(<GrammarCard question={QUESTION} mode="choice" picked={null} onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'beta' }));
    expect(onPick).toHaveBeenCalledWith('beta');
  });
});
