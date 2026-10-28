// The small parts of the tutor's knowledge of his Hebrew (mw-gdcyf98.22): the screen fact that names the language, the face a rusty item is drawn in, the ask's answer that may list a
// Hebrew word, and the table of what each grind is told of his Hebrew progress. The summary itself is tests/unit/learner-summary-hebrew.test.ts.
import { describe, expect, it } from 'vitest';
import { rustyFace } from '../../src/script/rustyFace';
import { isVerseAnswer } from '../../src/services/tutor';
import { languageFact } from '../../src/tutor/screen';
import { GRINDS, PROGRESS, TUTOR_KNOWS } from '../../src/tutor/knows';

describe('the fact that names the language of a screen', () => {
  it('says Hebrew on a Hebrew screen, always', () => {
    expect(languageFact('hbo', false)).toEqual([{ label: 'Language', value: 'Hebrew' }]);
    expect(languageFact('hbo', true)).toEqual([{ label: 'Language', value: 'Hebrew' }]);
  });

  it('says Greek on a Greek screen only once Hebrew is chosen too', () => {
    expect(languageFact('grc', true)).toEqual([{ label: 'Language', value: 'Greek' }]);
    expect(languageFact('grc', false)).toEqual([]);
  });

  it('says nothing at English only or before the languages are read', () => {
    expect(languageFact(null, false)).toEqual([]);
    expect(languageFact(undefined, true)).toEqual([]);
  });
});

describe('how a rusty item is drawn', () => {
  it('draws a Greek word in the Greek face and a Hebrew word right to left in the Hebrew one', () => {
    expect(rustyFace({ kind: 'word', id: 'λόγος' })).toMatchObject({ lang: 'el', 'data-lang': 'grc' });
    expect(rustyFace({ kind: 'word', id: 'λόγος' }).className).toContain('font-greek');
    expect(rustyFace({ kind: 'word', id: 'אֶרֶץ' })).toMatchObject({ lang: 'he', 'data-lang': 'hbo', dir: 'rtl' });
    expect(rustyFace({ kind: 'word', id: 'אֶרֶץ' }).className).toContain('script-he');
  });

  it('draws an idea, of either ladder, in the plain face', () => {
    expect(rustyFace({ kind: 'idea', id: 'case-genitive' })).toEqual({});
    expect(rustyFace({ kind: 'idea', id: 'he-article' })).toEqual({});
  });
});

describe("the verse-ask answer's words", () => {
  const word = { greek: 'בָּרָא', lemma: 'בָּרָא', note: 'verb' };
  const answer = (w: object) => ({ answer: 'It is a verb.', question: 'What is it?', words: [w] });

  it('may carry language he, or grc, and need not carry one', () => {
    expect(isVerseAnswer(answer(word))).toBe(true);
    expect(isVerseAnswer(answer({ ...word, language: 'he' }))).toBe(true);
    expect(isVerseAnswer(answer({ ...word, language: 'grc' }))).toBe(true);
  });

  it('refuses any other language, and any other key', () => {
    expect(isVerseAnswer(answer({ ...word, language: 'el' }))).toBe(false);
    expect(isVerseAnswer(answer({ ...word, extra: 1 }))).toBe(false);
  });
});

describe('what each grind is told of his Hebrew progress', () => {
  const HEBREW_PARTS = ['hebrewWords', 'hebrewLadder', 'hebrewReading', 'hebrewRust'];

  it.each(HEBREW_PARTS)('%s is a part of his progress, and every grind that is sent `learner` is sent it there', (part) => {
    expect(Object.keys(PROGRESS)).toContain(part);
    for (const kind of GRINDS) expect(TUTOR_KNOWS[kind].progress[part], `${kind} ${part}`).toBe('learner');
  });
});
