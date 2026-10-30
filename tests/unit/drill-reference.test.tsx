// tests/unit/drill-reference.test.tsx — the Bible reference a drill question shows (mw-5r3p30.876): plain text before he answers, so it gives nothing away, and a link
// to the verse card (the answered word marked) once he has, right or wrong; the card closes back to the drill with the answer and Next where they were.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { setReaderView } from '../../src/data/repositories';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { clearBus } from '../../src/events/bus';
import { GrammarCard } from '../../src/GrammarCard';
import { DrillReference } from '../../src/markdown/DrillReference';
import { stubChapterFetch } from '../support/chapter-fetch';

const QUESTION: GrammarQuestion = {
  kind: 'roles',
  ideaId: 'role-object',
  prompt: "Tap the word that is the object: 'sin'",
  options: ['ἁμαρτίαν', 'ἔχομεν', 'ἑαυτούς'],
  right: 'ἁμαρτίαν',
  ref: '1 John 1:8',
};

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

/** A drill in miniature: the grammar card, and Next once he has answered. */
function Drill({ question = QUESTION }: { question?: GrammarQuestion }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <GrammarCard question={question} mode="choice" picked={picked} onPick={setPicked} />
      {picked !== null ? <button type="button">Next</button> : null}
    </>
  );
}

describe('the reference under a grammar question', () => {
  it('is plain text, not a link, before he answers', () => {
    render(<Drill />);
    expect(screen.getByTestId('grammar-ref')).toHaveTextContent('1 John 1:8');
    expect(screen.queryByRole('link', { name: '1 John 1:8' })).toBeNull();
  });

  it.each([
    ['right', 'ἁμαρτίαν'],
    ['wrong', 'ἔχομεν'],
  ])('is a link to the verse card, the answered word marked, after a %s answer', async (_, pick) => {
    await setReaderView('greek');
    render(<Drill />);
    await userEvent.click(screen.getByRole('button', { name: pick }));
    await userEvent.click(screen.getByRole('link', { name: '1 John 1:8' }));
    const card = await screen.findByRole('dialog', { name: '1 John 1:8' });
    await waitFor(() => expect(card.querySelector('[data-reference-text]')).not.toBeNull());
    expect([...card.querySelectorAll<HTMLElement>('[data-marked]')].map((m) => m.textContent?.trim())).toEqual(['ἁμαρτίαν']);
  });

  it('closes back to the drill with the answer and Next where they were (Close, Escape, a tap outside)', async () => {
    render(<Drill />);
    await userEvent.click(screen.getByRole('button', { name: 'ἁμαρτίαν' }));
    const stands = () => {
      expect(screen.getByTestId('feedback')).toHaveTextContent('Right.');
      expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'ἁμαρτίαν' }).getAttribute('data-result')).toBe('right');
    };
    const open = async () => {
      await userEvent.click(screen.getByRole('link', { name: '1 John 1:8' }));
      return screen.findByRole('dialog', { name: '1 John 1:8' });
    };
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    stands();
    await open();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    stands();
    await open();
    await userEvent.click(document.querySelector('[data-reference-backdrop]') as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    stands();
  });
});

describe('DrillReference', () => {
  it('is plain text while not linked and a link once linked, for any question kind', () => {
    const { rerender } = render(<DrillReference reference="Romans 8:1" mark="νῦν" linked={false} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Romans 8:1')).toBeTruthy();
    rerender(<DrillReference reference="Romans 8:1" mark="νῦν" linked />);
    expect(screen.getByRole('link', { name: 'Romans 8:1' })).toBeTruthy();
  });
});
