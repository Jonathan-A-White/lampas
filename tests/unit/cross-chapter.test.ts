// Turn pages past a chapter's edge (mw-5r3p30.620): crossChapter opens the chapter after or before one, across books, and sets the page it shows: the first
// when going on, the last (a page past the end) going back. jsdom has no layout, so the page shown is proven by tests/e2e/turn-pages.spec.ts.
import { beforeEach, expect, it } from 'vitest';
import { keptPage, forgetScrolls } from '../../src/nav/scrollMemory';
import { readerOf } from '../../src/nav/route';
import { crossChapter } from '../../src/reader/crossChapter';

beforeEach(() => {
  forgetScrolls();
  window.history.replaceState(null, '', '/#/?b=mrk&c=12');
});

const here = () => {
  const { book, chapter } = readerOf(window.location.hash);
  return `${book}/${chapter}`;
};

it('going on opens the next chapter on its first page, even if it was read to its end before', () => {
  crossChapter('mrk', 12, 1);
  expect(here()).toBe('mrk/13');
  expect(keptPage('mrk/13')).toMatchObject({ page: 0, verse: null });
});

it('going back opens the previous chapter on a page past its end, which shows the last', () => {
  crossChapter('mrk', 12, -1);
  expect(here()).toBe('mrk/11');
  expect(keptPage('mrk/11')?.page).toBeGreaterThan(1000);
});

it('crosses from one book to the next and back', () => {
  crossChapter('jud', 1, 1);
  expect(here()).toBe('rev/1');
  crossChapter('rev', 1, -1);
  expect(here()).toBe('jud/1');
});

it('opens nothing before Matthew 1 or after Revelation 22', () => {
  window.history.replaceState(null, '', '/#/?b=mat&c=1');
  crossChapter('mat', 1, -1);
  expect(here()).toBe('mat/1');
  expect(keptPage('mat/0')).toBeUndefined();
  window.history.replaceState(null, '', '/#/?b=rev&c=22');
  crossChapter('rev', 22, 1);
  expect(here()).toBe('rev/22');
});

it('a second turn before the first has taken effect opens no second step', () => {
  crossChapter('mrk', 12, 1);
  const length = window.history.length;
  crossChapter('mrk', 12, 1);
  expect(window.history.length).toBe(length);
});
