// mw-5r3p30.741: the smoke found bible-talk/greek-offer-word-meaning ("What does 'love' really mean in this verse?" at Curious) filling
// `words` with ἀγαπῶσιν now and then (mail mw-tzb1qf, mw-sq00k6, mw-xqcbuz) where the example wants none. The answer carries a `word` offer, and
// the rule that its `lemma` is no `words` entry was a parenthesis at the end of one long sentence about English words, a line below the rule that
// "the Greek word for 'love'" does go in `words`. `words` is said to be empty for this question where the model fills `words`
// (the contract's `words` paragraph), in the offering rule itself, and in the schema's own `words` description.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const text = instructionsOf('bible-talk');
const flat = (s: string): string => s.replace(/\s+/g, ' ');
const offering = flat(text.slice(text.indexOf('## Offering the Greek\n'), text.indexOf('\n## ', text.indexOf('## Offering the Greek\n') + 1)));
const contract = flat(text.slice(text.indexOf('## The contract\n'), text.indexOf('\n## ', text.indexOf('## The contract\n') + 1)));
const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as { properties: { words: { description: string } } };

describe('`words` for a question about an English word, whatever the Greek offer', () => {
  it('the offering rule says `words` stays empty even when the answer carries a `word` offer', () => {
    expect(offering).toMatch(/an English word he names[^.]*no `words`, even when the answer carries a `word` offer/i);
    expect(offering).toMatch(/offer's `lemma` is not a `words` entry/);
  });

  it('the contract, where `words` is defined, says the same', () => {
    const at = contract.indexOf('`words` lists only');
    expect(at).toBeGreaterThan(-1);
    const paragraph = contract.slice(at);
    expect(paragraph).toMatch(/nor the `lemma` of a `greek_offer`/);
    expect(paragraph).toMatch(/English word he names[^.]*`words` is `\[\]`/);
  });

  it('the answer schema\'s `words` says the same', () => {
    const d = schema.properties.words.description;
    expect(d).toMatch(/never the `lemma` of a `greek_offer`/);
    expect(d).toMatch(/names only an English word/);
  });
});

// mw-5r3p30.750: the smoke after batch 193 found greek-offer-example-words-only ("What does love really mean in Romans 8:28?" at Curious) giving a `words` entry for
// ἀγαπάω once in three. The English-word rule stood after the Greek-word rule that puts a word in `words` whatever the dial, and the model sometimes followed the
// first; the English-word case now comes first and names the test that tells the two apart.
describe('the English-word case comes before the Greek-word case in "Offering the Greek" (mw-5r3p30.750)', () => {
  it('says the English word first, with the test, and the Greek word after', () => {
    const english = offering.indexOf('An English word he names');
    const greekWord = offering.indexOf('"what does the Greek word for');
    expect(english).toBeGreaterThan(-1);
    expect(greekWord).toBeGreaterThan(english);
    expect(offering.slice(english, greekWord)).toMatch(/the test: did he write Greek letters or say "Greek"\? No:/);
  });

  it('puts a `words` entry for the word behind an English word nowhere', () => {
    expect(offering.match(/whatever the dial/g)).toHaveLength(1);
    expect(offering.slice(offering.indexOf('"what does the Greek word for'))).toMatch(/what does the Greek word for 'love' mean\?"[^.]*is asking about a Greek word/);
  });
});
