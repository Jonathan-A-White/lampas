import { describe, expect, it } from 'vitest';
import { readerHash, readerOf, routeOf } from '../../src/nav/route';

describe('the address', () => {
  it('names the screen', () => {
    expect(routeOf('')).toBe('home');
    expect(routeOf('#/')).toBe('home');
    expect(routeOf('#/?c=8&view=greek&v=28')).toBe('home');
    expect(routeOf('#/words')).toBe('words');
    expect(routeOf('#/test')).toBe('test');
    expect(routeOf('#/drill')).toBe('drill');
    expect(routeOf('#/review')).toBe('review');
    expect(routeOf('#/about')).toBe('about');
    expect(routeOf('#/import')).toBe('import');
    expect(routeOf('#/settings')).toBe('settings');
  });

  it('carries the book, chapter, view, weave and verse of the reader', () => {
    expect(readerOf('#/?c=8&view=greek&weave=solid&v=28')).toEqual({ chapter: 8, view: 'greek', weave: 'solid', verse: 28 });
    expect(readerOf('#/?b=1jn&c=1&view=greek&weave=solid&v=3')).toEqual({ book: '1jn', chapter: 1, view: 'greek', weave: 'solid', verse: 3 });
    expect(readerOf('#/?b=xyz&c=1')).toEqual({ chapter: 1 });
    expect(readerOf('#/?b=1jn')).toEqual({ book: '1jn' });
    expect(readerOf('#/')).toEqual({});
    expect(readerOf('#/?view=klingon&v=x&c=-1')).toEqual({});
  });

  it('writes the same address back, in one order, leaving out what is not set', () => {
    expect(readerHash({ chapter: 8, view: 'greek', weave: 'off', verse: 28 })).toBe('#/?c=8&view=greek&weave=off&v=28');
    expect(readerHash({ book: '1jn', chapter: 1, view: 'greek', weave: 'off', verse: 3 })).toBe('#/?b=1jn&c=1&view=greek&weave=off&v=3');
    expect(readerHash({ chapter: 8, view: 'english', weave: 'solid' })).toBe('#/?c=8&view=english&weave=solid');
    expect(readerHash({})).toBe('#/');
  });
});
