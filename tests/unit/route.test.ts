import { describe, expect, it } from 'vitest';
import { paradigmHash, paradigmOf, placementCardHash, placementCardOf, placementOriginOf, readerHash, readerOf, routeOf } from '../../src/nav/route';

describe('the address', () => {
  it('says where the placement was started from', () => {
    expect(placementOriginOf('#/placement?from=goal')).toBe('goal');
    expect(placementOriginOf('#/placement')).toBe('settings');
    expect(placementOriginOf('#/placement?from=else')).toBe('settings');
    expect(routeOf('#/placement?from=goal')).toBe('placement');
  });

  it('names the end card the placement reached, keeping where it was started from', () => {
    expect(placementCardOf('#/placement?from=goal')).toBeNull();
    expect(placementCardOf('#/placement')).toBeNull();
    expect(placementCardHash('goal', 'k3x9')).toBe('#/placement?from=goal&card=k3x9');
    expect(placementCardHash('settings', 'k3x9')).toBe('#/placement?card=k3x9');
    expect(placementCardOf(placementCardHash('goal', 'k3x9'))).toBe('k3x9');
    expect(placementOriginOf(placementCardHash('goal', 'k3x9'))).toBe('goal');
    expect(routeOf(placementCardHash('settings', 'k3x9'))).toBe('placement');
  });

  it('names the screen', () => {
    expect(routeOf('')).toBe('home');
    expect(routeOf('#/')).toBe('home');
    expect(routeOf('#/?c=8&view=greek&v=28')).toBe('home');
    expect(routeOf('#/words')).toBe('words');
    expect(routeOf('#/test')).toBe('test');
    expect(routeOf('#/drill')).toBe('drill');
    expect(routeOf('#/review')).toBe('review');
    expect(routeOf('#/today')).toBe('today');
    expect(routeOf('#/placement')).toBe('placement');
    expect(routeOf('#/paradigms')).toBe('paradigms');
    expect(routeOf('#/paradigms?t=article&mode=review')).toBe('paradigms');
    expect(routeOf('#/goal')).toBe('goal');
    expect(routeOf('#/path')).toBe('path');
    expect(routeOf('#/studyway')).toBe('studyway');
    expect(routeOf('#/aboutyou')).toBe('aboutyou');
    expect(routeOf('#/memory')).toBe('memory');
    expect(routeOf('#/requests')).toBe('requests');
    expect(routeOf('#/askmore')).toBe('askmore');
    expect(routeOf('#/conversations')).toBe('conversations');
    expect(routeOf('#/about')).toBe('about');
    expect(routeOf('#/preface')).toBe('preface');
    expect(routeOf('#/preface/robinson')).toBe('essay');
    expect(routeOf('#/import')).toBe('import');
    expect(routeOf('#/settings')).toBe('settings');
    expect(routeOf('#/share?s=1-abc')).toBe('share');
    expect(routeOf('#/share?talk=rom.8.28')).toBe('share');
    expect(routeOf('#/unlock')).toBe('unlock');
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
    expect(paradigmOf('#/paradigms?t=eimi&mode=learn')).toEqual({ table: 'eimi', mode: 'learn' });
    expect(paradigmOf('#/paradigms?t=article&mode=drill')).toEqual({ table: 'article', mode: 'drill' });
    expect(paradigmOf('#/paradigms?t=nope&mode=cram')).toEqual({});
    expect(paradigmOf('#/paradigms?t=article&mode=cram')).toEqual({ table: 'article' });
  });

  // mw-irpgqi.2: the modes were Study (cells hidden) and Review (every form shown); an address kept or linked before still opens the same view
  it('reads the old mode names: study is Drill, review is Learn', () => {
    expect(paradigmOf('#/paradigms?t=eimi&mode=review')).toEqual({ table: 'eimi', mode: 'learn' });
    expect(paradigmOf('#/paradigms?t=article&mode=study')).toEqual({ table: 'article', mode: 'drill' });
  });

  it('writes the same address back, in one order', () => {
    expect(paradigmHash({})).toBe('#/paradigms');
    expect(paradigmHash({ table: 'noun-endings' })).toBe('#/paradigms?t=noun-endings');
    expect(paradigmHash({ table: 'article', mode: 'learn' })).toBe('#/paradigms?t=article&mode=learn');
    expect(paradigmHash({ table: 'article', mode: 'drill' })).toBe('#/paradigms?t=article&mode=drill');
  });
});
