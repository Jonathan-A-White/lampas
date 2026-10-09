import { describe, expect, it } from 'vitest';
import { paradigmHash, paradigmOf, readerHash, readerOf, routeOf } from '../../src/nav/route';

describe('the address', () => {
  it('names the screen', () => {
    expect(routeOf('')).toBe('home');
    expect(routeOf('#/')).toBe('home');
    expect(routeOf('#/?c=8&view=greek&v=28')).toBe('home');
    expect(routeOf('#/words')).toBe('words');
    expect(routeOf('#/test')).toBe('test');
    expect(routeOf('#/drill')).toBe('drill');
    expect(routeOf('#/review')).toBe('review');
    expect(routeOf('#/placement')).toBe('placement');
    expect(routeOf('#/paradigms')).toBe('paradigms');
    expect(routeOf('#/paradigms?t=article&mode=review')).toBe('paradigms');
    expect(routeOf('#/goal')).toBe('goal');
    expect(routeOf('#/studyway')).toBe('studyway');
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

describe('the paradigm address', () => {
  it('names the table and the mode, and leaves out what it does not say clearly', () => {
    expect(paradigmOf('#/paradigms')).toEqual({});
    expect(paradigmOf('#/paradigms?t=eimi&mode=review')).toEqual({ table: 'eimi', mode: 'review' });
    expect(paradigmOf('#/paradigms?t=article&mode=study')).toEqual({ table: 'article', mode: 'study' });
    expect(paradigmOf('#/paradigms?t=nope&mode=cram')).toEqual({});
  });

  it('writes the same address back, in one order', () => {
    expect(paradigmHash({})).toBe('#/paradigms');
    expect(paradigmHash({ table: 'noun-endings' })).toBe('#/paradigms?t=noun-endings');
    expect(paradigmHash({ table: 'article', mode: 'review' })).toBe('#/paradigms?t=article&mode=review');
  });
});
