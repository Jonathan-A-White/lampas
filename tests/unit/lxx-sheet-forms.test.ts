// tests/unit/lxx-sheet-forms.test.ts — the Teach sheet's forms and the Idea sheet's example parts show a Septuagint word without Swete's mark (mw-u2w5klk.339, was .316): the Gen 1 fixture's 'γῆν.' is 'γῆν'.
// The Grammar sheet's example row is drawn from the same word through cardForm; the New Testament examples are as before.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { exampleGloss, ideaExamples, passageForms } from '../../src/data/grammar/ideaSheet';
import { LADDER } from '../../src/data/grammar/ladder';
import { cardForm } from '../../src/reader/septuagint';
import { teachForms } from '../../src/data/weave';
import { grammarExamples } from '../../src/data/grammarExamples';

const chapterOf = (path: string): Chapter => JSON.parse(readFileSync(path, 'utf8')) as Chapter;
const genesis = chapterOf('tests/fixtures/data-lxx/gen/1.json');
const john = chapterOf('public/data/1jn/1.json');
const marked = /[.,;:·()[\]]/u;
// Swete's marks at a word's edge; a bracket inside a word (a manuscript gap, τοῖ]ς) is the word's own to cardForm
const edgeMark = /(^|\s)[.,;:·()[\]]|[.,;:·()[\]](\s|$)/u;

describe('the Teach sheet forms of a Septuagint word', () => {
  it('have no mark: γῆν. is γῆν', () => {
    expect(genesis.verses[0].g.some((w) => w.t === 'γῆν.')).toBe(true);
    expect(teachForms(genesis.verses[0], 'γῆ', genesis)).toContain('γῆν');
    expect(teachForms(genesis.verses[0], 'γῆ', genesis).some((f) => marked.test(f))).toBe(false);
  });

  it('are the printed forms of a New Testament verse', () => {
    const verse = john.verses[0];
    expect(teachForms(verse, 'λόγος', john)).toEqual(verse.g.filter((w) => w.l === 'λόγος').map((w) => w.t));
  });
});

describe('the Idea sheet examples of a Septuagint verse', () => {
  const only: Chapter = { ...genesis, verses: genesis.verses.filter((v) => v.n === 1) };

  it('show their parts without the mark: a case idea gives γῆν', () => {
    const found = ideaExamples('case-accusative', [only]);
    const earth = found.find((e) => e.word.l === 'γῆ');
    expect(earth?.word.t).toBe('γῆν.');
    expect(earth && cardForm(earth.chapter, earth.word)).toBe('γῆν');
    for (const e of found) expect(e.parts.map((p) => p.text).join('')).not.toMatch(marked);
    expect(found.length).toBeGreaterThan(0);
  });

  it('show no mark in the parts of a sentence idea, which writes the whole verse', () => {
    const sentence = LADDER.filter((i) => i.tier === 'sentences').map((i) => i.id);
    const shown = sentence.flatMap((id) => ideaExamples(id, [genesis]));
    expect(shown.length).toBeGreaterThan(0);
    for (const e of shown) expect(e.parts.map((p) => p.text).join('')).not.toMatch(edgeMark);
  });

  it('glosses and finds the worked example by the form without the mark', () => {
    expect(passageForms({ chapters: [only], verse: undefined }).has('γῆν')).toBe(true);
    expect([...passageForms({ chapters: [only], verse: undefined })].some((f) => marked.test(f))).toBe(false);
    const idea = LADDER.find((i) => i.id === 'case-accusative');
    const example = ideaExamples('case-accusative', [only]).find((e) => e.word.l === 'γῆ');
    expect(idea && example && exampleGloss(idea, example)).toBeTruthy();
  });
});

describe('the Grammar sheet example of a Septuagint verse', () => {
  it('is drawn as γῆν (the example word is the chapter word, cardForm-ed by the sheet)', () => {
    const found = grammarExamples(genesis, 'accusative').find((e) => e.word.l === 'γῆ');
    expect(found && cardForm(genesis, found.word)).toBe('γῆν');
  });
});

describe('the New Testament examples', () => {
  it('are unchanged: the parts and forms are the printed t', () => {
    const found = ideaExamples('case-genitive', [john]);
    expect(found.map((e) => e.word.t)).toEqual(['ἀρχῆς', 'λόγου', 'ζωῆς']);
    expect(found.map((e) => cardForm(e.chapter, e.word))).toEqual(['ἀρχῆς', 'λόγου', 'ζωῆς']);
    expect(found.map((e) => e.parts.map((p) => p.text).join(''))).toEqual(['ἀρχῆς', 'λόγου', 'ζωῆς']);
    expect(grammarExamples(john, 'genitive').map((e) => cardForm(john, e.word))).toEqual(grammarExamples(john, 'genitive').map((e) => e.word.t));
  });
});
