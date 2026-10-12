// The concept question (src/data/grammar/questions.ts buildConcept, mw-86e9r1.3): the idea's own words are blanked from what it asks, so the
// answer is not in the prompt; a reader who has never met the idea cannot read it off.
import { describe, expect, it } from 'vitest';
import { LADDER } from '../../src/data/grammar/ladder';
import { buildConcept, buildIdeaQuestion } from '../../src/data/grammar/questions';
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
