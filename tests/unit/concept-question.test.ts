// The concept question (src/data/grammar/questions.ts buildConcept, mw-86e9r1.3): the idea's own words are blanked from what it asks, so the
// answer is not in the prompt; a reader who has never met the idea cannot read it off.
import { describe, expect, it } from 'vitest';
import { LADDER } from '../../src/data/grammar/ladder';
import { blankedText, buildConcept, buildIdeaQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';

/** The pronunciation hints an idea's text carries: '(say AIR-ist)' gives '(say AIR-ist)' and 'AIR-ist'. */
const hintsOf = (text: string): string[] => [...text.matchAll(/\(say ([^)]+)\)/gi)].flatMap((m) => [m[0], m[1]]);

describe('the concept question', () => {
  it.each(LADDER.map((i) => [i.id, i] as const))('does not hand over %s in its prompt', (_id, idea) => {
    for (let seed = 1; seed <= 5; seed += 1) {
      const prompt = buildConcept(idea, mulberry32(seed)).prompt.toLowerCase();
      for (const secret of [idea.title, idea.title.replace(/^The /, ''), ...idea.terms, ...hintsOf(idea.text)]) {
        expect(prompt, `"${secret}"`).not.toContain(secret.toLowerCase());
      }
    }
  });

  // mw-86e9r1.25: blanking only the exact title and terms left the texts that name the idea in other words ('the middle and the passive',
  // 'from Hebrew', 'impersonal') giving their answer away: every content word of the title and terms must go, in any wording.
  const PLAIN = new Set(['greek', 'word', 'words', 'form', 'forms', 'letter', 'letters', 'under', 'never', 'change', 'small', 'with', 'from', 'that']);
  const contentWordsOf = (idea: (typeof LADDER)[number]): string[] =>
    [...new Set([idea.title, ...idea.terms].flatMap((t) => t.toLowerCase().match(/\p{L}+/gu) ?? []))].filter((w) => w.length >= 4 && !PLAIN.has(w));

  it.each(LADDER.map((i) => [i.id, i] as const))('blanks every content word of the title and terms in %s', (_id, idea) => {
    const text = blankedText(idea).toLowerCase();
    expect(text, 'a blank').toContain('___');
    for (const word of contentWordsOf(idea)) {
      expect(text, `"${word}"`).not.toContain(word.replace(/e?s$/, ''));
    }
    // a Greek word in the title (the preposition εἰς) goes too, with or without its marks
    const bare = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    for (const word of idea.title.match(/\p{Script=Greek}+/gu) ?? []) expect(bare(text), `"${word}"`).not.toContain(bare(word));
  });

  it('blanks the 11 ideas that named themselves in other words', () => {
    const ids = ['iota-subscript', 'punctuation', 'pronoun-correlative-interrogative', 'voice-middle-or-passive', 'voice-middle-deponent', 'voice-passive-deponent', 'voice-middle-or-passive-deponent', 'voice-impersonal-active', 'mood-participle-imperative', 'aramaic', 'hebrew'];
    for (const id of ids) {
      const idea = LADDER.find((i) => i.id === id)!;
      const text = blankedText(idea);
      expect(text, id).toContain('___');
      for (const word of contentWordsOf(idea)) expect(text.toLowerCase(), `${id}: "${word}"`).not.toContain(word.replace(/e?s$/, ''));
    }
    expect(blankedText(LADDER.find((i) => i.id === 'hebrew')!)).toContain('took straight from ___');
    expect(blankedText(LADDER.find((i) => i.id === 'voice-middle-or-passive')!)).toMatch(/look the same for the ___ and the ___,/);
  });

  // mw-86e9r1.26: 'A verb with no voice' read 'A few ___ forms have ___ at all' once blanked, and its second line still said 'does not name a voice':
  // read aloud, the blank must stand where the name was, alone, and no other word of the name may be left or blanked out of a phrase.
  it('reads A verb with no voice as plain English with the blank where the name was', () => {
    const idea = LADDER.find((i) => i.id === 'voice-none')!;
    for (const text of [blankedText(idea), buildConcept(idea, mulberry32(1)).prompt]) {
      expect(text).toContain('___');
      expect(text.toLowerCase()).not.toContain('voice');
      expect(text).not.toMatch(/___ (?:at all|forms?\b)/);
      expect(text).not.toMatch(/(?:name|a|an|the) ___ for\b/);
      expect(text).toMatch(/have ___[,.:;]/);
    }
  });

  it('shows the blanks and keeps the rest of the idea to read', () => {
    const aorist = LADDER.find((i) => i.id === 'tense-aorist')!;
    const prompt = buildConcept(aorist, mulberry32(1)).prompt;
    expect(prompt).toContain('___');
    expect(prompt).toContain('something happened, as one whole event');
  });

  it('still has the idea among four different titles as the right answer', () => {
    for (const idea of LADDER) {
      const q = buildConcept(idea, mulberry32(3));
      expect(q.kind).toBe('concept');
      expect(q.right).toBe(idea.title);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(idea.title);
    }
  });

  it('is what an idea the passage has no form of is asked, with no leak', () => {
    for (const id of ['mood-optative', 'voice-none', 'poetic', 'tense-aorist']) {
      const idea = LADDER.find((i) => i.id === id)!;
      const q = buildIdeaQuestion(idea, [], mulberry32(7));
      expect(q.kind).toBe('concept');
      expect(q.prompt.toLowerCase()).not.toContain(idea.terms[0].toLowerCase());
    }
  });
});
