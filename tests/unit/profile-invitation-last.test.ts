// mw-5r3p30.687: a smoke run of the retired verse-ask grind's profile-slow-hands-on (a slow learner who learns by hearing and doing) ended on an explanation with no
// invitation to say or try (1 run in 97). The profile cues sat mid-paragraph and nothing said WHERE the invitation goes, so on a long answer it was dropped.
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

describe.each(['bible-talk'] as const)('the %s instructions for a hearing or doing learner', (kind) => {
  const instructions = instructionsOf(kind);
  const from = instructions.indexOf('## Meeting him where he is\n');
  const to = instructions.indexOf('\n## ', from + 1);
  const section = instructions.slice(from, to < 0 ? undefined : to).replace(/\s+/g, ' ');

  it('put the invitation in the LAST sentence of the answer, after any explanation', () => {
    expect(section).toMatch(/`hearing` or `doing`[^.]*the LAST sentence of the answer is the invitation/);
    expect(section).toMatch(/to say the word aloud, or something to try or find, after any explanation/);
  });
});
