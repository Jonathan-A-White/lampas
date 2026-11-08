// tests/unit/bring-flipped.test.tsx — after a flip of the Septuagint setting the verse carried across is brought to the top of the reading box once the other text is on screen (mw-u2w5klk.293),
// including a Septuagint chapter whose own number is not Lampas's (Greek Psalm 22 opened as Psalm 23), which useBringLastVerse's chapter check does not meet.
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { flipSeptuagint, useBringFlipped } from '../../src/reader/flipSeptuagint';
import { settleAtTop } from '../../src/reader/useBringVerse';
import { stubChapterFetch } from '../support/chapter-fetch';

vi.mock('../../src/reader/useBringVerse', () => ({ settleAtTop: vi.fn(() => () => undefined) }));

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  localStorage.clear();
  stubChapterFetch();
  vi.mocked(settleAtTop).mockClear();
});

const boxWith = (...verses: number[]): HTMLElement => {
  const box = document.createElement('div');
  for (const n of verses) {
    const el = document.createElement('span');
    el.dataset.verse = String(n);
    box.append(el);
  }
  return box;
};
const chapterOf = (file: string): Chapter => JSON.parse(readFileSync(file, 'utf8')) as Chapter;
const hebrew = { code: 'psa', chapter: 23, lang: 'hbo', verses: [] } as unknown as Chapter;

describe('the verse a flip carried across', () => {
  it('is put at the top of the box once the Septuagint is on screen, by the Greek chapter\'s own verse number', async () => {
    const greek = chapterOf('tests/fixtures/data-lxx/psa/22.json');
    const target = greek.verses.find((v) => v.ref && v.ref !== 'none' && v.ref.chapter === 23 && v.ref.verse === 4);
    await flipSeptuagint({ book: 'psa', chapter: 23, shown: hebrew, top: 4 });
    const box = boxWith(1, 2, 3, 4, 5, 6);
    // the Hebrew chapter is still on screen: nothing yet
    const hook = renderHook(({ chapter }) => useBringFlipped({ current: box }, { current: null }, 'psa', chapter), { initialProps: { chapter: hebrew } });
    expect(settleAtTop).not.toHaveBeenCalled();
    // the Greek chapter 22 arrives, opened as Psalm 23
    hook.rerender({ chapter: greek });
    expect(settleAtTop).toHaveBeenCalledTimes(1);
    expect(vi.mocked(settleAtTop).mock.calls[0][2]).toBe(target?.n);
  });

  it('is brought once: a later chapter of the same text asks for nothing', async () => {
    const greek = chapterOf('tests/fixtures/data-lxx/psa/22.json');
    await flipSeptuagint({ book: 'psa', chapter: 23, shown: hebrew, top: 2 });
    const box = boxWith(1, 2, 3);
    const hook = renderHook(({ chapter }) => useBringFlipped({ current: box }, { current: null }, 'psa', chapter), { initialProps: { chapter: greek } });
    expect(settleAtTop).toHaveBeenCalledTimes(1);
    hook.rerender({ chapter: { ...greek } });
    expect(settleAtTop).toHaveBeenCalledTimes(1);
  });

  it('is not asked for at the top of the chapter', async () => {
    await flipSeptuagint({ book: 'psa', chapter: 23, shown: hebrew, top: null });
    renderHook(() => useBringFlipped({ current: boxWith(1, 2, 3) }, { current: null }, 'psa', chapterOf('tests/fixtures/data-lxx/psa/22.json')));
    expect(settleAtTop).not.toHaveBeenCalled();
  });
});
