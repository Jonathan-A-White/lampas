// The prepositions one by one and the compound verbs (mw-86e9r1.5): an idea for each of twelve common prepositions with its meaning per case and a
// real New Testament phrase in that case, a question per case, and one idea for the verbs a preposition is joined to.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BookIndex, Chapter } from '../../src/data/chapter';
import { bookOf } from '../../src/data/books';
import { LADDER, ideaOf, ideasBelow } from '../../src/data/grammar/ladder';
import { passageNeeds } from '../../src/data/grammar/needs';
import { COMPOUND_VERBS, PREPOSITIONS, examplesOf, type PrepCase } from '../../src/data/grammar/prepositions';
import { buildIdeaQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';

const nfc = (s: string): string => s.normalize('NFC');
const CASE_LETTER: Record<PrepCase, string> = { genitive: 'G', dative: 'D', accusative: 'A' };
const CASE_IDEA: Record<PrepCase, string> = { genitive: 'case-genitive', dative: 'case-dative', accusative: 'case-accusative' };
const chapterOf = (ref: { book: string; chapter: number }): Chapter => JSON.parse(readFileSync(`public/data/${ref.book}/${ref.chapter}.json`, 'utf8')) as Chapter;
const rom8 = chapterOf({ book: 'rom', chapter: 8 });
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
const fromDisk = async (book: string, n: number): Promise<Chapter> => chapterOf({ book, chapter: n });

/** The words of a verse, with the case letter their RP code gives (N-GSM, T-DSN, A-APM, P-GSM), if it names one. */
const verseWords = (ref: { book: string; chapter: number; verse: number }) => {
  const verse = chapterOf(ref).verses.find((v) => v.n === ref.verse);
  if (!verse) throw new Error(`No verse ${ref.book} ${ref.chapter}:${ref.verse}`);
  return verse.g.map((w) => ({ text: nfc(w.t), lemma: nfc(w.l), code: w.p, case: /^[A-Z]+-([NGDAV])[SP]/.exec(w.p)?.[1] }));
};

/** Where a phrase stands in its verse: the words from the first one that begins it. */
const findPhrase = (phrase: string, ref: { book: string; chapter: number; verse: number }) => {
  const words = verseWords(ref);
  const parts = nfc(phrase).split(' ');
  const at = words.findIndex((_, i) => parts.every((p, k) => words[i + k]?.text === p));
  return at < 0 ? undefined : words.slice(at, at + parts.length);
};

describe('the twelve prepositions', () => {
  it('are διά κατά μετά περί ὑπό ἐπί παρά πρός εἰς ἐν ἐκ ἀπό, each an idea of the prepositions tier', () => {
    expect(PREPOSITIONS.map((p) => p.greek).sort()).toEqual(['διά', 'κατά', 'μετά', 'περί', 'ὑπό', 'ἐπί', 'παρά', 'πρός', 'εἰς', 'ἐν', 'ἐκ', 'ἀπό'].map(nfc).sort());
    for (const p of PREPOSITIONS) {
      const idea = ideaOf(`preposition-${p.key}`);
      expect(idea.tier, idea.id).toBe('prepositions');
      expect(idea.title).toContain(p.greek);
    }
  });

  it('each need the preposition idea and the cases it uses, and come after them', () => {
    const general = ideaOf('preposition');
    for (const p of PREPOSITIONS) {
      const idea = ideaOf(`preposition-${p.key}`);
      expect(idea.needs, idea.id).toContain('preposition');
      for (const use of p.uses) expect(idea.needs, `${idea.id} ${use.case}`).toContain(CASE_IDEA[use.case]);
      expect(idea.rung).toBeGreaterThan(general.rung);
    }
  });

  it('give each lesson its meaning per case and the real phrase, in under 80 words', () => {
    for (const p of PREPOSITIONS) {
      const idea = ideaOf(`preposition-${p.key}`);
      expect(idea.text.trim().split(/\s+/).length, idea.id).toBeLessThan(80);
      for (const use of p.uses) {
        expect(idea.text, `${idea.id} ${use.case}`).toContain(use.case);
        expect(idea.text, `${idea.id} ${use.meaning}`).toContain(use.meaning);
        expect(idea.text, `${idea.id} ${use.phrase}`).toContain(use.phrase);
      }
    }
  });

  it('use no meaning twice, so a meaning names one preposition and case', () => {
    const meanings = PREPOSITIONS.flatMap((p) => p.uses.map((u) => u.meaning));
    expect(new Set(meanings).size).toBe(meanings.length);
  });

  it('have an example for every case, and the case of its noun is the case the lesson gives it', () => {
    for (const p of PREPOSITIONS) {
      expect(new Set(p.uses.map((u) => u.case)).size, p.key).toBe(p.uses.length);
      for (const use of p.uses) {
        for (const example of examplesOf(use)) {
          const label = `${p.greek} ${use.case}: ${example.phrase} (${example.ref.book} ${example.ref.chapter}:${example.ref.verse})`;
          const found = findPhrase(example.phrase, example.ref);
          expect(found, `${label} is in its verse`).toBeDefined();
          const [first, ...object] = found!;
          expect(first.lemma, label).toBe(nfc(p.greek));
          expect(first.code, label).toBe('PREP');
          expect(object.length, label).toBeGreaterThan(0);
          for (const w of object) expect(w.case, `${label}: ${w.text} ${w.code}`).toBe(CASE_LETTER[use.case]);
        }
      }
    }
  });

  it('give every case at least two different checked phrases, so the case is read and the phrase is not learned (mw-86e9r1.39)', () => {
    for (const p of PREPOSITIONS) {
      for (const use of p.uses) {
        const examples = examplesOf(use);
        expect(examples.length, `${p.greek} ${use.case}`).toBeGreaterThanOrEqual(2);
        expect(new Set(examples.map((e) => e.phrase)).size, `${p.greek} ${use.case} phrases`).toBe(examples.length);
        expect(examples[0].phrase, `${p.greek} ${use.case}: the lesson shows the first`).toBe(use.phrase);
      }
    }
  });

  it('are asked from the case of a real phrase: the meaning that goes with that case is right, four different choices', () => {
    for (const p of PREPOSITIONS) {
      const idea = ideaOf(`preposition-${p.key}`);
      const asked = new Set<string>();
      const phrases = new Set<string>();
      for (let seed = 1; seed <= 80; seed += 1) {
        const q = buildIdeaQuestion(idea, [rom8], mulberry32(seed));
        expect(q.ideaId).toBe(idea.id);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.prompt).toContain(p.greek);
        const use = p.uses.find((u) => examplesOf(u).some((e) => e.phrase === q.form));
        expect(use, `${idea.id}: ${q.form}`).toBeDefined();
        const example = examplesOf(use!).find((e) => e.phrase === q.form)!;
        expect(q.right).toBe(use!.meaning);
        expect(q.options.filter((o) => o === q.right)).toHaveLength(1);
        expect(q.ref).toBe(`${bookOf(example.ref.book)!.name} ${example.ref.chapter}:${example.ref.verse}`);
        expect(q.say).toBe(example.phrase);
        asked.add(use!.case);
        phrases.add(example.phrase);
      }
      expect([...asked].sort(), `${idea.id} asks every case`).toEqual(p.uses.map((u) => u.case).sort());
      // each case is asked in more than one phrase, so the same case does not always come as the same words
      for (const use of p.uses) {
        expect(examplesOf(use).filter((e) => phrases.has(e.phrase)).length, `${idea.id} ${use.case} is asked with several phrases`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('offer the other case’s meaning beside the right one, so a question is missed by reading the wrong case', () => {
    const dia = PREPOSITIONS.find((p) => p.key === 'dia')!;
    for (let seed = 1; seed <= 30; seed += 1) {
      const q = buildIdeaQuestion(ideaOf('preposition-dia'), [rom8], mulberry32(seed));
      for (const use of dia.uses) expect(q.options, use.meaning).toContain(use.meaning);
    }
  });
});

describe('the Compound verbs idea', () => {
  const idea = LADDER.find((i) => i.id === 'compound-verbs');

  it('is on the ladder among the verbs, resting on the prepositions it uses and the verb', () => {
    expect(idea).toBeDefined();
    expect(idea!.title).toBe('Compound verbs');
    expect(idea!.tier).toBe('verbs');
    expect(idea!.needs).toContain('preposition');
    expect(idea!.needs).toContain('verb');
    const below = ideasBelow('compound-verbs').map((i) => i.id);
    for (const p of PREPOSITIONS) expect(below).toContain(`preposition-${p.key}`);
    for (const need of idea!.needs) expect(ideaOf(need).rung).toBeLessThan(idea!.rung);
    expect(idea!.text.trim().split(/\s+/).length).toBeLessThan(80);
  });

  it('names a real verb in each example: the form is in its verse, with the lemma the lesson gives', () => {
    expect(COMPOUND_VERBS.length).toBeGreaterThanOrEqual(10);
    for (const c of COMPOUND_VERBS) {
      const label = `${c.lemma} ${c.form}`;
      const word = verseWords(c.ref).find((w) => w.text === nfc(c.form));
      expect(word, `${label} is in ${c.ref.book} ${c.ref.chapter}:${c.ref.verse}`).toBeDefined();
      expect(word!.lemma, label).toBe(nfc(c.lemma));
      expect(word!.code.startsWith('V-'), label).toBe(true);
      expect(nfc(c.lemma).normalize('NFD').replace(/\p{M}/gu, ''), label).toContain(nfc(c.stem).normalize('NFD').replace(/\p{M}/gu, '').slice(0, 3));
    }
  });

  it('uses each meaning once, and the idea’s text gives a few of the verbs', () => {
    const meanings = COMPOUND_VERBS.map((c) => c.meaning);
    expect(new Set(meanings).size).toBe(meanings.length);
    expect(idea!.text).toContain('ἐκβάλλω');
  });

  it('is asked as the meaning of a compound verb made of a preposition and a verb: four different choices, one right', () => {
    const rights = new Set<string>();
    for (let seed = 1; seed <= 80; seed += 1) {
      const q = buildIdeaQuestion(idea!, [rom8], mulberry32(seed));
      expect(q.ideaId).toBe('compound-verbs');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      const verb = COMPOUND_VERBS.find((c) => c.lemma === q.form);
      expect(verb, String(q.form)).toBeDefined();
      expect(q.right).toBe(verb!.meaning);
      expect(q.prompt).toContain(verb!.prefix);
      expect(q.prompt).toContain(verb!.stem);
      rights.add(q.right);
    }
    expect(rights.size).toBeGreaterThan(5);
  });
});

describe('a passage needs the prepositions it uses', () => {
  it('lists the idea of ἀπό and of περί for 1 John 1:1, easy first, and no other preposition', async () => {
    const needs = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, fromDisk, index);
    const ids = needs.ideas.map((i) => i.id);
    expect(ids).toContain('preposition');
    expect(ids).toContain('preposition-apo');
    expect(ids).toContain('preposition-peri');
    expect(ids.filter((id) => id.startsWith('preposition-')).sort()).toEqual(['preposition-apo', 'preposition-peri']);
    expect(needs.ideas.find((i) => i.id === 'preposition-apo')?.example.ref).toBe('1jn.1.1');
  });
});
