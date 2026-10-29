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
const NOT_AW_FAIL = ['TAW-ta', 'It is never "aw" or "ow".', 'The αυ in ταῦτα is said aw.', 'It sounds like "aw" before the t.', 'The aw of saw, then ta.', 'Aw-ta', 'say TAF, not AW'];
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

// mw-5r3p30.740: the fetch must reach Smyrna (Revelation 2:8-11) but may start where he quoted (2:4) or run a little past it; one that misses Smyrna fails.
const REACHES_SMYRNA_FAIL = ['Revelation 2:1-3', 'Revelation 3:1', 'Revelation 3:1-6', 'Revelation 2:4-7', 'Revelation 2:4', 'Revelation 2:12-17', 'John 2:8-11', 'Revelation 12:8-11'];
const REACHES_SMYRNA_PASS = ['Revelation 2:8-11', 'Revelation 2:4-11', 'Revelation 2:8', 'Revelation 2:9-11', 'Revelation 2:4-17', 'Revelation 2:1-11', 'Revelation 2:7-12'];

// mw-5r3p30.858: the request holds Revelation 2:1-3; the answer may name that range any way a reader would, and must name it (not Smyrna's 2:8-11).
const NAMES_HELD_RANGE_PASS = [
  'I hold Revelation 2:1 to 3, which is the letter to Ephesus, so Smyrna\'s letter is outside it.',
  'I hold verses 2:1 to 3 here, so Smyrna (Revelation 2:8-11) is outside them.',
  'I hold verses 1 to 3 of Revelation 2 here, and Smyrna comes in Revelation 2:8-11.',
  'I hold Revelation 2:1-3 only.',
  'I hold Revelation 2:1\u20133 only.',
  'I hold verses 1-3 only.',
  'I hold verses 1 through 3 only.',
  'I hold 2:1 through 3 only.',
  'I only hold the first three verses of the chapter.',
];
const NAMES_HELD_RANGE_FAIL = [
  'Smyrna is Revelation 2:8-11.',
  'I hold verse 1 only, so I am going by memory.',
  'The text stops at verse 1; Smyrna is in verses 8 to 11.',
  'See Revelation 2:11-13.',
  '',
];

describe.each([
  ['verse-outside-the-held-range', 'answer', NAMES_HELD_RANGE_FAIL, NAMES_HELD_RANGE_PASS],
  ['fetch-where-the-talk-heads', 'fetch.0', REACHES_SMYRNA_FAIL, REACHES_SMYRNA_PASS],
  ['sound-it-out-british', 'answer', NOT_AW_FAIL, NOT_AW_PASS],
  ['sound-it-out-tauta', 'answer', NOT_AW_FAIL, NOT_AW_PASS],
  ['sound-it-out-hamartete', 'answer', NOT_HA_FAIL, NOT_HA_PASS],
  ['sound-it-out-related-form', 'answer', [...NOT_HA_FAIL, 'a-MAR-tee-te; the present form is ha-mar-TA-ne-te.'], [...NOT_HA_PASS, 'a-MAR-tee-te; the present form ἁμαρτάνετε is a-mar-TA-ne-te.']],
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
