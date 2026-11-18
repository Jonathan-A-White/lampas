// useChapterSwipe (src/reader/useChapterSwipe.ts, mw-fnvjof.17.181): the chapter swipe is on only once the Reader knows its Reading mode is Scroll. While the setting is
// still being read (undefined) a Turn pages Reader was taken for Scroll and let a chapter swipe act, over the page swipe.
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { swipeBlocked, useChapterSwipe } from '../../src/reader/useChapterSwipe';

describe('the chapter swipe and the Reading mode', () => {
  it('is blocked while the Reading mode is unread, and in Turn pages, and under a sheet', () => {
    expect(swipeBlocked(false, undefined)).toBe(true);
    expect(swipeBlocked(false, 'pages')).toBe(true);
    expect(swipeBlocked(true, 'scroll')).toBe(true);
    expect(swipeBlocked(false, 'scroll')).toBe(false);
  });

  it('listens for a press only when it is not blocked', () => {
    const box = document.createElement('main');
    const add = vi.spyOn(box, 'addEventListener');
    const mode: { value: 'scroll' | 'pages' | undefined } = { value: undefined };
    const { rerender } = renderHook(() => useChapterSwipe({ current: box }, { current: box }, 'jhn', 5, swipeBlocked(false, mode.value), () => undefined));
    expect(add).not.toHaveBeenCalledWith('pointerdown', expect.anything());
    mode.value = 'pages';
    rerender();
    expect(add).not.toHaveBeenCalledWith('pointerdown', expect.anything());
    mode.value = 'scroll';
    rerender();
    expect(add).toHaveBeenCalledWith('pointerdown', expect.anything());
  });
});
