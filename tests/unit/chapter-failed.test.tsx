// tests/unit/chapter-failed.test.tsx — what the Reader says when its chapter cannot be fetched (mw-lcv9z3g.4, his screenshot 2026-10-30: 'you are offline' with 4G in the status bar):
// 'offline' only on the browser's word; online it is 'could not be fetched' with Try again; either way a link to the Keep on this phone row.
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChapterFailed } from '../../src/reader/ChapterFailed';

function onLine(value: boolean): void {
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(value);
}

beforeEach(() => {
  window.location.hash = '#/';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('a chapter that cannot be fetched', () => {
  it('online: says it could not be fetched and Try again retries', async () => {
    onLine(true);
    const retry = vi.fn();
    render(<ChapterFailed title="Acts 18" onRetry={retry} onPick={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Acts 18 could not be fetched');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/offline/i);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('offline on the browser\'s word: says you are offline', () => {
    onLine(false);
    render(<ChapterFailed title="Acts 18" onRetry={() => undefined} onPick={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('you are offline');
    expect(screen.getByRole('alert')).not.toHaveTextContent('could not be fetched');
  });

  it.each([true, false])('with onLine %s offers Keep the New Testament on this phone, a link to the setting', async (online) => {
    onLine(online);
    render(<ChapterFailed title="Acts 18" onRetry={() => undefined} onPick={() => undefined} />);
    const link = screen.getByRole('link', { name: 'Keep the New Testament on this phone' });
    expect(link).toHaveAttribute('href', '#/settings?setting=offlineCopy');
    await userEvent.click(link);
    expect(window.location.hash).toBe('#/settings?setting=offlineCopy');
  });

  it('follows the browser going offline', () => {
    onLine(true);
    render(<ChapterFailed title="Acts 18" onRetry={() => undefined} onPick={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('could not be fetched');
    onLine(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('you are offline');
  });
});
