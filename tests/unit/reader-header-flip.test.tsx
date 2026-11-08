// tests/unit/reader-header-flip.test.tsx — the Reader header's last language button takes a hold (mw-u2w5klk.293): a tap still chooses the view, a hold asks for the flip and says in a toast what it answers.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { ReaderHeader, type ReaderHeaderProps } from '../../src/reader/ReaderHeader';
import { LONG_PRESS_MS } from '../../src/ui/longPress';
import { getReaderView } from '../../src/data/repositories';

const user = userEvent.setup();
afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});
afterEach(() => cleanup());

const props = (extra: Partial<ReaderHeaderProps> = {}): ReaderHeaderProps => ({
  title: 'Genesis 1',
  view: 'english',
  source: 'hbo',
  weave: 'off',
  weaveShown: false,
  weaveOrder: 'english',
  chapterReading: false,
  reading: { onBar: false } as ReaderHeaderProps['reading'],
  from: null,
  canRead: false,
  inert: false,
  onPick: () => undefined,
  onRead: () => undefined,
  ...extra,
});

async function hold(name: string): Promise<void> {
  const target = screen.getByRole('button', { name });
  await user.pointer({ keys: '[MouseLeft>]', target });
  await act(() => new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 150)));
  await user.pointer({ keys: '[/MouseLeft]', target });
}

describe('a hold on the last language button', () => {
  it('asks for the flip once and shows the words it answers in a status toast', async () => {
    const onFlip = vi.fn(async () => 'Septuagint on');
    render(<ReaderHeader {...props({ onFlip })} />);
    await hold('Hebrew');
    expect(onFlip).toHaveBeenCalledTimes(1);
    expect((await screen.findByRole('status')).textContent).toBe('Septuagint on');
  });

  it('shows the reason a flip did nothing', async () => {
    render(<ReaderHeader {...props({ source: 'grc', title: 'Matthew 1', onFlip: async () => 'Only an Old Testament book has a Septuagint' })} />);
    await hold('Greek');
    expect((await screen.findByRole('status')).textContent).toBe('Only an Old Testament book has a Septuagint');
  });

  it('does not choose the view: the hold is not a tap', async () => {
    render(<ReaderHeader {...props({ onFlip: async () => 'Hebrew text on' })} />);
    await hold('Hebrew');
    await screen.findByRole('status');
    expect(await getReaderView()).toBe('english');
  });

  it('is not given to the English button', async () => {
    const onFlip = vi.fn(async () => 'x');
    render(<ReaderHeader {...props({ onFlip })} />);
    await hold('English');
    expect(onFlip).not.toHaveBeenCalled();
  });

  it('leaves a tap as it was: it chooses the view and does not flip', async () => {
    const onFlip = vi.fn(async () => 'x');
    render(<ReaderHeader {...props({ onFlip })} />);
    await user.click(screen.getByRole('button', { name: 'Hebrew' }));
    await waitFor(async () => expect(await getReaderView()).toBe('greek'));
    expect(onFlip).not.toHaveBeenCalled();
  });

  it('keeps no callout menu or text selection on the button', () => {
    render(<ReaderHeader {...props({ onFlip: async () => 'x' })} />);
    expect(screen.getByRole('button', { name: 'Hebrew' }).className).toContain('select-none');
  });
});
