// The reading check when the reading covers the start of the verse and stops (mw-neuq78.7): graded as far as he went, the words he read
// marked as usual, the word he stopped at offered as his next word, and the invitation to read again and go further.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadCheckPanel } from '../../src/ReadCheck';
import type { Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { keepVerseReading } from '../../src/data/repositories';

const verse: Verse = {
  n: 28,
  g: [{ t: 'Οἴδαμεν', tr: 'oidamen', s: 'G1492', l: 'οἶδα', p: 'V-RAI-1P' } as Verse['g'][number]],
  e: [{ t: 'And we know that', g: [0] }, { t: 'all things work together', g: [0] }],
};
const hold = { onPress: vi.fn(), onRelease: vi.fn(), onDrop: vi.fn(), disabled: false };
const next = { word: 'that', index: 3, chunks: ['th', 'at'], tip: 'Start with the th of think, not a d.', say: 'thatt' };
const know = { word: 'know', index: 2, chunks: ['know'], tip: 'The k is silent: say no.' };

afterAll(() => {
  cleanup();
  db.close();
});
beforeEach(async () => {
  cleanup();
  await db.open();
  await Promise.all([db.readings.clear(), db.readingHistory.clear(), db.missTally.clear()]);
});

const panel = () => render(<ReadCheckPanel verse={verse} view="english" book="rom" chapter={8} checks={{ states: {} }} hold={hold} onRetry={vi.fn()} slot={null} />);

describe('a partial reading', () => {
  beforeEach(() =>
    keepVerseReading('rom.8.28', 'partial', [know], 'Good start: you read "And we know" clearly.', 'en', 1, undefined, { reached: 2, total: 8, next }),
  );

  it('says how far he got, with no Read the whole verse title', async () => {
    const { container } = panel();
    await screen.findByText('You read 3 of 8 words');
    const result = container.querySelector('[data-reading-result="partial"]') as HTMLElement;
    expect(result).not.toBeNull();
    expect(within(result).getByText('You read 3 of 8 words')).toBeInTheDocument();
    expect(within(result).getByText(/Good start/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Read the whole verse' })).toBeNull();
    expect(screen.queryByText('Further than last time')).toBeNull();
  });

  it('marks the misread word of the part he read, and shows the Next word with its chunks, tip and speaker', async () => {
    const { container } = panel();
    await screen.findByText('You read 3 of 8 words');
    expect(container.querySelector('[data-fix="know"]')).not.toBeNull();
    const block = container.querySelector('[data-next-word]') as HTMLElement;
    expect(within(block).getByRole('heading', { name: 'Next word' })).toBeInTheDocument();
    expect(within(block).getByText('that')).toBeInTheDocument();
    expect(block.querySelector('[data-chunks]')).toHaveTextContent('th · at');
    expect(within(block).getByText('Start with the th of think, not a d.')).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Hear it' })).toBeInTheDocument();
  });

  it('invites him to read again and go further', async () => {
    panel();
    expect(await screen.findByText(/read it again from the start and go further/i)).toBeInTheDocument();
  });

  it('adds Further than last time when the reading went past the one before', async () => {
    await keepVerseReading('rom.8.28', 'partial', [], 'Better.', 'en', 2, undefined, { reached: 4, total: 8, next: { ...next, word: 'all', index: 5 } });
    panel();
    expect(await screen.findByText('You read 5 of 8 words')).toBeInTheDocument();
    expect(screen.getByText('Further than last time')).toBeInTheDocument();
  });
});

describe('a partial reading with nothing misread', () => {
  it('shows no words to fix and no Read these again, but still the Next word', async () => {
    await keepVerseReading('rom.8.28', 'partial', [], 'Good start.', 'en', 1, undefined, { reached: 0, total: 8, next: { ...next, word: 'we', index: 1 } });
    const { container } = panel();
    expect(await screen.findByText('You read 1 of 8 words')).toBeInTheDocument();
    expect(container.querySelector('[data-fix]')).toBeNull();
    expect(container.querySelector('[data-next-word]')).not.toBeNull();
  });
});

describe('an old incomplete reading', () => {
  it('is still headed Read the whole verse and has no Next word', async () => {
    await keepVerseReading('rom.8.28', 'incomplete', [], 'I could not hear you.', 'en', 1);
    const { container } = panel();
    expect(await screen.findByRole('heading', { name: 'Read the whole verse' })).toBeInTheDocument();
    expect(container.querySelector('[data-next-word]')).toBeNull();
  });
});
