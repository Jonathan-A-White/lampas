// useBringVerse (src/reader/useBringVerse.ts, mw-fnvjof.17.118): a link's verse is brought to the top once the Reader knows its Reading mode. While the setting is still being read
// (paging null) the request waits; met early it took a Turn pages Reader for a scrolling one, scrolled a box that does not scroll, and the page was never turned to the verse.
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { bringVerse, pendingRequest, takeRequest } from '../../src/nav/readerRequest';
import { useBringVerse } from '../../src/reader/useBringVerse';

const chapter = { code: 'jhn', chapter: 5 } as unknown as Chapter;

function reader(): HTMLElement {
  const main = document.createElement('main');
  main.innerHTML = '<p data-verse="25">verse</p>';
  return main;
}

describe('useBringVerse and the Reading mode', () => {
  afterEach(() => {
    const left = pendingRequest();
    if (left) takeRequest(left);
  });

  it('waits while the Reading mode is unread, then turns the page to the verse in Turn pages', () => {
    const main = reader();
    const show = vi.fn();
    bringVerse('jhn', 5, 25);
    const { rerender } = renderHook(
      ({ paging }: { paging: boolean | null }) => useBringVerse({ current: main }, { current: main }, 'jhn', 5, chapter, paging, show),
      { initialProps: { paging: null as boolean | null } },
    );
    expect(show).not.toHaveBeenCalled();
    expect(main.hasAttribute('data-brought-verse')).toBe(false);
    expect(pendingRequest()).toBeDefined();
    rerender({ paging: true });
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][0]).toBe(main.querySelector('[data-verse="25"]'));
    expect(main.getAttribute('data-brought-verse')).toBe('25');
    expect(pendingRequest()).toBeUndefined();
  });
});
