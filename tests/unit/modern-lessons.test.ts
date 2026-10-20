// Modern Greek's lesson cards agree with its sound rules (mw-i7xe0n.24): Chi's card said the hard kh comes 'before a, o, ou and a consonant', with no ω,
// while the line a wrong pick shows in Drill it says 'χ before α, ο, ω, ου or a consonant is hard: kh', and ἔχω is one of that rule's own words.
import { describe, expect, it } from 'vitest';
import { ideaOf } from '../../src/data/grammar/ladder';
import { ideaSound } from '../../src/data/grammar/lessons';
import { pronunciationOf, soundRulesOf } from '../../src/speech/pronunciation';

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
