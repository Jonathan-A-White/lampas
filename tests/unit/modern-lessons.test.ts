// Modern Greek's lesson cards agree with its sound rules (mw-i7xe0n.24): Chi's card said the hard kh comes 'before a, o, ou and a consonant', with no ω,
// while the line a wrong pick shows in Drill it says 'χ before α, ο, ω, ου or a consonant is hard: kh', and ἔχω is one of that rule's own words.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ideaOf } from '../../src/data/grammar/ladder';
import { ideaSound, ideaText } from '../../src/data/grammar/lessons';
import { pronunciationOf, soundRulesOf, tutorGuideOf } from '../../src/speech/pronunciation';
import { BACK as BACK_SHARED, FRONT as FRONT_SHARED } from '../../src/speech/schemes/modernLessons';

const modern = pronunciationOf('modern');
const BACK = 'α, ο, ω, ου or a consonant';

describe("Modern Greek's Chi card", () => {
  it('names α, ο, ω, ου or a consonant before the hard kh, as the rule line a wrong pick shows does', () => {
    const hard = soundRulesOf(modern).find((r) => r.ideaId === 'letter-chi')!.sides.find((s) => s.id === 'hard')!;
    expect(hard.line).toContain(`χ before ${BACK} is hard`);
    expect(hard.words).toContain('ἔχω');
    const card = ideaSound(ideaOf('letter-chi'), modern) ?? '';
    expect(card).toContain(`before ${BACK}`);
    expect(card).not.toMatch(/before a, o, ou/);
  });
});

// mw-i7xe0n.27: the soft side too. Each card names the letters its rule line names, from one shared constant (FRONT, as BACK is), and the tutor guide,
// the grind examples and docs/pronunciation.md name the same lists, with no 'a, o, ou' or 'e and i' left.
const FRONT = 'ε, ι, η, υ, αι, ει or οι';

describe("Modern Greek's soft side", () => {
  it('shares FRONT and BACK from modernLessons with the rule lines', () => {
    expect(FRONT_SHARED).toBe(FRONT);
    expect(BACK_SHARED).toBe(BACK);
  });

  it("names exactly FRONT's letters on the Chi, Gamma and γχ cards", () => {
    for (const id of ['letter-chi', 'letter-gamma', 'pair-gch']) {
      const card = id === 'pair-gch' ? ideaText(ideaOf('consonant-pairs'), modern) : (ideaSound(ideaOf(id), modern) ?? '');
      expect(card, id).toContain(`before ${FRONT}`);
      expect(card, id).not.toMatch(/before e (and|or) i/);
    }
    expect(ideaSound(ideaOf('pair-gch'), modern) ?? '').toContain(`before ${FRONT}`);
  });

  // a table over every letter card and drill rule line: every list a card names after 'before' is one of the lists its rule line names
  for (const rule of soundRulesOf(modern)) {
    const card = `${ideaSound(ideaOf(rule.ideaId), modern) ?? ''} ${ideaText(ideaOf(rule.ideaId), modern)}`;
    const named = [BACK, FRONT].filter((list) => rule.sides.some((side) => side.line.includes(`before ${list}`)));
    if (named.length === 0) continue;
    it(`${rule.ideaId}: every 'before' on the card names the rule line's letters`, () => {
      for (const m of card.matchAll(/before ([^;,.()]*(?:, [^;.()]*?(?: or [^;,.()]*?)?)?)(?= it is|[;.()]|$)/g)) {
        expect(named.some((list) => m[1].startsWith(list)), `${rule.ideaId}: ${m[0]}`).toBe(true);
      }
    });
  }

  it('the tutor guide, the grind examples and the docs name the same lists, with no "a, o, ou" or "e or i" left', () => {
    const guide = tutorGuideOf(modern);
    expect(guide).toContain(`before ${BACK}`);
    expect(guide).toContain(`before ${FRONT}`);
    expect(guide).not.toMatch(/a, o, ou|before e or i/);
    const files = execSync('git ls-files grinds/examples docs/pronunciation.md', { encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.json') || f.endsWith('.md'));
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      expect(text, f).not.toMatch(/a, o, ou/);
      // (docs/pronunciation.md keeps 'before e or i' for the hard g after a nasal, a different rule)
      if (f.endsWith('.json')) expect(text, f).not.toMatch(/before e or i/);
    }
  });
});
