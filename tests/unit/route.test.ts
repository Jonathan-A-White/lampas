import { describe, expect, it } from 'vitest';
import { readerHash, readerOf, routeOf } from '../../src/nav/route';

describe('the address', () => {
  it('names the screen', () => {
    expect(routeOf('')).toBe('home');
    expect(routeOf('#/')).toBe('home');
    expect(routeOf('#/?c=8&view=greek&v=28')).toBe('home');
    expect(routeOf('#/words')).toBe('words');
    expect(routeOf('#/test')).toBe('test');
    expect(routeOf('#/about')).toBe('about');
    expect(routeOf('#/import')).toBe('import');
  });

  it('carries the chapter, view, weave and verse of the reader', () => {
    expect(readerOf('#/?c=8&view=greek&weave=solid&v=28')).toEqual({ chapter: 8, view: 'greek', weave: 'solid', verse: 28 });
    expect(readerOf('#/')).toEqual({});
    expect(readerOf('#/?view=klingon&v=x&c=-1')).toEqual({});
  });

  it('writes the same address back, in one order, leaving out what is not set', () => {
    expect(readerHash({ chapter: 8, view: 'greek', weave: 'off', verse: 28 })).toBe('#/?c=8&view=greek&weave=off&v=28');
    expect(readerHash({ chapter: 8, view: 'english', weave: 'solid' })).toBe('#/?c=8&view=english&weave=solid');
    expect(readerHash({})).toBe('#/');
  });
});
