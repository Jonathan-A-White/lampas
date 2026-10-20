// A `matches` that bans a sound over a whole answer (mw-5r3p30.671): the example sound-it-out-british failed a right answer because its
// pattern forbade every "aw" in the prose ("fall away"). The smoke's pattern is RE2, which has no lookahead, so each one is an automaton
// written out; this runs the pattern each example really carries (read from its JSON) over answers it must refuse and answers it must pass.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { usesBeyondRe2 } from '../support/grind-examples';

const patternOf = (example: string, field: string): string => {
  const json = JSON.parse(readFileSync(`grinds/examples/bible-talk/${example}.json`, 'utf8')) as { expect: Record<string, { matches?: string }> };
  const pattern = json.expect[field]?.matches;
  if (typeof pattern !== 'string') throw new Error(`${example} has no ${field} pattern`);
  return pattern;
};

// The tutor describes αυ by the app's respelling, never as "aw": the word "aw" on its own, or the respelling TAW-ta.
const NOT_AW_FAIL = ['TAW-ta', 'The αυ in ταῦτα is said aw.', 'It sounds like "aw" before the t.', 'The aw of saw, then ta.', 'Aw-ta', 'say TAF, not AW'];
const NOT_AW_PASS = [
  'ταῦτα sounds like TAF-ta ... before τ is said "af" ... say TAF with force and let ta fall away softly.',
  'Let it fall away.',
  'Draw the TAF out, as you always would.',
  'It is not awkward: TAF-ta, with an awake, clear a.',
  'Away it goes, as in saw or law; say TAF-ta.',
  'Awful at first, but TAF-ta gets easy.',
  '',
];

// ἁμάρτητε: the rough breathing is silent, so the answer never says "ha-" at the start of a word.
const NOT_HA_FAIL = ['Say ha-MAR-tee-te.', 'HA-mar-tee-te', 'It starts "ha-" like Erasmian.', 'First syllable: Ha-'];
const NOT_HA_PASS = [
  'a-MAR-tee-te, with the stress on MAR.',
  'The θ is th as in thin, as in tha-na-tos.',
  'THA-na-tos is a different word.',
  'Say shah and then a-MAR-tee-te.',
  'A silent breathing: a-MAR-tee-te, ha is not said.',
  '',
];

describe.each([
  ['sound-it-out-british', 'answer', NOT_AW_FAIL, NOT_AW_PASS],
  ['sound-it-out-tauta', 'answer', NOT_AW_FAIL, NOT_AW_PASS],
  ['sound-it-out-hamartete', 'answer', NOT_HA_FAIL, NOT_HA_PASS],
])('the answer pattern of %s (%s)', (example, field, shouldFail, shouldPass) => {
  const pattern = patternOf(example, field);
  const re = new RegExp(pattern);

  it('is one the mill can read', () => {
    expect(usesBeyondRe2(pattern)).toBe(false);
  });
  it.each(shouldFail)('refuses %j', (answer) => {
    expect(re.test(answer)).toBe(false);
  });
  it.each(shouldPass)('passes %j', (answer) => {
    expect(re.test(answer)).toBe(true);
  });
});
