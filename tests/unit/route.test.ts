import { describe, expect, it } from 'vitest';
import { libraryHash, libraryOf, paradigmHash, paradigmOf, placementCardHash, placementCardOf, placementOriginOf, readerHash, readerOf, routeOf, variantLessonHash, variantLessonOf, verseListHash, verseListOf } from '../../src/nav/route';

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
    expect(routeOf('#/library')).toBe('library');
    expect(routeOf('#/library?kind=lexicon&book=LLS%3A46.30.18')).toBe('library');
    expect(routeOf('#/conversations')).toBe('conversations');
    expect(routeOf('#/lists')).toBe('lists');
    expect(routeOf('#/lists/7')).toBe('lists');
    expect(routeOf('#/listsx')).toBe('home');
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
    // a word's lemma, and This word (mw-irpgqi.4): own is only said with a lemma, and only when it is on
    expect(paradigmHash({ table: 'contract-verbs', mode: 'learn', word: 'ἀγαπῶ', parse: 'V-PAI-1S', lemma: 'ἀγαπάω' })).toBe(`#/paradigms?t=contract-verbs&mode=learn&w=${encodeURIComponent('ἀγαπῶ')}&p=V-PAI-1S&l=${encodeURIComponent('ἀγαπάω')}`);
    expect(paradigmHash({ table: 'contract-verbs', own: true })).toBe('#/paradigms?t=contract-verbs');
    expect(paradigmOf(paradigmHash({ table: 'contract-verbs', lemma: 'ἀγαπάω', own: true }))).toEqual({ table: 'contract-verbs', lemma: 'ἀγαπάω', own: true });
    expect(paradigmOf(paradigmHash({ table: 'contract-verbs', lemma: 'ἀγαπάω' }))).toEqual({ table: 'contract-verbs', lemma: 'ἀγαπάω' });
    expect(paradigmOf('#/paradigms?l=ἀγαπάω&own=1')).toEqual({});
  });
});

describe('the library import address', () => {
  it('names the parked share a shared CSV is read from, and a bare import names none', () => {
    expect(libraryOf('#/library?import')).toEqual({ import: true });
    expect(libraryOf('#/library?import=1729-abc')).toEqual({ import: true, share: '1729-abc' });
    expect(libraryHash({ import: true })).toBe('#/library?import');
    expect(libraryHash({ import: true, share: '1729-abc' })).toBe('#/library?import=1729-abc');
    expect(libraryOf(libraryHash({ import: true, share: 'a b' }))).toEqual({ import: true, share: 'a b' });
  });
});

describe('the address of one verse list (#/lists/<id>)', () => {
  it('reads the id of a list, and nothing from the lists screen or an address that is no id', () => {
    expect(verseListOf('#/lists/7')).toBe(7);
    expect(verseListOf('#/lists/12?x=1')).toBe(12);
    expect(verseListOf('#/lists')).toBeUndefined();
    expect(verseListOf('#/lists/')).toBeUndefined();
    expect(verseListOf('#/lists/x')).toBeUndefined();
    expect(verseListOf('#/lists/0')).toBeUndefined();
    expect(verseListOf('#/lists/7/8')).toBeUndefined();
    expect(verseListOf('#/library')).toBeUndefined();
  });

  it('writes the address back', () => {
    expect(verseListHash(7)).toBe('#/lists/7');
  });
});

describe('the address of the lessons on variant readings (#/lessons/variants[/<n>])', () => {
  it('is the lessons screen, the list and each page', () => {
    expect(routeOf('#/lessons/variants')).toBe('lessons');
    expect(routeOf('#/lessons/variants/3')).toBe('lessons');
    expect(routeOf('#/lessons')).toBe('home');
    expect(routeOf('#/lessons/variantsx')).toBe('home');
  });

  it('reads the number of a page, and nothing from the list or an address that is no number', () => {
    expect(variantLessonOf('#/lessons/variants/3')).toBe(3);
    expect(variantLessonOf('#/lessons/variants/12?x=1')).toBe(12);
    expect(variantLessonOf('#/lessons/variants')).toBeUndefined();
    expect(variantLessonOf('#/lessons/variants/')).toBeUndefined();
    expect(variantLessonOf('#/lessons/variants/x')).toBeUndefined();
    expect(variantLessonOf('#/lessons/variants/0')).toBeUndefined();
    expect(variantLessonOf('#/lessons/variants/3/4')).toBeUndefined();
    expect(variantLessonOf('#/lists/3')).toBeUndefined();
  });

  it('writes the address back', () => {
    expect(variantLessonHash()).toBe('#/lessons/variants');
    expect(variantLessonHash(3)).toBe('#/lessons/variants/3');
    expect(variantLessonOf(variantLessonHash(5))).toBe(5);
  });
});
