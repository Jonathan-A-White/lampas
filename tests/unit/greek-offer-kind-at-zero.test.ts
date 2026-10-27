// mw-5r3p30.814: a smoke run of bible-talk/greek-dial-offer-at-zero answered with greek_offer.kind "view" and no lemma, 1 run in 3. List line 6
// (Just English) said "make the one offer" and not which kind, so the model took the nearest example of a button that raises the dial (the
// welcome's "view"). A word he asked about is offered as `word`, with its lemma, at every dial.
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';

describe('the bible-talk instructions for the offer at Just English when he asks about a Greek word', () => {
  const instructions = instructionsOf('bible-talk');
  const from = instructions.indexOf('## Offering the Greek\n');
  const to = instructions.indexOf('\n## ', from + 1);
  const section = instructions.slice(from, to < 0 ? undefined : to).replace(/\s+/g, ' ');
  const line6 = section.slice(section.indexOf('6. Step 0'), section.indexOf('7. Steps 1 to 4'));

  it('has the step 0 line', () => {
    expect(line6).toContain('Step 0 (Just English)');
  });

  it('makes that offer `kind` `word` with the lemma of the word he asked about, never `view`', () => {
    expect(line6).toMatch(/`kind` `word`[^.]*`lemma`/);
    expect(line6).toMatch(/never `view`/);
  });
});
