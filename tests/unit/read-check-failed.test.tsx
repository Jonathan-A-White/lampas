// The reading check when a new reading fails (mw-5r3p30.208): the result kept from the reading before must not stay beneath the error as if it
// were this reading's. The failed box shows the error and Retry only; the kept result comes back with the next result.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadCheckPanel } from '../../src/ReadCheck';
import type { Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { keepVerseReading } from '../../src/data/repositories';
import type { ReadState } from '../../src/useReadChecks';

const verse: Verse = {
  n: 1,
  g: [{ t: 'Ὃ', tr: 'ho', s: 'G3739', l: 'ὅς', p: 'R-NSN' } as Verse['g'][number]],
  e: [{ t: 'That which was from the beginning', g: [0] }],
};
const hold = { onPress: vi.fn(), onRelease: vi.fn(), onDrop: vi.fn(), disabled: false };

afterAll(() => {
  cleanup();
  db.close();
});
beforeEach(async () => {
  cleanup();
  await db.open();
  await db.readings.clear();
});

function panel(state: ReadState | undefined) {
  return render(<ReadCheckPanel verse={verse} view="english" book="1jo" chapter={1} checks={{ states: { '1': state } }} hold={hold} onRetry={vi.fn()} slot={null} />);
}

describe('a reading that fails', () => {
  beforeEach(() => keepVerseReading('1jo.1.1', 'incomplete', [], 'You read the first words, then stopped.', 'en', 1));

  it('shows the previous reading while nothing has failed', async () => {
    panel(undefined);
    expect(await screen.findByRole('heading', { name: 'Read the whole verse' })).toBeInTheDocument();
  });

  for (const failure of ['unreachable', 'no-answer', 'not-sent'] as const) {
    it(`does not show the previous result beneath the error (${failure})`, async () => {
      const { container } = panel({ phase: 'failed', failure, detail: 'Postern did not answer.', recording: { bytes: new ArrayBuffer(1), mime: 'audio/webm', durationMs: 3000 } as never });
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      // let the stored reading load, then it must still not be drawn
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(container.querySelector('[data-reading-result]')).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Read the whole verse' })).toBeNull();
      expect(screen.queryByText('You read the first words, then stopped.')).toBeNull();
    });
  }
});
