// useBringLastVerse and useNoteLastVerse (src/reader/lastPlace.ts, mw-fnvjof.17.151): the remembered last verse is brought to the top once the Reader knows its Reading mode. While the
// setting is still being read (paging null) a Turn pages chapter was taken for Scroll and its box scrolled; and a scroll noted a verse as the place in a chapter that pages.
import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { getLastVerse, setLastVerse } from '../../src/data/readerChapter';
import { useBringLastVerse, useNoteLastVerse } from '../../src/reader/lastPlace';

const chapter = { code: 'jhn', chapter: 5 } as unknown as Chapter;

function reader(): HTMLElement {
  const main = document.createElement('main');
  main.innerHTML = '<p data-verse="1">one</p><p data-verse="25">verse</p>';
  return main;
}

describe('the last verse and the Reading mode', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLastVerse('jhn', 5, 25);
  });
  afterEach(() => window.localStorage.clear());

  it('brings the remembered verse only once the Reading mode is known to be Scroll', () => {
    const main = reader();
    const { rerender } = renderHook(
      ({ paging }: { paging: boolean | null }) => useBringLastVerse({ current: main }, { current: main }, 'jhn', 5, chapter, paging, false),
      { initialProps: { paging: null as boolean | null } },
    );
    expect(main.hasAttribute('data-restored-verse')).toBe(false);
    rerender({ paging: true });
    expect(main.hasAttribute('data-restored-verse')).toBe(false);
    rerender({ paging: false });
    expect(main.getAttribute('data-restored-verse')).toBe('25');
  });

  it('notes no verse from a scroll while the Reading mode is unread', () => {
    const main = reader();
    main.scrollTop = 10;
    main.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    main.querySelector<HTMLElement>('[data-verse="25"]')!.getBoundingClientRect = () => ({ top: 5 }) as DOMRect;
    main.querySelector<HTMLElement>('[data-verse="1"]')!.getBoundingClientRect = () => ({ top: -50 }) as DOMRect;
    const { rerender } = renderHook(({ paging }: { paging: boolean | null }) => useNoteLastVerse({ current: main }, 'jhn', 5, paging), { initialProps: { paging: null as boolean | null } });
    setLastVerse('jhn', 5, null);
    fireEvent.scroll(main);
    expect(getLastVerse('jhn', 5)).toBeUndefined();
    rerender({ paging: false });
    fireEvent.scroll(main);
    expect(getLastVerse('jhn', 5)).toBe(25);
  });
});
