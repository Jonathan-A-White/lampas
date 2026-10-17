// tests/unit/examples-match-lesson.test.ts — the examples on a card are examples of THAT lesson (mw-5r3p30.234, his words: "make sure in each card
// that the examples do match the lesson"): each one's own parsing (or, for a card about spelling, its spelling) carries the idea, its form is in the
// card's table when the card has one, its gloss is the one sense it has here, and a word the lesson cannot explain is left out.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadChapter, type Chapter } from '../../src/data/chapter';
import { exampleGloss, exampleNote, ideaExamples, isSentenceIdea, isSpellingIdea } from '../../src/data/grammar/ideaSheet';
import { foundationSpans } from '../../src/data/grammar/inference';
import { LADDER, ideaOf, ideasOfWord } from '../../src/data/grammar/ladder';
import { tableHas, teachOf } from '../../src/data/grammar/teach';
import { stubChapterFetch } from '../support/chapter-fetch';

let firstJohn: Chapter;
let john: Chapter;

beforeAll(async () => {
  stubChapterFetch();
  firstJohn = await loadChapter('1jn', 1);
  john = await loadChapter('jhn', 1);
});

describe('every example matches its lesson, over 1 John 1:1 and John 1:1', () => {
  for (const [name, chapter] of [
    ['1 John 1:1', () => firstJohn],
    ['John 1:1', () => john],
  ] as const) {
    it(`${name}: carries the idea, is in the table, and has one sense`, () => {
      const wrong: string[] = [];
      for (const idea of LADDER) {
        const table = teachOf(idea.id).table;
        for (const example of ideaExamples(idea.id, [chapter()], 1)) {
          const form = example.word.t;
          if (isSpellingIdea(idea.id)) {
            if (idea.id !== 'alphabet' && !foundationSpans(form).has(idea.id)) wrong.push(`${idea.id}: ${form} is not spelt with it`);
          } else if (isSentenceIdea(idea.id)) {
            // a use of several words (uses.ts): its example word is one of the words marked in the verse shown
            if (!example.parts.some((part) => part.marked && part.text === form)) wrong.push(`${idea.id}: ${form} is not marked in its verse`);
          } else {
            if (!ideasOfWord(example.word).includes(idea.id)) wrong.push(`${idea.id}: ${form} is not parsed with it`);
            if (table && !tableHas(table, form)) wrong.push(`${idea.id}: ${form} is not in the table`);
          }
          const gloss = exampleGloss(idea, example);
          if (!gloss || gloss.includes('/')) wrong.push(`${idea.id}: ${form} has the gloss “${gloss}”`);
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});

describe('The article on 1 John 1:1', () => {
  it('shows τοῖς, τοῦ and τῆς with their case and number, and not the relative pronoun ὃ', () => {
    const article = ideaOf('article');
    const examples = ideaExamples('article', [firstJohn], 1);
    const forms = examples.map((e) => e.word.t);
    expect(forms).toEqual(expect.arrayContaining(['τοῖς', 'τοῦ', 'τῆς']));
    expect(forms).not.toContain('ὃ');
    expect(forms).not.toContain('Ὃ');
    const note = (form: string): string => exampleNote(article, examples.find((e) => e.word.t === form)!) ?? '';
    expect(note('τοῖς')).toMatch(/dative plural/);
    expect(note('τοῦ')).toMatch(/genitive singular/);
    expect(note('τῆς')).toMatch(/genitive singular/);
    expect(note('τοῖς')).toContain('ὀφθαλμοῖς');
    for (const example of examples) expect(exampleGloss(article, example)).toBe('the');
  });
});

describe('a case card shows only the words it can explain', () => {
  it('the genitive on 1 John 1:1 is its nouns ἀρχῆς, λόγου and ζωῆς, not the pronoun ἡμῶν or the article τοῦ, which come later', () => {
    expect(ideaExamples('case-genitive', [firstJohn], 1).map((e) => e.word.t)).toEqual(['ἀρχῆς', 'λόγου', 'ζωῆς']);
  });

  it("names a word's case and number in the card's own terms, and nothing the card has not taught", () => {
    const genitive = ideaOf('case-genitive');
    const [first] = ideaExamples('case-genitive', [firstJohn], 1);
    expect(exampleNote(genitive, first)).toBe('genitive singular');
  });
});
