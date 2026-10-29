// A chapter that cannot be fetched says why by the browser's word (mw-lcv9z3g.4, his 08:01:34 picture: 'not on this phone yet, and you are offline' under a status bar showing 4G):
// 'could not be fetched' with Try again when the browser says online, 'you are offline' only when it says offline, and either way a link to Keep on this phone.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { ChapterFailed } from '../../src/reader/ChapterFailed';
import { stubChapterFetch } from '../support/chapter-fetch';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function show(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  const onRetry = vi.fn();
  render(<ChapterFailed title="Acts 18" onRetry={onRetry} onPick={() => {}} />);
  return onRetry;
}

describe('ChapterFailed', () => {
  it('says could not be fetched, with Try again, when the browser says online', async () => {
    const onRetry = show(true);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Acts 18 could not be fetched');
    expect(alert).not.toHaveTextContent('offline');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('says you are offline when the browser says offline', () => {
    show(false);
    expect(screen.getByRole('alert')).toHaveTextContent('you are offline');
    expect(screen.getByRole('alert')).not.toHaveTextContent('could not be fetched');
  });

  it.each([true, false])('offers Keep the New Testament on this phone, a link to the setting, when online is %s', (online) => {
    show(online);
    const link = screen.getByRole('link', { name: 'Keep the New Testament on this phone' });
    expect(link).toHaveAttribute('href', '#/settings?setting=offlineCopy');
  });
});

describe('the link Keep the New Testament on this phone', () => {
  it('opens Settings at the Keep on this phone row', async () => {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    stubChapterFetch();
    window.location.hash = '#/';
    render(<ChapterFailed title="Acts 18" onRetry={() => {}} onPick={() => {}} />);
    await userEvent.click(screen.getByRole('link', { name: 'Keep the New Testament on this phone' }));
    expect(window.location.hash).toBe('#/settings?setting=offlineCopy');
    cleanup();
    render(<App />);
    const group = await screen.findByRole('group', { name: 'Keep on this phone' });
    expect(group.closest('[data-setting]')).toHaveAttribute('data-setting', 'offlineCopy');
  });
});
