// mw-5r3p30.722: a smoke run of bible-talk/greek-dial-offer-at-zero (asked what the Greek word for 'love' means, the dial at 0) answered in
// English with `words: []`, 1 run in 3: the dial-0 paragraph said `words` stays empty and nothing said that "the Greek word for X" is a Greek word he
// asked about, so the model took it as an English-word question. A Greek word asked about by meaning carries its `words` entry at any dial.
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';

describe('the bible-talk instructions for a Greek word asked about at the dial 0 or 1', () => {
  const instructions = instructionsOf('bible-talk');
  const from = instructions.indexOf('## Offering the Greek\n');
  const to = instructions.indexOf('\n## ', from + 1);
  const section = instructions.slice(from, to < 0 ? undefined : to).replace(/\s+/g, ' ');

  it('count "the Greek word for X" as asking about a Greek word', () => {
    expect(section).toMatch(/"what does the Greek word for 'love' mean\?"[^.]*is asking about a Greek word/);
  });

  it('put that word in `words`, with its lemma, though the dial is low', () => {
    expect(section).toMatch(/put the word in `words` \(its `greek`, `lemma` and `note`\)[^.]*whatever the dial/);
  });
});
